import "server-only";
import type { ProfileResult, ProfileSection, ProfileSummary, ProfileItem } from "@/types/tiktok-profile";
import { konbiniRequest, KonbiniError } from "./client";
import { collection, item, profile } from "./normalize";
import { registerMedia } from "./media";
type State = { items: ProfileItem[]; cursor: string | null; started: boolean; expires: number };
const profiles = new Map<string, { value: ProfileSummary; expires: number }>();
const profilePending = new Map<string, Promise<ProfileSummary>>();
const pages = new Map<string, State>();
const pending = new Map<string, Promise<ProfileResult>>();
function prune<T extends { expires: number }>(cache: Map<string, T>) {
  for (const [key, entry] of cache) if (entry.expires <= Date.now()) cache.delete(key);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
}
export async function getKonbiniProfile(username: string, signal: AbortSignal): Promise<ProfileSummary> {
  prune(profiles);
  const cached = profiles.get(username);
  if (cached) return cached.value;
  const existing = profilePending.get(username);
  if (existing) return existing;
  const request = (async () => {
    const data = await konbiniRequest(`users/${encodeURIComponent(username)}`, {}, signal);
    if (data.isPrivate === true) throw new KonbiniError(403, "private_account");
    const value = profile(data);
    if (value.username.toLowerCase() !== username.toLowerCase()) throw new Error("PROFILE_RESPONSE");
    profiles.set(username, { value, expires: Date.now() + 300_000 });
    return value;
  })().finally(() => profilePending.delete(username));
  profilePending.set(username, request);
  return request;
}
export async function getKonbiniSection(username: string, section: ProfileSection, collectionId?: string, limit = 12): Promise<ProfileResult> {
  const key = `${username}:${section}:${collectionId ?? ""}`;
  const existing = pending.get(key);
  if (existing) { await existing; return getKonbiniSection(username, section, collectionId, limit); }
  if (pending.size >= 2) throw new Error("PROFILE_BUSY");
  const run = async (): Promise<ProfileResult> => {
    prune(pages);
    if (collectionId && !pages.get(`${username}:highlights:`)?.items.some(row => row.id === collectionId)) throw new Error("PROFILE_COLLECTION_EXPIRED");
    const signal = AbortSignal.timeout(55_000);
    const owner = await getKonbiniProfile(username, signal);
    const people = section === "followers" || section === "following";
    // Keep the existing internal highlights key for client compatibility; the UI says Collections.
    const path = collectionId ? `collections/${collectionId}` : `users/${encodeURIComponent(username)}/${section === "posts" ? "videos" : section === "highlights" ? "collections" : section}`;
    let state = pages.get(key) ?? { items: [], cursor: null, started: false, expires: Date.now() + 300_000 };
    for (let attempt = 0; state.items.length < limit && (!state.started || state.cursor) && attempt < 12; attempt++) {
      const data = collection(await konbiniRequest(path, { count: people ? "30" : "12", ...(state.cursor ? { cursor: state.cursor } : {}) }, signal), path);
      const items = data.rows.map(row => item(row, people ? "person" : section === "highlights" && !collectionId ? "collection" : "post", registerMedia, section === "posts" || section === "highlights" ? username : undefined));
      const combined = [...new Map([...state.items, ...items].map(row => [row.id, row])).values()];
      const cursor = data.cursor !== state.cursor && combined.length > state.items.length ? data.cursor : null;
      state = { items: combined, cursor, started: true, expires: state.expires };
      pages.set(key, state);
      if (!people) break;
    }
    return { username, section, profile: owner, items: state.items.slice(0, limit), limit, limited: state.items.length > limit || Boolean(state.cursor) };
  };
  const request = run().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
