import { credentialScope } from "../konbini/credentials";
import "server-only";
import type { TikTokStoryResult } from "@/types/tiktok-story";
import type { TikTokStoryProvider } from "./story-provider";

export class StoryService {
  private readonly cache = new Map<string, { expires: number; result: TikTokStoryResult }>();
  private readonly pending = new Map<string, Promise<TikTokStoryResult>>();

  constructor(private readonly provider: TikTokStoryProvider, private readonly now = Date.now) {}

  async getStories(username: string): Promise<TikTokStoryResult> {
    const scoped = `${credentialScope()}:${username}`;
    const time = this.now();
    for (const [key, value] of this.cache) if (value.expires <= time) this.cache.delete(key);
    const cached = this.cache.get(scoped);
    if (cached) return cached.result;
    const pending = this.pending.get(scoped);
    if (pending) return pending;

    const request = this.provider.getStories(username).then((result) => {
      const receivedAt = this.now();
      const expiries = result.stories.flatMap((story) => story.expiresAt ? [Date.parse(story.expiresAt)] : []);
      const expires = Math.min(receivedAt + 60_000, ...expiries.filter(Number.isFinite));
      if (expires > receivedAt) {
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(scoped, { result, expires });
      }
      return result;
    }).finally(() => this.pending.delete(scoped));
    this.pending.set(scoped, request);
    return request;
  }
}
