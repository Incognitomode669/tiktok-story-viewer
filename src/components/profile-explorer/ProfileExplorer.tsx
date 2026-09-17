"use client";
import { useState } from "react";
import { LiveViewer } from "./LiveViewer";
import { copy } from "@/lib/copy";
import { profileSections } from "@/types/tiktok-profile";
import { useProfileExplorer } from "./useProfileExplorer";
import { ProfileItems } from "./ProfileItems";
import { ProfileListFooter } from "./ProfileListFooter";
import "./profileExplorer.css";

export function ProfileExplorer({ username }: { username: string }) {
  const [live, setLive] = useState(false);
  const { section, highlightId, summary, state, load, loadingMore, moreError } = useProfileExplorer(username);
  const format = (value?: number) => value === undefined ? copy.profile.unavailable : new Intl.NumberFormat("en", { notation: "compact" }).format(value);
  return <section className="profile-explorer" aria-labelledby="profile-heading">
    <div className="profile-explorer__header">
      <div><h2 id="profile-heading" className="profile-explorer__heading">{summary?.displayName ?? `@${username}`}</h2><p className="profile-explorer__bio">{summary?.bio ?? copy.profile.heading}</p></div>
      <dl className="profile-explorer__stats">{(["followers", "following", "posts", "likes"] as const).map(key => <div key={key}><dt>{key === "likes" ? copy.profile.likes : key === "posts" ? copy.profile.posts : copy.profile.sections[key]}</dt><dd>{format(summary?.[key])}</dd></div>)}</dl>
    </div>
    <div className="profile-explorer__tabs" role="group" aria-label={copy.profile.heading}>
      <a className="profile-explorer__tab" href="#story-player" onClick={() => setLive(false)}>{copy.profile.stories}</a>
      <button type="button" className={`profile-explorer__tab${live ? " profile-explorer__tab--active" : ""}`} aria-pressed={live} onClick={() => setLive(true)}>{copy.live.heading}</button>
      {profileSections.map(key => <button type="button" className={`profile-explorer__tab${!live && key === section ? " profile-explorer__tab--active" : ""}`} aria-pressed={!live && key === section} key={key} onClick={() => { setLive(false); void load(key); }}>{copy.profile.sections[key]}</button>)}
    </div>
    {live ? <LiveViewer key={username} username={username} /> : <>
    {section === "highlights" && <p className="profile-explorer__note">{copy.profile.experimental}</p>}
    {highlightId && <button className="profile-explorer__action" onClick={() => void load("highlights")}>{copy.profile.back}</button>}
    <div className="profile-explorer__content" aria-busy={state.status === "loading"}>
      {state.status === "idle" && <div className="profile-explorer__state"><p>{copy.profile.prompt}</p><button className="profile-explorer__action" onClick={() => void load(section)}>{copy.profile.load}</button></div>}
      {state.status === "loading" && <p className="profile-explorer__state" role="status">{copy.profile.loading}</p>}
      {state.status === "error" && <div className="profile-explorer__state" role="alert"><p>{state.message}</p><button className="profile-explorer__action" onClick={() => void load(section, highlightId)}>{copy.profile.retry}</button></div>}
      {state.status === "success" && (state.result.items.length ? <><ProfileItems key={`${section}:${highlightId ?? ""}`} items={state.result.items} section={section} collection={Boolean(highlightId)} onCollection={id => void load("highlights", id)} /><ProfileListFooter result={state.result} loading={loadingMore} error={moreError} onMore={() => void load(section, highlightId, Math.min(240, (state.result.limit ?? 12) + 12))} /></> : <p className="profile-explorer__state" role="status">{copy.profile.empty}</p>)}
    </div>
    </>}
  </section>;
}
