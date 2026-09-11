import "server-only";
import { randomUUID } from "node:crypto";
import { konbiniRequest } from "./client";
import { object } from "@/services/tiktok-profile/normalize-profile";
type Entry = { url: string; headers: Record<string, string>; expires: number; fallbackId?: string; download?: Promise<string | undefined> };
const shared = globalThis as typeof globalThis & { storyroomMedia?: Map<string, Entry> };
const media = shared.storyroomMedia ??= new Map();
export function trustedMedia(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const trusted = ["tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) || /^v\d+-webapp(?:-prime)?(?:\.us)?\.tiktok\.com$/.test(url.hostname);
    if (trusted && url.protocol === "https:" && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Unsupported media is omitted. */ }
}
export function registerMedia(value: unknown, rawHeaders?: unknown, videoId?: string): string | undefined {
  const url = trustedMedia(value);
  if (!url) return;
  for (const [id, entry] of media) if (entry.expires <= Date.now()) media.delete(id);
  if (media.size >= 3000) media.delete(media.keys().next().value!);
  const headers: Record<string, string> = { Referer: "https://www.tiktok.com/" };
  for (const [name, value] of Object.entries(object(rawHeaders))) {
    if (name.toLowerCase() === "cookie" && typeof value === "string" && !/[\r\n]/.test(value)) headers.Cookie = value;
  }
  const id = randomUUID();
  media.set(id, { url, headers, expires: Date.now() + 15 * 60_000, fallbackId: videoId && /^\d{1,30}$/.test(videoId) ? videoId : undefined });
  return `/api/tiktok/media?id=${id}`;
}
export async function serveMedia(request: Request): Promise<Response> {
  const entry = media.get(new URL(request.url).searchParams.get("id") ?? "");
  if (!entry || entry.expires <= Date.now()) return new Response(null, { status: 404 });
  const range = request.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range)) return new Response(null, { status: 416 });
  let url = entry.url;
  try {
    for (let redirects = 0; redirects < 4; redirects++) {
      if (!trustedMedia(url)) return new Response(null, { status: 502 });
      const upstream = await fetch(url, { headers: { ...entry.headers, ...(range ? { Range: range } : {}) }, redirect: "manual", cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]) });
      if ([301, 302, 303, 307, 308].includes(upstream.status)) {
        const location = upstream.headers.get("location");
        await upstream.body?.cancel();
        if (!location) break;
        const next = new URL(location, url).href;
        // Never forward a provider cookie to a different host.
        if (entry.headers.Cookie && new URL(next).hostname !== new URL(url).hostname) break;
        url = next; continue;
      }
      const contentType = upstream.headers.get("content-type") ?? "";
      if (![200, 206].includes(upstream.status) || !/^(video\/|image\/|application\/octet-stream)/i.test(contentType)) { await upstream.body?.cancel(); break; }
      const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
      for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
      return new Response(upstream.body, { status: upstream.status, headers });
    }
  } catch { /* No upstream URLs, cookies or errors reach the browser. */ }
  if (entry.fallbackId) {
    const id = entry.fallbackId;
    entry.download ??= downloadUrl(id);
    const url = await entry.download;
    entry.fallbackId = undefined;
    if (url) { entry.url = url; entry.headers = {}; return serveMedia(request); }
  }
  return new Response(null, { status: 502 });
}

const downloads = new Map<string, { expires: number; request: Promise<string | undefined> }>();
function downloadUrl(id: string): Promise<string | undefined> {
  for (const [key, value] of downloads) if (value.expires <= Date.now()) downloads.delete(key);
  const cached = downloads.get(id);
  if (cached) return cached.request;
  if (downloads.size >= 500) downloads.delete(downloads.keys().next().value!);
  const request = konbiniRequest(`videos/${id}/download`).then(data => trustedMedia(data.url)).catch(() => undefined);
  downloads.set(id, { request, expires: Date.now() + 300_000 });
  return request;
}
