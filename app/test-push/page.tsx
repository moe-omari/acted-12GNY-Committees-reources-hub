"use client";
import { useState } from "react";

export default function TestPushPage() {
  const [lines, setLines] = useState<string[]>([]);

  function log(msg: string) {
    setLines((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  }

  async function runTest() {
    setLines([]);
    log("--- START ---");

    // Step 1: basic support
    log(`serviceWorker: ${"serviceWorker" in navigator}`);
    log(`PushManager: ${"PushManager" in window}`);
    log(`Notification: ${"Notification" in window}`);
    log(`permission: ${Notification.permission}`);

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    log(`VAPID key: ${vapidKey ? vapidKey.slice(0, 12) + "..." : "MISSING"}`);

    if (!("serviceWorker" in navigator)) { log("STOP: no SW support"); return; }
    if (!vapidKey) { log("STOP: no VAPID key"); return; }

    // Step 2: register SW
    try {
      log("Registering SW...");
      const reg = await navigator.serviceWorker.register("/sw.js");
      log(`SW registered, scope: ${reg.scope}`);
    } catch (e) {
      log(`SW register FAILED: ${e}`);
      return;
    }

    // Step 3: wait for ready
    try {
      log("Waiting for SW ready...");
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SW ready timed out after 8s")), 8000)
        ),
      ]);
      log(`SW ready, scope: ${(readyReg as ServiceWorkerRegistration).scope}`);

      // Step 4: subscribe
      log("Calling pushManager.subscribe...");
      function urlBase64ToUint8Array(base64: string) {
        const padding = "=".repeat((4 - (base64.length % 4)) % 4);
        const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(b64);
        const buf = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
        return buf.buffer;
      }

      const sub = await (readyReg as ServiceWorkerRegistration).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      log(`Subscribed! endpoint: ${sub.endpoint.slice(0, 50)}...`);

      // Step 5: save to server
      log("Saving subscription to server...");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      log(`Server response: ${res.status}`);
      if (res.ok) {
        log("SUCCESS — you are subscribed!");
      } else {
        const text = await res.text();
        log(`Server error: ${text}`);
      }
    } catch (e) {
      log(`FAILED: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 13 }}>
      <h2 style={{ marginBottom: 12 }}>Push Subscription Test</h2>
      <button
        onClick={runTest}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          marginBottom: 16,
          cursor: "pointer",
        }}
      >
        Run Test
      </button>
      <div style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 6, whiteSpace: "pre-wrap", minHeight: 100 }}>
        {lines.length === 0 ? "Press Run Test..." : lines.join("\n")}
      </div>
    </div>
  );
}
