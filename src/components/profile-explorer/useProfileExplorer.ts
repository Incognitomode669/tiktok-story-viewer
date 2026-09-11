import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import type { ProfileResult, ProfileSection, ProfileSummary } from "@/types/tiktok-profile";

type State = { status: "idle" | "loading" } | { status: "error"; message: string } | { status: "success"; result: ProfileResult };
export function useProfileExplorer(username: string) {
  const [section, setSection] = useState<ProfileSection>("posts");
  const [highlightId, setHighlightId] = useState<string>();
  const [summary, setSummary] = useState<ProfileSummary>();
  const [state, setState] = useState<State>({ status: "idle" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string>();
  const current = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, { result: ProfileResult; expires: number }>());
  useEffect(() => () => current.current?.abort(), []);
  async function load(next: ProfileSection, collection?: string, limit = 12) {
    const previous = limit > 12 && next === section && state.status === "success" ? state.result : undefined;
    current.current?.abort();
    setMoreError(undefined); setLoadingMore(Boolean(previous));
    setSection(next); setHighlightId(collection);
    const key = `${next}:${collection ?? ""}`;
    const saved = cache.current.get(key);
    if (saved && saved.expires > Date.now() && (saved.result.limit ?? 12) >= limit) { setState({ status: "success", result: saved.result }); setLoadingMore(false); return; }
    const controller = new AbortController();
    current.current = controller;
    if (!previous) setState({ status: "loading" });
    const timer = setTimeout(() => controller.abort("timeout"), 65_000);
    try {
      const response = await fetch("/api/tiktok/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, section: next, highlightId: collection, limit }), signal: controller.signal });
      const data = await response.json();
      if (current.current !== controller || controller.signal.aborted) return;
      if (!response.ok || !data.success) {
        const message = copy.profile.errors[data.code as keyof typeof copy.profile.errors] ?? copy.profile.errors.PROFILE_UNAVAILABLE;
        if (previous) setMoreError(message); else setState({ status: "error", message }); return;
      }
      if (previous) {
        const merged = [...new Map([...previous.items, ...data.items].map(item => [item.id, item])).values()];
        if (merged.length === previous.items.length) data.limited = false;
        data.items = merged;
      }
      data.limit = limit;
      cache.current.set(key, { result: data, expires: Date.now() + 240_000 });
      if (data.profile) setSummary(data.profile);
      setState({ status: "success", result: data });
    } catch {
      if (current.current === controller && (!controller.signal.aborted || controller.signal.reason === "timeout")) {
        if (previous) setMoreError(copy.profile.errors.PROFILE_UNAVAILABLE);
        else setState({ status: "error", message: copy.profile.errors.PROFILE_UNAVAILABLE });
      }
    } finally { clearTimeout(timer); if (current.current === controller) setLoadingMore(false); }
  }
  return { section, highlightId, summary, state, load, loadingMore, moreError };
}
