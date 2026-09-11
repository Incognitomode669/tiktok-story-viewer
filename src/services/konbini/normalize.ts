import { object, safeUrl, playAddress } from "./values";
import type { ProfileItem, ProfileSummary } from "@/types/tiktok-profile";
import type { TikTokStory } from "@/types/tiktok-story";
export const text = (value: unknown) => typeof value === "string" && value ? value : undefined;
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
const array = (value: unknown) => Array.isArray(value) ? value : value ? [value] : [];
export type MediaResolver = (value: unknown, headers?: unknown, videoId?: string) => string | undefined;
const image = (value: unknown) => array(value).map(item => safeUrl(object(item).url)).find(Boolean);
export function profile(value: unknown): ProfileSummary {
  const row = object(value), username = text(row.preferredUsername);
  if (!['Person', 'Organization'].includes(String(row.type)) || !username || !/^[A-Za-z0-9_.]{1,24}$/.test(username)) throw new Error("PROFILE_RESPONSE");
  return { username, displayName: text(row.name) ?? username, avatar: image(row.image) ?? image(row.icon), bio: text(row.summary), followers: count(row.followerCount), following: count(row.followingCount), likes: count(row.likeCount), posts: count(row.mediaCount) };
}
export function collection(data: Record<string, unknown>, expectedPath: string) {
  if (data.type !== "OrderedCollectionPage" || !Array.isArray(data.orderedItems)) throw new Error("PROFILE_RESPONSE");
  if (typeof data.partOf !== "string" || new URL(data.partOf).origin !== "https://api.konbiniapi.com" || new URL(data.partOf).pathname !== `/v1/tiktok/${expectedPath}`) throw new Error("PROFILE_RESPONSE");
  return { rows: data.orderedItems, cursor: text(data.nextCursor) ?? null };
}
export function video(row: Record<string, unknown>, resolve: MediaResolver) {
  const attachments = array(row.attachment).map(object).filter(media => media.type === "Video");
  const play = attachments.flatMap(media => array(media.url)).map(playAddress).find(Boolean);
  if (play) return resolve(play, undefined, text(row.entityId));
  for (const value of array(row.attachment)) {
    const media = object(value);
    if (media.type !== "Video") continue;
    for (const url of array(media.url)) { const result = resolve(url, undefined, text(row.entityId)); if (result) return result; }
  }
}
export function item(value: unknown, kind: "person" | "collection" | "post", resolve: MediaResolver, owner?: string): ProfileItem {
  const row = object(value);
  if (kind === "person") { const author = profile(row); return { id: author.username, title: author.displayName, author, url: `https://www.tiktok.com/@${author.username}` }; }
  const id = text(row.entityId);
  if (!id || !/^\d{1,30}$/.test(id)) throw new Error("PROFILE_RESPONSE");
  const author = profile(row.attributedTo);
  if (owner && owner.toLowerCase() !== author.username.toLowerCase()) throw new Error("PROFILE_RESPONSE");
  if (kind === "collection") {
    if (row.type !== "Collection") throw new Error("PROFILE_RESPONSE");
    return { id, title: text(row.name) ?? "", count: count(row.totalItems), cover: image(row.image), author };
  }
  if (!["Video", "Image"].includes(String(row.type))) throw new Error("PROFILE_RESPONSE");
  return { id, title: text(row.content) ?? "", author, cover: image(row.preview) ?? image(row.image), url: `https://www.tiktok.com/@${author.username}/video/${id}`, video: video(row, resolve), images: array(row.image).map(value => image(value)).filter((url): url is string => Boolean(url)) };
}
export function stories(rows: unknown[], username: string, resolve: MediaResolver, now = Date.now()): TikTokStory[] {
  const result: TikTokStory[] = [];
  for (const value of rows) {
    const row = object(value), author = profile(row.attributedTo), id = text(row.entityId);
    if (!id || !/^\d{1,30}$/.test(id) || author.username.toLowerCase() !== username.toLowerCase()) throw new Error("PROFILE_RESPONSE");
    const created = text(row.published), end = text(row.endTime);
    const expires = end ? Date.parse(end) : created ? Date.parse(created) + 86_400_000 : NaN;
    if (Number.isFinite(expires) && expires <= now) continue;
    const base = { id, author, views: count(row.viewCount), duration: typeof row.duration === "number" && row.duration > 0 ? row.duration : undefined, createdAt: created, expiresAt: Number.isFinite(expires) ? new Date(expires).toISOString() : undefined, coverUrl: image(row.preview) };
    const videoUrl = video(row, resolve);
    if (videoUrl) result.push({ ...base, type: "video", videoUrl });
    else if (row.type === "Image") {
      const imageUrl = array(row.image).map(value => { const media = object(value); return resolve(media.url, media.headers); }).find(Boolean);
      if (!imageUrl) throw new Error("MEDIA_UNAVAILABLE");
      result.push({ ...base, type: "image", imageUrl });
    } else throw new Error("MEDIA_UNAVAILABLE");
  }
  return [...new Map(result.map(story => [story.id, story])).values()].slice(0, 20);
}


