import type { TikTokStory, TikTokStoryResult } from "@/types/tiktok-story";
import { parseUsername } from "@/lib/username";
import { StoryProviderError } from "./story-provider";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mediaUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const allowedHost = ["tiktokcdn.com", "tiktokcdn-eu.com", "tiktokcdn-us.com"].some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    );
    if (url.protocol === "https:" && !url.username && !url.password && !url.port && allowedHost) return url.href;
  } catch { /* Invalid or unsupported media is not sent to the browser. */ }
}

// Empty datasets were observed live. Video fields follow the Actor's published output:
// https://apify.com/powerai/tiktok-user-story-scraper (see docs/provider-contract.md).
export function normalizeApifyStories(input: unknown, username: string): TikTokStoryResult {
  if (!Array.isArray(input)) throw new StoryProviderError("PROVIDER_RESPONSE_CHANGED");
  const stories: TikTokStory[] = [];
  const ids = new Set<string>();
  for (const item of input) {
    if (!record(item) || !record(item.author)) throw new StoryProviderError("PROVIDER_RESPONSE_CHANGED");
    const id = text(item.aweme_id) ?? text(item.video_id);
    const authorUsername = typeof item.author.unique_id === "string" ? parseUsername(item.author.unique_id) : null;
    if (!id || authorUsername !== username) throw new StoryProviderError("PROVIDER_RESPONSE_CHANGED");
    // Covers are previews, never a substitute for a missing video or an invented image schema.
    if (!("play" in item) && !("wmplay" in item)) throw new StoryProviderError("PROVIDER_RESPONSE_CHANGED");
    const videoUrl = mediaUrl(item.play) ?? mediaUrl(item.wmplay);
    if (!videoUrl) throw new StoryProviderError("MEDIA_UNAVAILABLE");
    if (ids.has(id)) continue;
    ids.add(id);
    const avatar = mediaUrl(item.author.avatar);
    stories.push({
      id,
      type: "video",
      videoUrl,
      views: typeof item.play_count === "number" && Number.isSafeInteger(item.play_count) && item.play_count >= 0 ? item.play_count : undefined,
      coverUrl: mediaUrl(item.cover),
      duration: typeof item.duration === "number" && Number.isFinite(item.duration) && item.duration > 0 ? item.duration : undefined,
      author: { username: authorUsername, displayName: text(item.author.nickname) ?? authorUsername, ...(avatar ? { avatar } : {}) },
    });
  }
  return { username, hasStory: stories.length > 0, stories: stories.slice(0, 20) };
}
