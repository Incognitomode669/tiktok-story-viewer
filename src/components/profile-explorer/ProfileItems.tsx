/* eslint-disable @next/next/no-img-element -- Display ephemeral provider CDN images directly. */
import { useState } from "react";
import { copy } from "@/lib/copy";
import type { ProfileItem, ProfileSection } from "@/types/tiktok-profile";
import { ProfilePlayback } from "./ProfilePlayback";

function Preview({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img className="profile-explorer__image" src={src} alt={copy.profile.photo} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span className="profile-explorer__placeholder" aria-hidden="true">◧</span>;
}
export function ProfileItems({ items, section, collection, onCollection }: { items: ProfileItem[]; section: ProfileSection; collection: boolean; onCollection: (id: string) => void }) {
  const people = section === "followers" || section === "following";
  const [playing, setPlaying] = useState<string>();
  return <div className={`profile-explorer__grid${people ? " profile-explorer__grid--people" : ""}`}>
    {items.map(item => <article className={`profile-explorer__card${people ? " profile-explorer__card--person" : ""}`} key={item.id}>
      <div className="profile-explorer__preview">
        {playing === item.id ? <ProfilePlayback key={item.id} item={item} /> : <Preview src={people ? item.author?.avatar : item.cover} />}
      </div>
      <div className="profile-explorer__card-body">
        <p className="profile-explorer__caption">{item.title || copy.profile.untitled}</p>
        {item.author && <span className="profile-explorer__handle">@{item.author.username}</span>}
        {section === "highlights" && !collection && <button className="profile-explorer__action" onClick={() => onCollection(item.id)}>{typeof item.count === "number" ? copy.profile.collectionCount(item.count) : copy.profile.load}</button>}
        {people && item.url && <a className="profile-explorer__action" href={item.url} target="_blank" rel="noopener noreferrer">{copy.profile.open}</a>}
        {!people && (item.video || ((section === "posts" || section === "reposts" || collection) && /^\d+$/.test(item.id))) && <button type="button" className="profile-explorer__action" aria-pressed={playing === item.id} onClick={() => setPlaying(playing === item.id ? undefined : item.id)}>{playing === item.id ? copy.profile.closePlayer : copy.profile.watch}</button>}
      </div>
      {item.images && <div className="profile-explorer__photos">{item.images.map(src => <Preview key={src} src={src} />)}</div>}
    </article>)}
  </div>;
}

