"use client";

import OneSignal from "react-onesignal";

const SCRIPT_ID = "onesignal-sdk";
const SDK_SRC = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

let initPromise: Promise<void> | null = null;

export function isOnesignalClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim());
}

export function resetOneSignalInit(): void {
  initPromise = null;
}

export async function unregisterConflictingPushServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.filter((reg) => !reg.scope.includes("/onesignal/")).map((reg) => reg.unregister()),
  );
}

function waitForDeferredQueue(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const w = window as Window & { OneSignalDeferred?: unknown[] };
      if (Array.isArray(w.OneSignalDeferred)) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(
          new Error(
            "SDK OneSignal non risponde. Disattiva AdBlock o estensioni privacy per dintorni.vercel.app e riprova.",
          ),
        );
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

/** Carica lo script della pagina OneSignal (stesso URL usato da react-onesignal). */
function loadOneSignalPageScript(timeoutMs: number): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return waitForDeferredQueue(timeoutMs);
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(
        new Error(
          "Impossibile caricare OneSignal (cdn.onesignal.com). Controlla connessione, disattiva AdBlock per questo sito, poi F5 e riprova.",
        ),
      );
    }, timeoutMs);

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.defer = true;
    script.src = SDK_SRC;
    script.onload = () => {
      waitForDeferredQueue(Math.min(timeoutMs, 8000))
        .then(() => {
          window.clearTimeout(timer);
          resolve();
        })
        .catch((e) => {
          window.clearTimeout(timer);
          reject(e);
        });
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(
        new Error(
          "Download OneSignal bloccato. In Chrome: estensioni (AdBlock) → disattiva per dintorni.vercel.app, poi ricarica.",
        ),
      );
    };
    document.head.appendChild(script);
  });
}

/**
 * Inizializza OneSignal una sola volta. Carica prima lo script CDN con timeout esplicito
 * (evita attese infinite se AdBlock blocca cdn.onesignal.com).
 */
export function ensureOneSignalInit(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  if (!appId) return Promise.resolve();

  if (!initPromise) {
    initPromise = (async () => {
      await loadOneSignalPageScript(25_000);
      await OneSignal.init({
        appId,
        autoRegister: false,
        autoResubscribe: true,
        serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
        serviceWorkerUpdaterPath: "/onesignal/OneSignalSDKUpdaterWorker.js",
        serviceWorkerParam: { scope: "/onesignal/" },
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
      });
    })().catch((e) => {
      initPromise = null;
      throw e;
    });
  }

  return initPromise;
}

export function formatOnesignalError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; reason?: unknown; code?: unknown };
    if (typeof o.message === "string") return o.message;
    if (typeof o.reason === "string") return o.reason;
    if (o.code != null) return `Codice OneSignal: ${String(o.code)}`;
    try {
      return JSON.stringify(e);
    } catch {
      /* ignore */
    }
  }
  return "Errore sconosciuto OneSignal.";
}
