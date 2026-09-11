import { object, safeUrl } from "./normalize-profile";
import type { ProfileItem, ProfileSection, ProfileSummary } from "@/types/tiktok-profile";

const text = (value: unknown) => typeof value === "string" ? value : undefined;
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
function image(value: unknown): string | undefined {
  const urls = object(value).url_list;
  if (!Array.isArray(urls)) return safeUrl(value);
  // Prefer browser-compatible JPEG/WebP over the app's HEIC avatar variant.
  const valid = urls.map(url => safeUrl(url)).filter((url): url is string => Boolean(url));
  return valid.find(url => !/\.heic(?:\?|$)/i.test(url)) ?? valid[0];
}
export function tikhubUser(value: unknown): ProfileSummary {
  const user = object(value);
  const username = text(user.unique_id) ?? text(user.uniqueId);
  if (!username || !/^[A-Za-z0-9_.]{1,24}$/.test(username)) throw new Error("PROFILE_RESPONSE");
  return { username, displayName: text(user.nickname) ?? username, avatar: image(user.avatar_medium) ?? image(user.avatar_thumb) ?? safeUrl(user.avatarMedium), bio: text(user.signature), followers: count(user.follower_count), following: count(user.following_count), likes: count(user.total_favorited), posts: count(user.aweme_count) };
}
export function tikhubData(input: unknown): Record<string, unknown> {
  const envelope = object(input);
  if (envelope.code !== 200) throw new Error(envelope.code === 402 ? "PROFILE_CREDIT" : "PROFILE_UNAVAILABLE");
  const data = object(envelope.data);
  for (const status of [data.status_code, data.statusCode]) {
    if (status === 3002060) throw new Error("PROFILE_RESTRICTED");
    if (status !== undefined && status !== 0) throw new Error("PROFILE_UNAVAILABLE");
  }
  if (!Object.keys(data).length) throw new Error("PROFILE_RESPONSE");
  return data;
}
export function normalizeTikhubPage(data: Record<string, unknown>, username: string, section: Exclude<ProfileSection, "highlights">): { items: ProfileItem[]; more: boolean; minTime: string; pageToken: string } {
  const connections = section === "followers" || section === "following";
  const more = data.has_more === true || data.has_more === 1 || data.hasMore === true || data.hasMore === 1;
  const raw = connections ? data[section === "following" ? "followings" : "followers"] : section === "posts" ? data.itemList : data.aweme_list;
  // Live TikTok web responses omit itemList for an empty successful page.
  const empty = section === "posts" && data.statusCode === 0 && data.hasMore === false && raw === undefined;
  if (!Array.isArray(raw) && !empty) throw new Error("PROFILE_RESPONSE");
  const items: ProfileItem[] = (Array.isArray(raw) ? raw : []).map(value => {
    const row = object(value);
    const author = tikhubUser(connections ? row : row.author);
    if (connections) return { id: author.username, title: author.displayName, author, url: `https://www.tiktok.com/@${author.username}` };
    if (section === "posts" && author.username.toLowerCase() !== username.toLowerCase()) throw new Error("PROFILE_RESPONSE");
    const id = text(row.aweme_id) ?? text(row.id);
    if (!id || !/^\d{1,30}$/.test(id)) throw new Error("PROFILE_RESPONSE");
    return { id, title: text(row.desc) ?? "", author, cover: image(object(row.video).cover), url: `https://www.tiktok.com/@${author.username}/video/${id}` };
  });
  const minTime = typeof data.min_time === "number" && Number.isSafeInteger(data.min_time) && data.min_time >= 0 ? String(data.min_time) : "0";
  return { items: [...new Map(items.map(item => [item.id, item])).values()], more, minTime, pageToken: text(data.next_page_token) ?? text(data.page_token) ?? "" };
}

