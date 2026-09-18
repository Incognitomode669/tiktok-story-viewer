import "server-only";
import type { TikTokStoryProvider } from "@/services/tiktok/story-provider";
import { StoryProviderError } from "@/services/tiktok/story-provider";
import { konbiniRequest, KonbiniError } from "./client";
import { collection, stories } from "./normalize";
import { getKonbiniProfile } from "./profile-service";
import { registerMedia } from "./media";
export class KonbiniStoryProvider implements TikTokStoryProvider {
  async getStories(username: string) {
    try {
      const signal = AbortSignal.timeout(55_000);
      const author = await getKonbiniProfile(username, signal);
      const path = `users/${encodeURIComponent(username)}/stories`;
      const rows: unknown[] = [];
      let cursor: string | null = null;
      const seen = new Set<string>();
      for (let page = 0; page < 3; page++) {
        const data = collection(await konbiniRequest(path, { count: "30", ...(cursor ? { cursor } : {}) }, signal), path);
        rows.push(...data.rows);
        cursor = data.cursor;
        if (!cursor || seen.has(cursor) || rows.length >= 20 || !data.rows.length) break;
        seen.add(cursor);
      }
      const result = stories(rows, username, registerMedia);
      return { username, author, stories: result, hasStory: result.length > 0 };
    } catch (error) {
      if (error instanceof KonbiniError) {
        if (error.code === "not_configured") throw new StoryProviderError("NOT_CONFIGURED", 503);
        if (error.code === "key_session_invalid") throw new StoryProviderError("KEY_SESSION_INVALID", 401);
        if (error.code === "private_account") throw new StoryProviderError("PRIVATE_ACCOUNT", 403);
        if (error.status === 402) throw new StoryProviderError("PROVIDER_CREDIT", 503);
        if (error.status === 404) throw new StoryProviderError("USER_NOT_FOUND", 404);
        if (error.status === 429) throw new StoryProviderError("RATE_LIMITED", 429);
        if (error.status === 504) throw new StoryProviderError("TIMEOUT", 504);
        throw new StoryProviderError("PROVIDER_ERROR");
      }
      throw new StoryProviderError(error instanceof Error && error.message === "MEDIA_UNAVAILABLE" ? "MEDIA_UNAVAILABLE" : "PROVIDER_RESPONSE_CHANGED");
    }
  }
}
