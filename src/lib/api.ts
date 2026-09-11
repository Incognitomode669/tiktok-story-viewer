import type { StoryApiResponse } from "@/types/tiktok-story";

export async function lookupStories(username: string, signal: AbortSignal): Promise<StoryApiResponse> {
  const response = await fetch(`/api/tiktok/story?${new URLSearchParams({ username })}`, { signal, cache: "no-store" });
  const body: StoryApiResponse = await response.json();
  if (typeof body.success !== "boolean") throw new Error("Invalid application response");
  return body;
}
