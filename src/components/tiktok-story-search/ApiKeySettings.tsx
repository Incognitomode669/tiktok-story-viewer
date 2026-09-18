"use client";
import { useRef, useState } from "react";
import "./apiKeySettings.css";

export function ApiKeySettings() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    dialog.current?.showModal(); setStatus("Checking settings…"); setError("");
    try {
      const response = await fetch("/api/settings/key", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setStatus(data.personal ? "Your personal key is active." : data.expired ? "Your key session expired. Enter your key again." : data.server ? "Using the server’s configured key." : "No API key configured yet.");
    } catch { setError("Could not load settings. Close and try again."); setStatus(""); }
  }
  async function save(remove = false) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/settings/key", { method: remove ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, ...(remove ? {} : { body: JSON.stringify({ key }) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the key.");
      setKey(""); setVisible(false); setChanged(true);
      setStatus(remove ? "Personal key removed. The server key will be used if configured." : "Key saved. It will be checked by Konbini on your next request.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update the key."); }
    finally { setBusy(false); }
  }
  function close() { if (busy) return; setKey(""); setVisible(false); dialog.current?.close(); if (changed) window.location.reload(); }
  return <>
    <button className="api-settings__trigger" type="button" onClick={() => void open()}>API settings</button>
    <dialog ref={dialog} className="api-settings" aria-labelledby="api-settings-title" onCancel={event => { event.preventDefault(); close(); }}>
      <div className="api-settings__top"><h2 id="api-settings-title">Connect your API key</h2><button type="button" aria-label="Close API settings" disabled={busy} onClick={close}>×</button></div>
      <p>Use your own KonbiniAPI account for Stories, posts, profiles, and Live.</p>
      <p className="api-settings__status" role="status">{status}</p>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <label htmlFor="konbini-key">KonbiniAPI key</label>
        <div className="api-settings__input"><input id="konbini-key" type={visible ? "text" : "password"} value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={2048} placeholder="Paste your API key" required disabled={busy} /><button type="button" onClick={() => setVisible(v => !v)} aria-pressed={visible}>{visible ? "Hide" : "Show"}</button></div>
        <p className="api-settings__hint">Saved for up to 24 hours in an encrypted, HTTP-only cookie. Your key survives refreshes and server restarts.</p>
        <a href="https://konbiniapi.com" target="_blank" rel="noreferrer">Get a key from KonbiniAPI ↗</a>
        {error && <p className="api-settings__error" role="alert">{error}</p>}
        <div className="api-settings__actions"><button type="button" disabled={busy} onClick={() => void save(true)}>Remove personal key</button><button className="api-settings__save" type="submit" disabled={busy || !key.trim()}>{busy ? "Saving…" : "Save key"}</button></div>
      </form>
      {changed && <button className="api-settings__done" type="button" onClick={close}>Done — reload to apply</button>}
    </dialog>
  </>;
}
