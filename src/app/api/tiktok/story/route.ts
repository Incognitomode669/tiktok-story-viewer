import { NextRequest, NextResponse } from "next/server";
import { parseUsername } from "@/lib/username";
import { allowStoryLookup } from "@/lib/rate-limit";
import { KonbiniStoryProvider } from "@/services/konbini/story-provider";
import { StoryProviderError } from "@/services/tiktok/story-provider";
import { StoryService } from "@/services/tiktok/story-service";
import type { StoryApiResponse } from "@/types/tiktok-story";

export const runtime = "nodejs";
export const maxDuration = 65;
const service = new StoryService(new KonbiniStoryProvider());

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  try {
    const username = parseUsername(request.nextUrl.searchParams.get("username") ?? "");
    if (!username) throw new StoryProviderError("INVALID_USERNAME", 400);
    if (!allowStoryLookup()) throw new StoryProviderError("RATE_LIMITED", 429);
    const result = await service.getStories(username);
    return NextResponse.json<StoryApiResponse>({ success: true, ...result }, { headers });
  } catch (error) {
    const safe = error instanceof StoryProviderError ? error : new StoryProviderError("PROVIDER_ERROR");
    if (safe.status === 429) headers["Retry-After"] = "60";
    return NextResponse.json<StoryApiResponse>({ success: false, error: { code: safe.code, message: safe.message } }, { status: safe.status, headers });
  }
}

