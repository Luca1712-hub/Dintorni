"use client";

import OneSignal from "react-onesignal";

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
export async function attendiPushTokenOnesignal(timeoutMs = 35_000): Promise<StatoPushLocale> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const stato = leggiStatoPushLocale();
    if (stato.optedIn && stato.token) return stato;
    await delay(400);
  }
  return leggiStatoPushLocale();
}

export function messaggioPushNonRegistrato(stato: StatoPushLocale): string {
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
