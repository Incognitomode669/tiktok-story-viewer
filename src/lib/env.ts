import "server-only";
import { StoryProviderError } from "@/services/tiktok/story-provider";

export function getApifyToken(): string {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token || /\s/.test(token)) throw new StoryProviderError("NOT_CONFIGURED", 503);
  return token;
}
