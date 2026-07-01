"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

type State = "unsupported" | "ios-hint" | "denied" | "subscribed" | "unsubscribed" | "loading";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function NotificationBell() {
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") { setState("unsupported"); return; }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) { setState("unsupported"); return; }

    // iOS needs the site added to Home Screen first
    if (isIOS() && !isStandalone()) {
      setState("ios-hint");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("unsupported"));
  }, []);

  async function subscribe() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return;
    setState("loading");
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
      setState("subscribed");
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setErrorMsg(msg);
      setState(Notification.permission === "denied" ? "denied" : "unsubscribed");
    }
  }

  async function unsubscribe() {
    setState("loading");
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
      setState("unsubscribed");
    } catch {
      setState("unsubscribed");
    }
  }

  if (state === "unsupported" || state === "denied") return null;

  // iOS Safari in browser: show add-to-home-screen hint instead of bell
  if (state === "ios-hint") {
    return (
      <div title="To receive notifications on iPhone, add this site to your Home Screen via the Share menu" style={{ fontSize: 11, opacity: 0.7, cursor: "default", display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span>Add to Home Screen</span>
      </div>
    );
  }

  const isSubscribed = state === "subscribed";
  const isLoading = state === "loading";

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
        disabled={isLoading}
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
