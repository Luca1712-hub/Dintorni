"use client";

import { useCallback, useEffect, useState } from "react";
import { isOnesignalClientConfigured } from "@/lib/onesignal/client-init";
import {
  assicuraLoginOnesignal,
  leggiStatoPushLocale,
  registrazioneLocaleCompleta,
  verificaRegistrazioneSuServer,
} from "@/lib/onesignal/subscription";
import {
  etichettaPermessoNotifiche,
  istruzioniPermessoNotifiche,
  permessoNotificheAttuale,
} from "@/lib/notification-permission";
import { isMobileDevice } from "@/lib/device";

export type VarianteStato = "ok" | "warn" | "err" | "neutral";

export type StatoPushDispositivo = {
  caricamento: boolean;
  variante: VarianteStato;
  titolo: string;
  dettaglio?: string;
};

const EVENTO_AGGIORNA = "dintorni:push-stato-change";

export function notificaAggiornamentoStatoPush(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENTO_AGGIORNA));
  }
}

export function useStatoPushDispositivo(
  userId: string,
  preferenzaProfiloAttiva: boolean,
): StatoPushDispositivo {
  const [stato, setStato] = useState<StatoPushDispositivo>({
    caricamento: true,
    variante: "neutral",
    titolo: "Verifica push su questo dispositivo…",
  });

  const aggiorna = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!preferenzaProfiloAttiva) {
      setStato({
        caricamento: false,
        variante: "warn",
        titolo: "Push non attive su questo dispositivo",
        dettaglio:
          "Hai disattivato «Notifiche push» nel profilo. Attivala sopra se vuoi ricevere avvisi qui.",
      });
      return;
    }

    const permesso = permessoNotificheAttuale();
    if (permesso === "unsupported") {
      setStato({
        caricamento: false,
        variante: "err",
        titolo: "Push non supportate da questo browser",
        dettaglio: isMobileDevice()
          ? "Su telefono usa Chrome (non l’anteprima dentro altre app). Su PC: Chrome o Edge."
          : "Prova Chrome o Edge.",
      });
      return;
    }

    if (!isOnesignalClientConfigured()) {
      setStato({
        caricamento: false,
        variante: "warn",
        titolo: "Push non configurate sul sito",
        dettaglio: "OneSignal non è attivo in questo ambiente.",
      });
      return;
    }

    if (permesso === "denied") {
      setStato({
        caricamento: false,
        variante: "err",
        titolo: "Push bloccate su questo dispositivo",
        dettaglio: istruzioniPermessoNotifiche(),
      });
      return;
    }

    try {
      const { ensureOneSignalInit } = await import("@/lib/onesignal/client-init");
      await ensureOneSignalInit();
      await assicuraLoginOnesignal(userId);
      const locale = leggiStatoPushLocale();
      const permessoLabel = etichettaPermessoNotifiche(permesso);

      if (!registrazioneLocaleCompleta(locale)) {
        setStato({
          caricamento: false,
          variante: "warn",
          titolo: "Push non attive su questo dispositivo",
          dettaglio:
            permesso === "default"
              ? `Permesso browser: ${permessoLabel}. Premi «Attiva notifiche su questo dispositivo» qui sotto.`
              : `Permesso: ${permessoLabel}, ma la registrazione non è completa. Premi «Attiva notifiche su questo dispositivo».`,
        });
        return;
      }

      const v = await verificaRegistrazioneSuServer(locale.subscriptionId);
      if (!v.localRegistered) {
        setStato({
          caricamento: false,
          variante: "warn",
          titolo: "Registrazione push in corso o incompleta",
          dettaglio:
            "Questo dispositivo non risulta ancora su OneSignal. Attendi un minuto e premi di nuovo «Attiva notifiche», oppure ricarica la pagina.",
        });
        return;
      }

      setStato({
        caricamento: false,
        variante: "ok",
        titolo: "Push attive su questo dispositivo",
        dettaglio: `Permesso browser: ${permessoLabel}. Riceverai gli avvisi qui quando arriva un messaggio in chat.`,
      });
    } catch {
      setStato({
        caricamento: false,
        variante: "warn",
        titolo: "Impossibile verificare la push su questo dispositivo",
        dettaglio: "Ricarica la pagina e, se serve, premi di nuovo «Attiva notifiche su questo dispositivo».",
      });
    }
  }, [userId, preferenzaProfiloAttiva]);

  useEffect(() => {
    void aggiorna();
    const onVis = () => {
      if (document.visibilityState === "visible") void aggiorna();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(EVENTO_AGGIORNA, aggiorna);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(EVENTO_AGGIORNA, aggiorna);
    };
  }, [aggiorna]);

  return stato;
}
