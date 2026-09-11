import "server-only";
import { object } from "@/services/tiktok-profile/normalize-profile";
export class KonbiniError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export async function konbiniRequest(path: string, params: Record<string, string> = {}, signal = AbortSignal.timeout(55_000)): Promise<Record<string, unknown>> {
  const token = process.env.KONBINI_API_KEY?.trim();
  if (!token || /\s/.test(token)) throw new KonbiniError(503, "not_configured");
  try {
    const response = await fetch(`https://api.konbiniapi.com/v1/tiktok/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal, redirect: "error" });
    if (!response.ok) throw new KonbiniError(response.status, response.status === 402 ? "credits_exhausted" : "provider_error");
    const payload = object(await response.json());
    if (Array.isArray(payload.errors) && payload.errors.length) throw new KonbiniError(502, "provider_error");
    const data = object(payload.data);
    if (!Object.keys(data).length) throw new KonbiniError(502, "invalid_response");
    return data;
  } catch (error) {
    if (error instanceof KonbiniError) throw error;
    throw new KonbiniError(signal.aborted ? 504 : 502, signal.aborted ? "timeout" : "provider_error");
  }
}
