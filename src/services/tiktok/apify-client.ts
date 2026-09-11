import "server-only";
import { getApifyToken } from "@/lib/env";
import { StoryProviderError } from "./story-provider";

const ENDPOINT = "https://api.apify.com/v2/actors/powerai~tiktok-user-story-scraper/run-sync-get-dataset-items";

export async function fetchApifyStories(username: string): Promise<unknown> {
  const token = getApifyToken();
  try {
    const response = await fetch(`${ENDPOINT}?timeout=55`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      // Clear the Actor's example user_id default so it cannot override the requested handle.
      body: JSON.stringify({ unique_id: `@${username}`, user_id: "", maxResults: 20 }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (response.status === 429) throw new StoryProviderError("RATE_LIMITED", 429);
    if (response.status === 408 || response.status === 504) throw new StoryProviderError("TIMEOUT", 504);
    if (!response.ok) throw new StoryProviderError("PROVIDER_ERROR");
    return await response.json();
  } catch (error) {
    if (error instanceof StoryProviderError) throw error;
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw new StoryProviderError("TIMEOUT", 504);
    }
    throw new StoryProviderError("PROVIDER_ERROR");
  }
}
