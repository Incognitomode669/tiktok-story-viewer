export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function playAddress(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "www.tiktok.com" && url.pathname === "/aweme/v1/play/" && !url.port && !url.username && !url.password) return url.href;
  } catch { /* Only the documented TikTok play address can be passed to Konbini. */ }
}
export function safeUrl(value: unknown, profileLink = false): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const domains = profileLink ? ["www.tiktok.com", "tiktok.com"] : ["tiktokcdn.com", "tiktokcdn-eu.com", "tiktokcdn-us.com"];
    const allowed = domains.some(domain => url.hostname === domain || (!profileLink && url.hostname.endsWith(`.${domain}`)));
    if (allowed && url.protocol === "https:" && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Omit invalid optional links. */ }
}
