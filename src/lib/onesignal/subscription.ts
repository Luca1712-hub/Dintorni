"use client";

import OneSignal from "react-onesignal";
import { isAndroidDevice, isMobileDevice } from "@/lib/device";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Collega l'utente Supabase (external_id) e attende conferma lato SDK. */
export async function assicuraLoginOnesignal(externalUserId: string): Promise<void> {
  await OneSignal.login(externalUserId);
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (OneSignal.User.externalId === externalUserId) return;
    await delay(300);
  }
  throw new Error(
    "Collegamento al tuo account non riuscito. Ricarica la pagina e riprova. " +
      "Se il problema resta, in OneSignal → Impostazioni verifica «Identity Verification» per external_id.",
  );
}

export type StatoPushLocale = {
  optedIn: boolean;
  token: string | null;
  subscriptionId: string | null;
  externalId: string | null;
};

export function leggiStatoPushLocale(): StatoPushLocale {
  return {
    optedIn: Boolean(OneSignal.User.PushSubscription.optedIn),
    token: OneSignal.User.PushSubscription.token ?? null,
    subscriptionId: OneSignal.User.PushSubscription.id ?? null,
    externalId: OneSignal.User.externalId ?? null,
  };
}

/**
 * Dopo optIn(), su Android il token può arrivare in ritardo.
 * Senza token la push non viene recapitata anche con permesso «consentito».
 */
export function registrazioneLocaleCompleta(stato: StatoPushLocale): boolean {
  if (!stato.optedIn || !stato.token) return false;
  if (isMobileDevice() && !stato.subscriptionId) return false;
  return true;
}

export async function attendiPushTokenOnesignal(timeoutMs?: number): Promise<StatoPushLocale> {
  const timeout = timeoutMs ?? (isMobileDevice() ? 60_000 : 35_000);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const stato = leggiStatoPushLocale();
    if (registrazioneLocaleCompleta(stato)) return stato;
    await delay(400);
  }
  return leggiStatoPushLocale();
}

/** Chiede a OneSignal (server) se questo dispositivo risulta registrato. */
export async function verificaRegistrazioneSuServer(
  localSubscriptionId: string | null,
): Promise<{
  ok: boolean;
  webPushAttive: number;
  androidWebPushAttive: number;
  localRegistered: boolean;
  errore?: string;
}> {
  const q = localSubscriptionId ? `?localId=${encodeURIComponent(localSubscriptionId)}` : "";
  const res = await fetch(`/api/push/verifica${q}`, { credentials: "include" });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    webPushAttive?: number;
    androidWebPushAttive?: number;
    localRegistered?: boolean;
  } | null;

  if (!res.ok || !json?.ok) {
    return {
      ok: false,
      webPushAttive: 0,
      androidWebPushAttive: 0,
      localRegistered: false,
      errore: json?.error ?? "Verifica server non riuscita.",
    };
  }

  return {
    ok: true,
    webPushAttive: json.webPushAttive ?? 0,
    androidWebPushAttive: json.androidWebPushAttive ?? 0,
    localRegistered: Boolean(json.localRegistered),
  };
}

export function messaggioPushNonRegistrato(stato: StatoPushLocale): string {
  if (isMobileDevice() && stato.token && !stato.subscriptionId) {
    return (
      "Registrazione sul telefono ancora in corso o bloccata. Attendi 1 minuto, ricarica la pagina e premi di nuovo «Attiva notifiche». " +
      "Usa Chrome (non anteprima WhatsApp)."
    );
  }
  if (isAndroidDevice() && stato.token && stato.subscriptionId) {
    return (
      "Il telefono sembra registrato in locale ma OneSignal non lo vede ancora. Attendi 30 secondi e premi di nuovo «Attiva notifiche», " +
      "oppure in OneSignal → Audience controlla che ci sia un dispositivo Android per il tuo account."
    );
  }
  if (!stato.token && Notification.permission === "granted") {
    return (
      "Il telefono ha consentito le notifiche ma la registrazione push non è completa. " +
      "Chiudi tutte le schede di Chrome, riapri il sito, premi «Attiva notifiche» e attendi il messaggio verde. " +
      "Controlla anche Impostazioni → App → Chrome → Notifiche."
    );
  }
  if (stato.externalId == null) {
    return "Account non collegato a OneSignal. Ricarica la pagina e riprova «Attiva notifiche».";
  }
  if (!stato.optedIn) {
    return "Push non attiva su questo dispositivo. Premi «Attiva notifiche su questo dispositivo».";
  }
  return "Registrazione push non completata. Riprova dopo aver ricaricato la pagina.";
}
