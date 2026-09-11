import { NextRequest, NextResponse } from "next/server";
import { parseUsername } from "@/lib/username";
import { allowStoryLookup } from "@/lib/rate-limit";
import { getProfileSection } from "@/services/tiktok-profile/profile-service";
import { profileSections, type ProfileSection } from "@/types/tiktok-profile";

export const runtime = "nodejs";
export const maxDuration = 65;
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const body = await request.json();
    const limit = body?.limit ?? 12;
    const maxLimit = body?.section === "followers" || body?.section === "following" ? 240 : 12;
    if (!Number.isInteger(limit) || limit < 12 || limit > maxLimit || limit % 12 !== 0) return NextResponse.json({ success: false, code: "PROFILE_INPUT" }, { status: 400, headers });
    const username = parseUsername(typeof body?.username === "string" ? body.username : "");
    if (!username || !profileSections.includes(body.section) || (body.highlightId !== undefined && (body.section !== "highlights" || typeof body.highlightId !== "string" || !/^\d{1,30}$/.test(body.highlightId)))) {
      return NextResponse.json({ success: false, code: "PROFILE_INPUT" }, { status: 400, headers });
    }
    if (!allowStoryLookup()) return NextResponse.json({ success: false, code: "PROFILE_BUSY" }, { status: 429, headers });
    return NextResponse.json({ success: true, ...await getProfileSection(username, body.section as ProfileSection, body.highlightId, limit) }, { headers });
  } catch (error) {
    const known = ["PROFILE_RESPONSE", "PROFILE_UNAVAILABLE", "PROFILE_COLLECTION_EXPIRED", "PROFILE_BUSY", "PROFILE_ACCESS", "PROFILE_CREDIT", "PROFILE_RESTRICTED"];
    const code = error instanceof Error && known.includes(error.message) ? error.message : "PROFILE_UNAVAILABLE";
    return NextResponse.json({ success: false, code }, { status: code === "PROFILE_BUSY" ? 429 : 502, headers });
  }
}

