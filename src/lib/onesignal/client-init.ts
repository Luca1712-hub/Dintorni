"use client";

import OneSignal from "react-onesignal";

let initPromise: Promise<void> | null = null;

export function isOnesignalClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim());
}

/** Dopo unregister dei worker, permette una nuova `OneSignal.init`. */
export function resetOneSignalInit(): void {
  initPromise = null;
}

export async function unregisterAllServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
}

/**
 * Il vecchio Web Push VAPID usa `public/sw.js` con scope `/`. Se resta attivo, OneSignal
 * non registra il worker in `/onesignal/` e la dashboard resta vuota (0 subscriptions).
 */
export async function unregisterConflictingPushServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.filter((reg) => !reg.scope.includes("/onesignal/")).map((reg) => reg.unregister()),
  );
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
      autoRegister: false,
      serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/onesignal/OneSignalSDKUpdaterWorker.js",
      serviceWorkerParam: { scope: "/onesignal/" },
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
    }).catch((e) => {
      initPromise = null;
      throw e;
    });
  }

  return initPromise;
}
