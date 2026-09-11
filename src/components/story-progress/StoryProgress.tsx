import { copy } from "@/lib/copy";
import "./storyProgress.css";
export function StoryProgress({ count, index, progress }: { count: number; index: number; progress: number }) {
  return <div className="story-progress">{Array.from({ length: count }, (_, item) => <progress key={item} className="story-progress__segment" max={1} value={item < index ? 1 : item === index ? progress : 0} aria-label={copy.progress(item + 1, count)} />)}</div>;
}
