import { useState } from "react";
import { copy } from "@/lib/copy";
import type { ProfileItem } from "@/types/tiktok-profile";

export function ProfilePlayback({ item }: { item: ProfileItem }) {
  const [failed, setFailed] = useState(false);
  if (failed || !item.video) return <p className="profile-explorer__playback-error" role="status">{copy.profile.playbackError}</p>;
  return <video className="profile-explorer__player" controls autoPlay playsInline src={item.video} poster={item.cover} onError={() => setFailed(true)} />;
}
