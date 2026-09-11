import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import type { ProfileItem } from "@/types/tiktok-profile";

export function ProfilePlayback({ item }: { item: ProfileItem }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.tiktok.com" || event.source !== frame.current?.contentWindow || event.data?.["x-tiktok-player"] !== true) return;
      if (event.data.type === "onPlayerError" && event.data.value?.errorCode !== 3002) setFailed(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  if (failed) return <p className="profile-explorer__playback-error" role="status">{copy.profile.playbackError}</p>;
  if (item.video) return <video className="profile-explorer__player" controls autoPlay playsInline src={item.video} poster={item.cover} onError={() => setFailed(true)} />;
  return <iframe ref={frame} className="profile-explorer__player" src={`https://www.tiktok.com/player/v1/${item.id}?autoplay=1&controls=1&description=0&music_info=0&rel=0`} title={copy.profile.playerTitle(item.title || copy.profile.untitled)} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen onError={() => setFailed(true)} />;
}
