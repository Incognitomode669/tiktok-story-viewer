import { copy } from "@/lib/copy";
import "./storyState.css";
import { StoryIcon } from "@/components/story-icons/StoryIcon";
type Props = { status: "idle" | "loading" | "error" | "empty"; message?: string; onRetry?: () => void };
export function StoryState({ status, message, onRetry }: Props) {
  const loading = status === "loading";
  const title = status === "idle" ? copy.readyTitle : loading ? copy.loadingTitle : status === "empty" ? copy.emptyTitle : copy.errorTitle;
  const detail = status === "idle" ? copy.readyText : loading ? copy.loadingText : status === "empty" ? copy.emptyText : message;
  return <div className={`story-state story-state--${status}`}>
    <div className="story-state__bars" aria-hidden="true"><span /><span /><span /></div>
    <div className="story-state__content" role={status === "error" ? "alert" : "status"} aria-live="polite">
      <div className="story-state__art"><StoryIcon name={status === "error" ? "retry" : "frame"} /></div>
      {status === "idle" && <p className="story-state__tag">{copy.readyTag}</p>}
      <h2 className="story-state__title">{title}</h2><p className="story-state__detail">{detail}</p>
      {loading && <div className="story-state__skeleton" aria-hidden="true"><span /><span /></div>}
      {status === "error" && onRetry && <button type="button" className="story-state__retry" onClick={onRetry}>{copy.retry}<StoryIcon name="retry" /></button>}
    </div><div className="story-state__bottom" aria-hidden="true"><span />•<span /></div>
  </div>;
}
