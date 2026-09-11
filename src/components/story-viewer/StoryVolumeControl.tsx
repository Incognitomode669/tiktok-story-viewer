import { copy } from "@/lib/copy";
import { StoryIcon } from "@/components/story-icons/StoryIcon";
import type { StoryAudio } from "./useStoryAudio";
import "./storyVolumeControl.css";
import { useState } from "react";

export function StoryVolumeControl({ audio }: { audio: StoryAudio }) {
  const [touchExpanded, setTouchExpanded] = useState(false);
  const silent = audio.muted || audio.volume === 0;
  const percent = Math.round((audio.muted ? 0 : audio.volume) * 100);
  return <div className={`story-volume${touchExpanded ? " story-volume--expanded" : ""}`} onPointerDown={(event) => setTouchExpanded(event.pointerType === "touch")} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setTouchExpanded(false); }}>
    <button type="button" className="story-volume__toggle" aria-label={silent ? copy.unmute : copy.mute} onClick={audio.toggleMute}>
      <StoryIcon name={silent ? "muted" : "volume"} />
    </button>
    <input className="story-volume__slider" type="range" min="0" max="100" step="1" value={percent} aria-orientation="vertical" aria-label={copy.volume} aria-valuetext={copy.volumePercent(percent)} onChange={(event) => audio.changeVolume(Number(event.target.value) / 100)} />
  </div>;
}

