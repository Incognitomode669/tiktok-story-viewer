import { useEffect, useRef, useState } from "react";
import type { TikTokStory } from "@/types/tiktok-story";

export function useStoryPlayback(story: TikTokStory, onEnd: () => void, volume: number, muted: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  const elapsed = useRef(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);

  // Apply the shared audio preference before requesting playback on each new clip.
  useEffect(() => {
    if (video.current) {
      video.current.volume = volume;
      video.current.muted = muted || volume === 0;
    }
  }, [volume, muted]);

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  useEffect(() => {
    const media = video.current;
    if (!media) return;
    if (paused || held || hidden || failed) media.pause();
    else void media.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setPaused(true);
    });
  }, [paused, held, hidden, failed]);

  useEffect(() => {
    if (story.type !== "image" || !ready || paused || held || hidden || failed) return;
    const duration = Math.max(1, story.duration ?? 5) * 1_000;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      elapsed.current += now - last;
      last = now;
      setProgress(Math.min(1, elapsed.current / duration));
      if (elapsed.current >= duration) { clearInterval(timer); onEnd(); }
    }, 50);
    return () => clearInterval(timer);
  }, [story, ready, paused, held, hidden, failed, onEnd]);

  function updateVideoProgress() {
    const media = video.current;
    if (media && Number.isFinite(media.duration) && media.duration > 0) {
      setProgress(Math.min(1, media.currentTime / media.duration));
    }
  }

  return { video, paused, setPaused, setHeld, failed, setFailed, progress, setReady, updateVideoProgress };
}
