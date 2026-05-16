/** Stato permesso notifiche del browser (API Notification). */

export function permessoNotificheAttuale(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function userAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent.toLowerCase();
}

export function isBraveBrowser(): boolean {
  const nav = navigator as Navigator & { brave?: unknown };
  return Boolean(nav.brave) || userAgent().includes("brave");
}

export function isEdgeBrowser(): boolean {
  return userAgent().includes("edg/");
}

/** Istruzioni manuali se il popup non compare o il permesso è bloccato. */
export function istruzioniPermessoNotifiche(): string {
  if (isBraveBrowser()) {
    return (
      "Su Brave: 1) Clicca il leone (Shields) nella barra indirizzi → abbassa le protezioni per questo sito. " +
      "2) Clicca il lucchetto o l'icona del sito → Notifiche → Consenti. " +
      "3) Ricarica la pagina (F5) e premi di nuovo «Attiva notifiche». " +
      "Se non basta, prova con Chrome: lì le push sono più affidabili."
    );
  }
  if (isEdgeBrowser()) {
    return (
      "Su Edge: 1) Icona lucchetto o «i» a sinistra dell'indirizzo → Autorizzazioni → Notifiche = Consenti. " +
      "2) Windows: Impostazioni → Sistema → Notifiche → attiva le notifiche per Microsoft Edge. " +
      "3) Ricarica (F5) e riprova. In app integrate (Cortana, widget) il popup spesso non compare: usa Chrome o Edge a schermo intero."
    );
  }
  return (
    "Clicca il lucchetto nella barra indirizzi → Notifiche → Consenti, poi F5 e riprova. " +
    "Per il test più semplice usa Chrome o Edge."
  );
}

export function etichettaPermessoNotifiche(
  p: NotificationPermission | "unsupported",
): string {
  if (p === "granted") return "consentito";
  if (p === "denied") return "bloccato";
  if (p === "default") return "non ancora chiesto";
  return "non supportato";
}

export function messaggioAttesaPopupPermesso(): string {
  if (isBraveBrowser()) {
    return "Cerca il popup in alto a sinistra, oppure il leone (Shields) → consenti notifiche per questo sito.";
  }
  if (isEdgeBrowser()) {
    return "Dovrebbe comparire una barra sotto l'indirizzo: scegli «Consenti». Se non vedi nulla, usa le istruzioni qui sotto.";
  }
  return "Il browser ti chiederà il permesso: scegli «Consenti».";
}

/**
 * Chiede il permesso notifiche. Se il popup non compare entro timeoutMs, restituisce lo stato attuale.
 * Fa polling su Notification.permission (Brave/Edge a volte aggiornano senza risolvere la promise).
 */
export async function richiediPermessoNotifiche(
  timeoutMs = 20_000,
): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const iniziale = Notification.permission;
  if (iniziale === "granted" || iniziale === "denied") {
    return iniziale;
  }

  const richiesta = Notification.requestPermission();

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const finisci = () => {
      resolve(Notification.permission);
    };

    void richiesta.then(() => {
      if (Notification.permission !== "default") {
        finisci();
      }
    });

    const poll = () => {
      if (Notification.permission !== "default") {
        finisci();
        return;
      }
      if (Date.now() >= deadline) {
        finisci();
        return;
      }
      window.setTimeout(poll, 350);
    };
    poll();
  });
}
