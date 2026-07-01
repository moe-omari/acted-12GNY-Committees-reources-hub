"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf; // Uint8Array — works on all browsers
}

type State = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";


const STORAGE_KEY = "push-bell-state";

function readStoredState(): State {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "subscribed" || v === "unsubscribed") return v;
  } catch {}
  return "loading";
}

function saveState(s: State) {
  try {
    if (s === "subscribed" || s === "unsubscribed") {
      localStorage.setItem(STORAGE_KEY, s);
    }
  } catch {}
}

export function NotificationBell() {
  // Must start with the same value on server and client to avoid hydration mismatch.
  // localStorage is read inside useEffect (client-only) not in the initializer.
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Show last-known state from localStorage immediately (sync, < 1ms).
    // This makes the bell appear in the correct visual state before the SW
    // async check completes, avoiding any disabled / wrong-state flash.
    const stored = readStoredState();
    if (stored !== "loading") setState(stored);

    // Verify the actual push subscription in the background and correct if needed.
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        const next: State = sub ? "subscribed" : "unsubscribed";
        saveState(next);
        setState(next);
      })
      .catch(() => setState("unsupported"));
  }, []);

  async function subscribe() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await navigator.serviceWorker.register("/sw.js");
      const readyReg = await navigator.serviceWorker.ready;
      const sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      saveState("subscribed");
      setState("subscribed");
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      // Show as alert so it is visible on mobile where the inline error div may be hard to see
      alert(`Subscribe failed: ${msg}`);
      setErrorMsg(msg);
      setState(Notification.permission === "denied" ? "denied" : "unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      saveState("unsubscribed");
      setState("unsubscribed");
    } catch {
      saveState("unsubscribed");
      setState("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  // Hide completely during initial check — no disabled-button flash.
  // Once useEffect reads localStorage (<1ms) the bell appears in the correct state.
  if (state === "loading" || state === "unsupported" || state === "denied") return null;

  const isSubscribed = state === "subscribed";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      {errorMsg && (
        <div style={{ fontSize: 11, background: "#fee", color: "#c00", padding: "4px 8px", borderRadius: 6, maxWidth: 280, wordBreak: "break-word" }}>
          {errorMsg}
        </div>
      )}
      <button
        type="button"
        className={`notification-bell${isSubscribed ? " notification-bell--on" : ""}`}
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={busy}
        title={isSubscribed ? "Disable notifications" : "Enable notifications"}
        aria-label={isSubscribed ? "Disable notifications" : "Enable notifications"}
      >
      {isSubscribed ? (
        // Bell with ring (active)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
      ) : (
        // Bell outline (inactive)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      )}
    </button>
    </div>
  );
}
