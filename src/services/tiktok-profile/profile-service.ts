import "server-only";
import { getApifyToken } from "@/lib/env";
import type { ProfileResult, ProfileSection } from "@/types/tiktok-profile";
import { normalizeProfile } from "./normalize-profile";

const cache = new Map<string, { expires: number; result: ProfileResult }>();
const pending = new Map<string, Promise<ProfileResult>>();
export function actorInput(username: string, section: ProfileSection, highlightId?: string, limit = 12) {
  if (section === "highlights") return {
    actor: "igview-owner~tiktok-highlight-scraper",
    input: { mode: highlightId ? "highlight_posts" : "highlight_list", uniqueIds: highlightId ? [] : [username], highlightIds: highlightId ? [highlightId] : [], postsPerPage: 12 },
  };
  if (section === "followers" || section === "following") return {
    actor: "clockworks~tiktok-followers-scraper",
    input: { profiles: [username], maxFollowersPerProfile: section === "followers" ? limit : 0, maxFollowingPerProfile: section === "following" ? limit : 0 },
  };
  return { actor: "clockworks~tiktok-scraper", input: { profiles: [username], profileScrapeSections: [section === "posts" ? "videos" : "reposts"], resultsPerPage: 12, profileSorting: "latest", shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadAvatars: false, shouldDownloadSlideshowImages: false, shouldDownloadSubtitles: false, shouldDownloadMusicCovers: false, maxFollowersPerProfile: 0, maxFollowingPerProfile: 0, commentsPerPost: 0 } };
}
export async function getProfileSection(username: string, section: ProfileSection, highlightId?: string, limit = 12): Promise<ProfileResult> {
  for (const [key, entry] of cache) if (entry.expires <= Date.now()) cache.delete(key);
  const key = `${username}:${section}:${highlightId ?? ""}:${limit}`;
  const cached = cache.get(key);
  if (cached) return cached.result;
  if (highlightId && !cache.get(`${username}:highlights::12`)?.result.items.some(item => item.id === highlightId)) throw new Error("PROFILE_COLLECTION_EXPIRED");
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= 2) throw new Error("PROFILE_BUSY");
  const run = async () => {
    const { actor, input } = actorInput(username, section, highlightId, limit);
    const response = await fetch(`https://api.apify.com/v2/actors/${actor}/run-sync-get-dataset-items?timeout=55&maxTotalChargeUsd=0.5&limit=${limit}`, {
      method: "POST", headers: { Authorization: `Bearer ${getApifyToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(input), signal: AbortSignal.timeout(60_000), cache: "no-store",
    });
    if (!response.ok) throw new Error([401, 402, 403].includes(response.status) ? "PROFILE_ACCESS" : "PROFILE_UNAVAILABLE");
    const result = normalizeProfile(await response.json(), username, section, highlightId, limit);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { result, expires: Date.now() + 300_000 });
    return result;
  };
  const request = run().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

