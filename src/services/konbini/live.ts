import "server-only";
import { randomUUID } from "node:crypto";
import { konbiniRequest, KonbiniError } from "./client";
import { object } from "./values";

type LiveResult = { isLive: boolean; stream?: string; title?: string; viewers?: number; checkedAt: string };
const globals = globalThis as typeof globalThis & { storyroomLiveStreams?: Map<string, { url: string; expires: number }> };
const streams = globals.storyroomLiveStreams ??= new Map();
const cache = new Map<string, { expires: number; result: Promise<LiveResult> }>();

export function trustedLiveUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return;
    if (u.hostname === "webcast.tiktok.com" || ["tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com"].some(h => u.hostname === h || u.hostname.endsWith(`.${h}`))) return u.href;
  } catch { /* Reject malformed provider URLs. */ }
}

export function getLive(username: string): Promise<LiveResult> {
  const existing = cache.get(username);
  if (existing && existing.expires > Date.now()) return existing.result;
  const result = lookup(username);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(username, { expires: Date.now() + 30_000, result });
  return result;
}

async function lookup(username: string): Promise<LiveResult> {
  const checkedAt = new Date().toISOString();
  let data: Record<string, unknown>;
  try { data = await konbiniRequest(`users/${username}/live`); }
  catch (error) {
    if (error instanceof KonbiniError && error.status === 404) return { isLive: false, checkedAt };
    throw error;
  }
  if (data.type !== "Video" || String(object(data.attributedTo).preferredUsername).toLowerCase() !== username) throw new KonbiniError(502, "invalid_response");
  if (data.isLive === false) return { isLive: false, checkedAt };
  if (data.isLive !== true) throw new KonbiniError(502, "invalid_response");
  const attachments = Array.isArray(data.attachment) ? data.attachment : [];
  let source: string | undefined;
  for (const value of attachments) {
    const a = object(value);
    if (a.type !== "Video") continue;
    for (const url of Array.isArray(a.url) ? a.url : [a.url]) {
      const safe = trustedLiveUrl(url);
      if (safe && (a.mediaType === "video/x-flv" || new URL(safe).pathname.endsWith(".flv"))) { source = safe; break; }
    }
    if (source) break;
  }
  if (!source) throw new KonbiniError(502, "unsupported_stream");
  for (const [id, entry] of streams) if (entry.expires < Date.now()) streams.delete(id);
  if (streams.size >= 300) streams.delete(streams.keys().next().value!);
  const id = randomUUID();
  streams.set(id, { url: source, expires: Date.now() + 10 * 60_000 });
  return { isLive: true, stream: `/api/tiktok/live/stream?id=${id}`, checkedAt,
    title: typeof data.content === "string" ? data.content : undefined,
    viewers: typeof data.viewerCount === "number" && Number.isSafeInteger(data.viewerCount) && data.viewerCount >= 0 ? data.viewerCount : undefined };
}

export async function serveLive(request: Request): Promise<Response> {
  const entry = streams.get(new URL(request.url).searchParams.get("id") ?? "");
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!entry || entry.expires < Date.now()) return new Response(null, { status: 410, headers });
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  const timer = setTimeout(abort, 20_000);
  let handedOff = false;
  try {
    let url = entry.url;
    for (let redirects = 0; redirects <= 3; redirects++) {
      const upstream = await fetch(url, { signal: controller.signal, redirect: "manual", cache: "no-store" });
      if ([301, 302, 303, 307, 308].includes(upstream.status)) {
        await upstream.body?.cancel();
        const location = upstream.headers.get("location");
        const target = location && trustedLiveUrl(new URL(location, url).href);
        if (!target) break;
        url = target; continue;
      }
      if (!upstream.ok || !upstream.body || !/^(video\/|application\/octet-stream)/i.test(upstream.headers.get("content-type") ?? "")) { await upstream.body?.cancel(); break; }
      clearTimeout(timer); // Only connection setup is timed; broadcasts can run indefinitely.
      const reader = upstream.body.getReader();
      const cleanup = () => { request.signal.removeEventListener("abort", abort); controller.abort(); };
      const body = new ReadableStream({
        async pull(c) { try { const item = await reader.read(); if (item.done) { c.close(); cleanup(); } else c.enqueue(item.value); } catch { c.error(new Error("Live stream disconnected")); cleanup(); } },
        async cancel() { cleanup(); await reader.cancel().catch(() => {}); },
      });
      handedOff = true;
      return new Response(body, { headers: { ...headers, "Content-Type": "video/x-flv" } });
    }
    return new Response(null, { status: 502, headers });
  } catch { return new Response(null, { status: 502, headers }); }
  finally { clearTimeout(timer); if (!handedOff) { request.signal.removeEventListener("abort", abort); controller.abort(); } }
}
