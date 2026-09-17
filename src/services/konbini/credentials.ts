import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const keyCookie = "storyroom-key-session";
const shared = globalThis as typeof globalThis & { storyroomKeys?: Map<string, { key: string; expires: number }> };
const sessions = shared.storyroomKeys ??= new Map();
const context = new AsyncLocalStorage<{ key?: string; scope: string }>();
export function credentialScope() { return context.getStore()?.scope ?? "server"; }
export function providerKey() { return context.getStore()?.key ?? (credentialScope() === "server" ? process.env.KONBINI_API_KEY?.trim() : undefined); }
export function saveKey(key: string, previous?: string) {
  if (previous) sessions.delete(previous);
  for (const [id, value] of sessions) if (value.expires <= Date.now()) sessions.delete(id);
  if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value!);
  const id = randomUUID(); sessions.set(id, { key, expires: Date.now() + 24 * 60 * 60_000 }); return id;
}
export function removeKey(id?: string) { if (id) sessions.delete(id); }
export function hasKey(id?: string) { return Boolean(id && sessions.get(id) && sessions.get(id)!.expires > Date.now()); }
export function withCredentials<T extends Request>(handler: (request: T) => Promise<Response>) {
  return async (request: T) => {
    const id = (await cookies()).get(keyCookie)?.value;
    const entry = id && hasKey(id) ? sessions.get(id) : undefined;
    // An expired personal session must never silently charge the server key.
    return context.run({ scope: id ?? "server", key: entry?.key }, () => handler(request));
  };
}
