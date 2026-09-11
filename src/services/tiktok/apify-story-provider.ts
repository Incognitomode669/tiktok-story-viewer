import "server-only";
import type { TikTokStoryProvider } from "./story-provider";
import { fetchApifyStories } from "./apify-client";
import { normalizeApifyStories } from "./normalize-apify-stories";
import type { TikTokStoryResult } from "@/types/tiktok-story";

export class ApifyTikTokStoryProvider implements TikTokStoryProvider {
  async getStories(username: string): Promise<TikTokStoryResult> {
    return normalizeApifyStories(await fetchApifyStories(username), username);
  }
}
