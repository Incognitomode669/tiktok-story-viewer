import "server-only";
import type { ProfileItem, ProfileResult, ProfileSection, ProfileSummary } from "@/types/tiktok-profile";
import { object } from "./normalize-profile";
import { normalizeTikhubPage, tikhubData, tikhubUser } from "./normalize-tikhub";

type Owner = { profile: ProfileSummary; uid: string; secUid: string };
type Pages = { items: ProfileItem[]; more: boolean; minTime: string; pageToken: string };
const owners = new Map<string, { value: Owner; expires: number }>();
const ownerPending = new Map<string, Promise<Owner>>();
const pages = new Map<string, { value: Pages; expires: number }>();
const pagePending = new Map<string, Promise<ProfileResult>>();
const ttl = 300_000;
function trim<T>(cache: Map<string, { value: T; expires: number }>) {
  for (const [key, entry] of cache) if (entry.expires <= Date.now()) cache.delete(key);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
}
async function request(endpoint: string, params: Record<string, string>, signal: AbortSignal) {
  const key = process.env.TIKHUB_API_KEY?.trim();
  if (!key || /\s/.test(key)) throw new Error("PROFILE_ACCESS");
  const response = await fetch(`https://api.tikhub.io/api/v1/tiktok/${endpoint}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal,
  });
  // Error bodies may echo request credentials; never log or forward them.
  if (!response.ok) throw new Error(response.status === 402 ? "PROFILE_CREDIT" : [401, 403].includes(response.status) ? "PROFILE_ACCESS" : response.status === 429 ? "PROFILE_BUSY" : "PROFILE_UNAVAILABLE");
  return tikhubData(await response.json());
}
async function owner(username: string, signal: AbortSignal): Promise<Owner> {
  trim(owners);
  const cached = owners.get(username);
  if (cached) return cached.value;
  const existing = ownerPending.get(username);
  if (existing) return existing;
  const pending = (async () => {
    const data = await request("app/v3/handler_user_profile", { unique_id: username }, signal);
    const user = object(data.user);
    const profile = tikhubUser(user);
    if (profile.username.toLowerCase() !== username.toLowerCase() || typeof user.uid !== "string" || !/^\d+$/.test(user.uid) || typeof user.sec_uid !== "string" || !user.sec_uid) throw new Error("PROFILE_RESPONSE");
    const value = { profile, uid: user.uid, secUid: user.sec_uid };
    owners.set(username, { value, expires: Date.now() + ttl });
    return value;
  })().finally(() => ownerPending.delete(username));
  ownerPending.set(username, pending);
  return pending;
}
export async function getTikhubProfileSection(username: string, section: Exclude<ProfileSection, "highlights">, limit: number): Promise<ProfileResult> {
  const key = `${username}:${section}`;
  const existing = pagePending.get(key);
  if (existing) { await existing; return getTikhubProfileSection(username, section, limit); }
  const run = async (): Promise<ProfileResult> => {
    const signal = AbortSignal.timeout(55_000);
    const account = await owner(username, signal);
    trim(pages);
    let cached = pages.get(key);
    let state: Pages = cached?.value ?? { items: [], more: true, minTime: "0", pageToken: "" };
    const connections = section === "followers" || section === "following";
    // Keep provider pages in memory: increasing the UI limit reuses earlier pages.
    for (let attempt = 0; state.more && state.items.length < limit && attempt < 12; attempt++) {
      const endpoint = connections ? `app/v3/fetch_user_${section === "followers" ? "follower" : "following"}_list` : section === "posts" ? "web/fetch_user_post" : "app/v3/fetch_user_repost_videos";
      const params: Record<string, string> = connections ? { user_id: account.uid, count: "20", min_time: state.minTime, page_token: state.pageToken } : section === "posts" ? { secUid: account.secUid, count: "12", cursor: "0" } : { user_id: account.uid, count: "12", offset: "0" };
      const next = normalizeTikhubPage(await request(endpoint, params, signal), username, section);
      const items = [...new Map([...state.items, ...next.items].map(item => [item.id, item])).values()];
      const advanced = next.minTime !== state.minTime || next.pageToken !== state.pageToken;
      state = { ...next, items, more: connections && next.more && advanced && items.length > state.items.length };
      cached = { value: state, expires: cached?.expires ?? Date.now() + ttl };
      pages.set(key, cached);
    }
    const items = state.items.slice(0, limit);
    return { username, section, profile: account.profile, items, limit, limited: state.items.length > limit || state.more };
  };
  const pending = run().finally(() => pagePending.delete(key));
  pagePending.set(key, pending);
  return pending;
}
