import "server-only";
import type { ProfileSection } from "@/types/tiktok-profile";
import { getKonbiniSection } from "@/services/konbini/profile-service";
import { KonbiniError } from "@/services/konbini/client";
export async function getProfileSection(username: string, section: ProfileSection, highlightId?: string, limit = 12) {
  try { return await getKonbiniSection(username, section, highlightId, limit); }
  catch (error) {
    if (!(error instanceof KonbiniError)) throw error;
    if (error.code === "private_account") throw new Error("PROFILE_RESTRICTED");
    if (error.status === 402) throw new Error("PROFILE_CREDIT");
    if ([401, 403, 503].includes(error.status) && error.code !== "provider_error") throw new Error("PROFILE_ACCESS");
    if ([401, 403].includes(error.status)) throw new Error("PROFILE_ACCESS");
    if (error.status === 429) throw new Error("PROFILE_BUSY");
    throw new Error("PROFILE_UNAVAILABLE");
  }
}
