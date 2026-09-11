"use client";
import { StoryState } from "@/components/story-state/StoryState";
import { copy } from "@/lib/copy";
import "@/components/tiktok-story-search/tiktokStorySearch.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="story-search"><div className="story-search__main"><h1>{copy.title}</h1><div className="story-search__preview"><StoryState status="error" message={copy.errors.PROVIDER_ERROR} onRetry={reset} /></div></div></main>;
}
