/* eslint-disable @next/next/no-img-element -- Display temporary provider URLs directly without persistent optimization caching. */
import { useCallback, useState } from "react";
import { copy } from "@/lib/copy";
import type { TikTokStory } from "@/types/tiktok-story";
import { UserProfile } from "@/components/user-profile/UserProfile";
import { StoryProgress } from "@/components/story-progress/StoryProgress";
import { useStoryPlayback } from "./useStoryPlayback";
import { StoryIcon } from "@/components/story-icons/StoryIcon";
import { StoryVolumeControl } from "./StoryVolumeControl";
import type { StoryAudio } from "./useStoryAudio";
import { StoryTouchSurface } from "./StoryTouchSurface";

type Props = { story: TikTokStory; audio: StoryAudio; index: number; count: number; previous: () => void; next: () => void; replay: () => void };
export function StoryMedia({ story, audio, index, count, previous, next, replay }: Props) {
  const [finished, setFinished] = useState(false);
  const end = useCallback(() => {
    if (index < count - 1) next();
    else setFinished(true);
  }, [index, count, next]);
  const { video: videoRef, paused, setPaused, setHeld, failed, setFailed, progress, setReady, updateVideoProgress } = useStoryPlayback(story, end, audio.volume, audio.muted);
  return <>
    {story.type === "video" ? <video
      ref={videoRef} className="story-viewer__media" src={story.videoUrl} poster={story.coverUrl}
      muted={audio.muted || audio.volume === 0} playsInline preload="metadata" aria-label={copy.progress(index + 1, count)}
      onTimeUpdate={updateVideoProgress} onEnded={end} onError={() => setFailed(true)}
      onPlaying={() => setReady(true)}
    /> : <img className="story-viewer__media" src={story.imageUrl} alt={copy.mediaAlt} referrerPolicy="no-referrer" onLoad={() => setReady(true)} onError={() => setFailed(true)} />}
    <div className="story-viewer__top">
      <StoryProgress count={count} index={index} progress={finished ? 1 : progress} />
      <div className="story-viewer__profile"><UserProfile key={story.author.avatar ?? story.author.username} author={story.author} /><span className="story-viewer__count" aria-live="polite">{copy.progress(index + 1, count)}</span></div>
    </div>
    <StoryTouchSurface previous={previous} next={next} onHoldChange={setHeld} />
    {story.views !== undefined && <p className="story-viewer__views"><StoryIcon name="eye" />{copy.storyViews(story.views)}</p>}
    {(failed || finished) && <div className="story-viewer__notice" role="status"><p>{failed ? copy.mediaError : copy.finished}</p>{finished && <button type="button" className="story-viewer__replay" onClick={replay}>{copy.replay}</button>}</div>}
    <button type="button" className={`story-viewer__play-toggle${paused ? " story-viewer__play-toggle--paused" : ""}`} disabled={finished || failed} aria-label={paused ? copy.play : copy.pause} onClick={() => setPaused(!paused)}><StoryIcon name={paused ? "play" : "pause"} /></button>
    <div className="story-viewer__controls">
      {story.type === "video" && <StoryVolumeControl audio={audio} />}
    </div>
  </>;
}
