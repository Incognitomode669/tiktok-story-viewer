import "server-only";
import { randomUUID } from "node:crypto";
import { KonbiniError, konbiniRequest } from "./client";
import { object, playAddress } from "./values";

type Entry = { url?: string; videoId?: string; playUrl?: string; headers: Record<string, string>; expires: number };
type Download = { created: number; expires: number; request: Promise<string> };
const shared = globalThis as typeof globalThis & { storyroomKonbiniMediaV3?: Map<string, Entry> };
const media = shared.storyroomKonbiniMediaV3 ??= new Map();
const downloads = new Map<string, Download>();
export function trustedMedia(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const trusted = ["tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) || /^v\d+-webapp(?:-prime)?(?:\.us)?\.tiktok\.com$/.test(url.hostname);
    if (trusted && url.protocol === "https:" && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Unsupported media is omitted. */ }
}
export function registerMedia(value: unknown, rawHeaders?: unknown, videoId?: string): string | undefined {
  if (videoId !== undefined && !/^\d{1,30}$/.test(videoId)) return;
  const url = videoId ? undefined : trustedMedia(value);
  if (!videoId && !url) return;
  for (const [id, entry] of media) if (entry.expires <= Date.now()) media.delete(id);
  if (media.size >= 3000) media.delete(media.keys().next().value!);
  // Videos use the documented cookie-free download endpoint. Images use supplied media.
  const headers: Record<string, string> = {};
  if (!videoId) {
    headers.Referer = "https://www.tiktok.com/";
    for (const [name, value] of Object.entries(object(rawHeaders))) {
      if (name.toLowerCase() === "cookie" && typeof value === "string" && !/[\r\n]/.test(value)) headers.Cookie = value;
    }
  }
  const id = randomUUID();
  media.set(id, { url, videoId, playUrl: videoId ? playAddress(value) : undefined, headers, expires: Date.now() + 24 * 60 * 60_000 });
  return `/api/tiktok/media?id=${id}`;
}
function download(videoId: string, playUrl?: string): Download {
  const now = Date.now();
  for (const [id, entry] of downloads) if (entry.expires <= now) downloads.delete(id);
  const cached = downloads.get(videoId);
  if (cached) return cached;
  if (downloads.size >= 500) downloads.delete(downloads.keys().next().value!);
  const entry: Download = { created: now, expires: now + 300_000, request: Promise.resolve("") };
  entry.request = konbiniRequest(`videos/${videoId}/download`, playUrl ? { url: playUrl } : {}, AbortSignal.timeout(30_000)).then(data => {
    const url = trustedMedia(data.url);
    if (data.type !== "Video" || !url) throw new KonbiniError(502, "invalid_media_response");
    return url;
  }).catch(error => {
    entry.expires = Date.now() + 30_000;
    throw error;
  });
  downloads.set(videoId, entry);
  return entry;
}
const failure = (status: number, code: string) => new Response(null, { status, headers: { "Cache-Control": "no-store", "X-Storyroom-Media-Error": code } });
export async function serveMedia(request: Request): Promise<Response> {
  const entry = media.get(new URL(request.url).searchParams.get("id") ?? "");
  if (!entry || entry.expires <= Date.now()) return failure(404, "lookup_expired");
  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return failure(416, "invalid_range");
  if (request.signal.aborted) return failure(499, "request_cancelled");
  let source: Download | undefined;
  let url = entry.url;
  if (entry.videoId) {
    source = download(entry.videoId, entry.playUrl);
    try { url = await source.request; }
    catch (error) {
      if (error instanceof KonbiniError) {
        if (error.status === 402) return failure(503, "credits_exhausted");
        if ([401, 403].includes(error.status) || error.code === "not_configured") return failure(503, "provider_access");
        if (error.status === 429) return failure(429, "provider_rate_limit");
        if (error.status === 504) return failure(504, "provider_timeout");
      }
      return failure(502, "download_lookup_failed");
    }
  }
  if (!url) return failure(502, "missing_media_url");
  const result = await stream(request, entry, url, range);
  if (source && result.status === 502) {
    // A later user retry can resolve an expired URL, never more than once per 30s.
    source.expires = Math.max(Date.now(), source.created + 30_000);
  }
  return result;
}
async function stream(request: Request, entry: Entry, initialUrl: string, range: string | null): Promise<Response> {
  let url = initialUrl;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
  try {
    for (let redirects = 0; redirects < 4; redirects++) {
      if (!trustedMedia(url)) return failure(502, "unsupported_media_host");
      const upstream = await fetch(url, { headers: { ...entry.headers, ...(range ? { Range: range } : {}) }, redirect: "manual", cache: "no-store", signal });
      if ([301, 302, 303, 307, 308].includes(upstream.status)) {
        const location = upstream.headers.get("location");
        await upstream.body?.cancel();
        if (!location) return failure(502, "invalid_media_redirect");
        const next = new URL(location, url).href;
        if (entry.headers.Cookie && new URL(next).hostname !== new URL(url).hostname) return failure(502, "unsupported_media_redirect");
        url = next; continue;
      }
      if (upstream.status === 416) {
        await upstream.body?.cancel();
        const headers = new Headers({ "Cache-Control": "no-store" });
        const contentRange = upstream.headers.get("content-range");
        if (contentRange) headers.set("Content-Range", contentRange);
        return new Response(null, { status: 416, headers });
      }
      const contentType = upstream.headers.get("content-type") ?? "";
      if (![200, 206].includes(upstream.status) || !/^(video\/|image\/|application\/octet-stream)/i.test(contentType)) {
        await upstream.body?.cancel();
        return failure(502, "media_source_rejected");
      }
      const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
      for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
      return new Response(upstream.body, { status: upstream.status, headers });
    }
  } catch { return failure(request.signal.aborted ? 499 : 502, request.signal.aborted ? "request_cancelled" : "media_connection_failed"); }
  return failure(502, "too_many_redirects");
}
