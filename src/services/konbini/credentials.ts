import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const keyCookie = "storyroom-key-session";
export const keyLifetimeSeconds = 24 * 60 * 60;
const context = new AsyncLocalStorage<{ key?: string; scope: string }>();
type KeySession = { key: string; scope: string; expires: number };

export class KeyConfigurationError extends Error {
  constructor() { super("Set API_KEY_COOKIE_SECRET to a 64-character hexadecimal secret in the server environment, then redeploy."); }
}
function encryptionKey(): Buffer {
  const secret = process.env.API_KEY_COOKIE_SECRET;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) throw new KeyConfigurationError();
  return Buffer.from(secret, "hex");
}
export function credentialScope() { return context.getStore()?.scope ?? "server"; }
export function providerKey() { return context.getStore()?.key ?? (credentialScope() === "server" ? process.env.KONBINI_API_KEY?.trim() : undefined); }

export function saveKey(key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(keyCookie + ":v1"));
  const session: KeySession = { key, scope: randomUUID(), expires: Date.now() + keyLifetimeSeconds * 1000 };
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
}

function readKey(value?: string): KeySession | undefined {
  if (!value || value.length > 3900) return;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || parts.slice(1).some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return;
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    if (iv.length !== 12 || tag.length !== 16) return;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAAD(Buffer.from(keyCookie + ":v1"));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(parts[2], "base64url")), decipher.final()]);
    const session: unknown = JSON.parse(plaintext.toString("utf8"));
    if (!session || typeof session !== "object") return;
    const { key, scope, expires } = session as Record<string, unknown>;
    if (typeof key !== "string" || !key || key.length > 2048 || /\s/.test(key) || typeof scope !== "string" || !/^[a-f0-9-]{36}$/.test(scope) || typeof expires !== "number" || !Number.isFinite(expires) || expires <= Date.now()) return;
    return { key, scope, expires };
  } catch { return; } // Invalid, expired, or encrypted with a rotated secret.
}
export function hasKey(value?: string) { return Boolean(readKey(value)); }
export function withCredentials<T extends Request>(handler: (request: T) => Promise<Response>) {
  return async (request: T) => {
    const value = (await cookies()).get(keyCookie)?.value;
    const session = readKey(value);
    // Never charge the server key when a personal cookie is present but invalid.
    return context.run({ scope: session?.scope ?? (value ? "invalid-session" : "server"), key: session?.key }, () => handler(request));
  };
}
