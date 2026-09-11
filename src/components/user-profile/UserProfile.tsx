/* eslint-disable @next/next/no-img-element -- Ephemeral provider media must not enter the image optimization cache. */
import { useState } from "react";
import { copy } from "@/lib/copy";
import type { StoryAuthor } from "@/types/tiktok-story";
import "./userProfile.css";
export function UserProfile({ author }: { author: StoryAuthor }) {
  const [failed, setFailed] = useState(false);
  return <div className="user-profile">
    {author.avatar && !failed ? <img className="user-profile__avatar" src={author.avatar} alt={copy.avatarAlt} referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span className="user-profile__avatar user-profile__avatar--fallback" aria-hidden="true">{(author.displayName || author.username).slice(0, 1).toUpperCase()}</span>}
    <div className="user-profile__details"><p className="user-profile__name">{author.displayName}</p><p className="user-profile__handle">@{author.username}</p></div>
  </div>;
}
