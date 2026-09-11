type IconName = "play" | "pause" | "volume" | "muted" | "previous" | "next" | "arrow" | "frame" | "retry" | "eye";
export function StoryIcon({ name }: { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "play" && <path d="m9 5 11 7-11 7V5Z" />}
    {name === "eye" && <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
    {name === "pause" && <><path d="M8 5v14M16 5v14" /></>}
    {(name === "volume" || name === "muted") && <><path d="m11 5-5 4H3v6h3l5 4V5Z" />{name === "volume" ? <><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}</>}
    {name === "previous" && <path d="m14 6-6 6 6 6" />}
    {name === "next" && <path d="m10 6 6 6-6 6" />}
    {name === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === "frame" && <><rect x="5" y="2" width="14" height="20" rx="3" /><path d="m10 8 5 4-5 4V8Z" /></>}
    {name === "retry" && <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>}
  </svg>;
}
