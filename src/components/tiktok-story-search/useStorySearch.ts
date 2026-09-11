"use client";
import { useEffect, useRef, useState } from "react";
import { lookupStories } from "@/lib/api";
import { parseUsername } from "@/lib/username";
import { copy } from "@/lib/copy";
import type { TikTokStoryResult } from "@/types/tiktok-story";

type SearchState = { status: "idle" | "loading" } | { status: "error"; message: string } | { status: "success"; result: TikTokStoryResult };
export function useStorySearch() {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [validation, setValidation] = useState<string>();
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  async function search(input: string) {
    current.current?.abort();
    const username = parseUsername(input);
    if (!username) { setValidation(copy.errors.INVALID_USERNAME); setState({ status: "idle" }); return; }
    setValidation(undefined);
    const controller = new AbortController();
    current.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 65_000);
    setState({ status: "loading" });
    try {
      const response = await lookupStories(username, controller.signal);
      if (current.current !== controller || controller.signal.aborted) return;
      setState(response.success ? { status: "success", result: response } : { status: "error", message: copy.errors[response.error.code] ?? copy.errors.PROVIDER_ERROR });
    } catch {
      if (current.current !== controller) return;
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      setState({ status: "error", message: controller.signal.reason === "timeout" ? copy.errors.TIMEOUT : copy.errors.NETWORK_ERROR });
    } finally { clearTimeout(timeout); }
  }
  return { state, validation, search };
}
