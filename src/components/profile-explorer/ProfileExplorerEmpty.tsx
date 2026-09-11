import { copy } from "@/lib/copy";
import { profileSections } from "@/types/tiktok-profile";
import "./profileExplorer.css";

export function ProfileExplorerEmpty() {
  return <section className="profile-explorer" aria-labelledby="profile-heading">
    <div className="profile-explorer__header">
      <div><h2 id="profile-heading" className="profile-explorer__heading">{copy.profile.heading}</h2><p className="profile-explorer__bio">{copy.profile.beforeSearch}</p></div>
      <dl className="profile-explorer__stats">{(["followers", "following", "posts", "likes"] as const).map(key => <div key={key}><dt>{key === "likes" ? copy.profile.likes : key === "posts" ? copy.profile.posts : copy.profile.sections[key]}</dt><dd>{copy.profile.unavailable}</dd></div>)}</dl>
    </div>
    <div className="profile-explorer__tabs" role="group" aria-label={copy.profile.heading}>
      <button type="button" className="profile-explorer__tab" disabled>{copy.profile.stories}</button>
      {profileSections.map(key => <button type="button" className="profile-explorer__tab" disabled key={key}>{copy.profile.sections[key]}</button>)}
    </div>
    <div className="profile-explorer__content"><p className="profile-explorer__state">{copy.profile.beforeSearch}</p></div>
  </section>;
}
