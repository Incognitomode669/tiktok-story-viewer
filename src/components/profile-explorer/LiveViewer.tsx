"use client";
import { useEffect, useRef, useState } from "react";
import type Mpegts from "mpegts.js";
import { copy } from "@/lib/copy";

type Live = { isLive: boolean; stream?: string; title?: string; viewers?: number; checkedAt: string };
function LivePlayer({ stream }: { stream: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let player: ReturnType<typeof Mpegts.createPlayer> | undefined;
    async function start() {
      try {
        const mpegts = (await import("mpegts.js")).default;
        if (disposed || !video.current) return;
        if (!mpegts.getFeatureList().mseLivePlayback) { setError(copy.live.unsupported); return; }
        player = mpegts.createPlayer({ type: "flv", isLive: true, url: stream }, { enableWorker: false, liveBufferLatencyChasing: true });
        player.on(mpegts.Events.ERROR, () => { if (!disposed) { setError(copy.live.disconnected); player?.unload(); } });
        player.attachMediaElement(video.current);
        player.load();
      } catch { if (!disposed) setError(copy.live.disconnected); }
    }
    void start();
    return () => { disposed = true; player?.destroy(); };
  }, [stream]);
  return <div className="live-viewer__screen">
    <video ref={video} controls playsInline aria-label={copy.live.player} onPlay={() => {
      document.querySelectorAll("video").forEach(other => { if (other !== video.current) other.pause(); });
    }} />
    {error && <p className="live-viewer__error" role="alert">{error}</p>}
  </div>;
}

export function LiveViewer({ username }: { username: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data?: Live; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/tiktok/live?username=${encodeURIComponent(username)}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || copy.live.failed);
        if (!controller.signal.aborted) setState({ data });
      } catch (error) { if (!controller.signal.aborted) setState({ error: error instanceof Error ? error.message : copy.live.failed }); }
    }
    void load();
    return () => controller.abort();
  }, [username, attempt]);
  const { data, error } = state;
  const loading = !data && !error;
  return <div className="live-viewer" aria-busy={loading}>
    <div className="live-viewer__heading"><strong>{copy.live.heading}</strong><button className="profile-explorer__action" disabled={loading} onClick={() => { setState({}); setAttempt(a => a + 1); }}>{copy.live.refresh}</button></div>
    {loading && <p className="profile-explorer__state" role="status">{copy.live.loading}</p>}
    {error && <p className="profile-explorer__state" role="alert">{error}</p>}
    {data && !data.isLive && <p className="profile-explorer__state" role="status">@{username} {copy.live.offline}</p>}
    {data?.isLive && data.stream && <><LivePlayer key={`${attempt}:${data.stream}`} stream={data.stream} /><p className="live-viewer__title">{data.title}</p><p className="profile-explorer__note">{copy.live.playHint}</p></>}
    {data && <p className="profile-explorer__note">{data.viewers !== undefined && `${new Intl.NumberFormat().format(data.viewers)} ${copy.live.viewers} · `}{copy.live.checked} {new Date(data.checkedAt).toLocaleTimeString()}. {copy.live.refreshHint}</p>}
  </div>;
}
