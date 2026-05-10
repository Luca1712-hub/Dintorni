"use client";

import OneSignal from "react-onesignal";

let initPromise: Promise<void> | null = null;

export function isOnesignalClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim());
}

/**
 * Inizializza OneSignal una sola volta (importante con React Strict Mode).
 * Service worker in `/onesignal/` per non sovrascrivere `public/sw.js` usato da Web Push / VAPID.
 */
export function ensureOneSignalInit(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  if (!appId) return Promise.resolve();

  if (!initPromise) {
    initPromise = OneSignal.init({
      appId,
      serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/onesignal/" },
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    }).catch((e) => {
      initPromise = null;
      throw e;
    });
  }

  return initPromise;
}
