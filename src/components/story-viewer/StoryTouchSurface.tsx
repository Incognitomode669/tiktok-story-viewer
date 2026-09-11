import { useEffect, useRef, type PointerEvent } from "react";
import { copy } from "@/lib/copy";

type Props = { previous: () => void; next: () => void; onHoldChange: (held: boolean) => void };
export function StoryTouchSurface({ previous, next, onHoldChange }: Props) {
  const press = useRef<{ id: number; time: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const cancel = () => { press.current = null; onHoldChange(false); };
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, [onHoldChange]);

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    press.current = { id: event.pointerId, time: event.timeStamp, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    onHoldChange(true);
  }
  function release(event: PointerEvent<HTMLButtonElement>, navigate: () => void) {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    press.current = null;
    onHoldChange(false);
    const bounds = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    const tapped = event.timeStamp - start.time < 200 && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 10;
    if (inside && tapped) navigate();
  }
  function cancel() { press.current = null; onHoldChange(false); }
  return <div className="story-viewer__navigation">
    {[{ label: copy.previous, action: previous }, { label: copy.next, action: next }].map(({ label, action }) => <button key={label} type="button" className="story-viewer__tap-zone" aria-label={label}
      onPointerDown={down} onPointerUp={(event) => release(event, action)} onPointerCancel={cancel} onLostPointerCapture={cancel}
      onClick={(event) => { if (event.detail === 0) action(); }} onContextMenu={(event) => event.preventDefault()} />)}
  </div>;
}
