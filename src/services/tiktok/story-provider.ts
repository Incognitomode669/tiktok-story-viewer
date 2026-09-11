import { copy } from "@/lib/copy";
import type { StoryErrorCode, TikTokStoryResult } from "@/types/tiktok-story";

export interface TikTokStoryProvider {
  getStories(username: string): Promise<TikTokStoryResult>;
}

export class StoryProviderError extends Error {
  constructor(public readonly code: StoryErrorCode, public readonly status = 502) {
    super(copy.errors[code]);
    this.name = "StoryProviderError";
  }
}
