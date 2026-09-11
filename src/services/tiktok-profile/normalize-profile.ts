import { parseUsername } from "@/lib/username";
import type { ProfileItem, ProfileResult, ProfileSection, ProfileSummary } from "@/types/tiktok-profile";

export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const text = (value: unknown) => typeof value === "string" ? value : undefined;
const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
export function safeUrl(value: unknown, profileLink = false): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const domains = profileLink ? ["www.tiktok.com", "tiktok.com"] : ["tiktokcdn.com", "tiktokcdn-eu.com", "tiktokcdn-us.com"];
    const allowed = domains.some(domain => url.hostname === domain || (!profileLink && url.hostname.endsWith(`.${domain}`)));
    if (allowed && url.protocol === "https:" && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Omit invalid optional links. */ }
}
function profile(value: unknown): ProfileSummary | undefined {
  const data = object(value);
  // Provider-returned creator handles can include legacy leading periods (observed: .peasy).
  const rawName = text(data.name);
  const username = rawName && /^[A-Za-z0-9_.]{1,24}$/.test(rawName) ? rawName : undefined;
  if (!username) return;
  return { username, displayName: text(data.nickName) ?? username, avatar: safeUrl(data.avatar), bio: text(data.signature), followers: count(data.fans), following: count(data.following), likes: count(data.heart), posts: count(data.video) };
}
export function normalizeProfile(input: unknown, username: string, section: ProfileSection, highlightId?: string, limit = 12): ProfileResult {
  if (!Array.isArray(input)) throw new Error("PROFILE_RESPONSE");
  let owner: ProfileSummary | undefined;
  const items: ProfileItem[] = [];
  for (const raw of input) {
    const row = object(raw);
    if (row.errorCode || row.error) throw new Error("PROFILE_UNAVAILABLE");
    if (section === "highlights") {
      if (!highlightId) {
        if (parseUsername(text(row.unique_id) ?? "") !== username || !/^\d+$/.test(text(row.highlight_id) ?? "")) throw new Error("PROFILE_RESPONSE");
        items.push({ id: String(row.highlight_id), title: text(row.title) ?? "", cover: safeUrl(row.cover), count: count(row.post_count) });
      } else {
        const author = object(row.author_info);
        if (String(row.highlight_id) !== highlightId || parseUsername(text(author.unique_id) ?? "") !== username) throw new Error("PROFILE_RESPONSE");
        const id = text(row.video_id) ?? text(row.aweme_id);
        if (!id) throw new Error("PROFILE_RESPONSE");
        items.push({ id, title: text(row.title) ?? "", cover: safeUrl(row.cover_url), video: safeUrl(row.video_url), images: Array.isArray(row.images) ? row.images.map(value => safeUrl(value)).filter((value): value is string => Boolean(value)) : undefined });
      }
      continue;
    }
    const author = profile(row.authorMeta);
    if (!author) throw new Error("PROFILE_RESPONSE");
    if (section === "followers" || section === "following") {
      const connected = profile(row.connectedTo);
      if (connected?.username !== username || row.connectionType !== (section === "followers" ? "follower" : "following")) throw new Error("PROFILE_RESPONSE");
      owner = connected;
      items.push({ id: author.username, title: author.displayName, author, url: `https://www.tiktok.com/@${author.username}` });
    } else {
      if (section === "posts" && author.username !== username) throw new Error("PROFILE_RESPONSE");
      if (section === "reposts" && (parseUsername(text(row.input)?.replace(/^https:\/\/www\.tiktok\.com\/@/, "") ?? "") !== username || row.fromProfileSection !== "reposts")) throw new Error("PROFILE_RESPONSE");
      if (author.username === username) owner = author;
      const id = text(row.id);
      // Observed live for a public account with no returned video rows.
      if (!id && section === "posts" && row.input === username && row.note === "Profile has no videos (or is behind a login wall)") continue;
      if (!id) throw new Error("PROFILE_RESPONSE");
      items.push({ id, title: text(row.text) ?? "", cover: safeUrl(object(row.videoMeta).coverUrl), url: safeUrl(row.webVideoUrl, true), author });
    }
  }
  const unique = [...new Map(items.map(item => [item.id, item])).values()].slice(0, limit);
  const total = section === "followers" ? owner?.followers : section === "following" ? owner?.following : undefined;
  return { username, section, profile: owner, items: unique, limit, limited: unique.length >= limit && (total === undefined || unique.length < total) };
}

