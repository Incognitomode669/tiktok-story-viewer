"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import { StoryViewer } from "@/components/story-viewer/StoryViewer";
import { StoryState } from "@/components/story-state/StoryState";
import { useStorySearch } from "./useStorySearch";
import "./tiktokStorySearch.css";
import { StoryIcon } from "@/components/story-icons/StoryIcon";
import { useStoryAudio } from "@/components/story-viewer/useStoryAudio";
import { ProfileExplorer } from "@/components/profile-explorer/ProfileExplorer";
import { ProfileExplorerEmpty } from "@/components/profile-explorer/ProfileExplorerEmpty";
import { parseUsername } from "@/lib/username";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function TikTokStorySearch() {
  const [username, setUsername] = useState("");
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const audio = useStoryAudio();
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  const { state, validation, search } = useStorySearch();
  function submit(event: FormEvent) { event.preventDefault(); setProfileUsername(parseUsername(username)); void search(username); }
  return <div className="story-search">
    <header className="story-search__header">
      <Link href="/" className="story-search__brand" aria-label={copy.brandLabel}><span className="story-search__mark"><StoryIcon name="frame" /></span>{copy.brand}<span className="story-search__brand-dot">.</span></Link>
    </header>
    <main className="story-search__main">
      <section className="story-search__intro" aria-labelledby="page-title">
        <div className="story-search__heading">
        <h1 id="page-title" className="story-search__title">{copy.title}</h1>
        <p className="story-search__description">{copy.intro}</p>
        </div>
        <form className="story-search__form" onSubmit={submit} noValidate>
          <label className="story-search__label" htmlFor="username">{copy.label}</label>
          <div className="story-search__field"><span className="story-search__at" aria-hidden="true">@</span>
            <input id="username" className="story-search__input" placeholder={copy.placeholder} value={username} disabled={!hydrated} onChange={(event) => setUsername(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(validation)} aria-describedby={validation ? "username-error" : "username-hint"} />
            <button className="story-search__submit" type="submit" disabled={!hydrated || state.status === "loading"}>{state.status === "loading" ? copy.searching : copy.submit}<StoryIcon name="arrow" /></button>
          </div>
          {validation ? <p id="username-error" className="story-search__validation" role="alert">{validation}</p> : <p id="username-hint" className="story-search__hint">{copy.searchHint}</p>}
        </form>
      </section>

      <section id="story-player" className="story-search__preview" aria-label={copy.viewerLabel} aria-busy={state.status === "loading"}>
        {state.status === "success" && state.result.stories.length > 0 ? <StoryViewer key={state.result.username} stories={state.result.stories} audio={audio} /> : <StoryState status={state.status === "success" ? "empty" : state.status} message={state.status === "error" ? state.message : undefined} onRetry={() => void search(username)} />}
        <p className="story-search__preview-label">{state.status === "success" && state.result.stories.length > 0 ? copy.storyCount(state.result.stories.length) : copy.previewLabel}</p>
        <p className="story-search__preview-hint">{state.status === "success" && state.result.stories.length > 0 ? copy.keyboardHint : copy.previewHint}</p>
      </section>
      <div className="story-search__results">{profileUsername ? <ProfileExplorer key={profileUsername} username={profileUsername} /> : <ProfileExplorerEmpty />}</div>
    </main>
    <footer className="story-search__footer"><span>{copy.brand}</span><p>{copy.footnote}</p></footer>
  </div>;
}

