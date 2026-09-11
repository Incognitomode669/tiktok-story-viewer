"use client";
import { useCallback, useState, type KeyboardEvent } from "react";
import { copy } from "@/lib/copy";
import type { TikTokStory } from "@/types/tiktok-story";
import { StoryMedia } from "./StoryMedia";
import "./storyViewer.css";
import type { StoryAudio } from "./useStoryAudio";

export function StoryViewer({ stories, audio }: { stories: TikTokStory[]; audio: StoryAudio }) {
  const [index, setIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const previous = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);
  const next = useCallback(() => setIndex((current) => Math.min(stories.length - 1, current + 1)), [stories.length]);
  function keyboard(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
  }
  const story = stories[index];
  if (!story) return null;
  return <div className="story-viewer" tabIndex={0} onKeyDown={keyboard} role="region" aria-label={copy.viewerLabel}>
    <StoryMedia key={`${index}-${story.id}-${replayKey}`} story={story} audio={audio} index={index} count={stories.length} previous={previous} next={next} replay={() => { setIndex(0); setReplayKey((value) => value + 1); }} />
  </div>;
}
