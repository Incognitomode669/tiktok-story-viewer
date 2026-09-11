import { useState } from "react";

export function useStoryAudio() {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  function changeVolume(value: number) {
    setVolume(Math.min(1, Math.max(0, value)));
    setMuted(false);
  }

  function toggleMute() {
    if (volume === 0) { setVolume(1); setMuted(false); }
    else setMuted((value) => !value);
  }

  return { volume, muted, changeVolume, toggleMute };
}

export type StoryAudio = ReturnType<typeof useStoryAudio>;
