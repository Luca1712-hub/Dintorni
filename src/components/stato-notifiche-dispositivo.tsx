"use client";

import { useEffect, useState } from "react";
import { useStatoPushDispositivo, type VarianteStato } from "@/lib/use-stato-push-dispositivo";

type Props = {
  userId: string;
  email: string;
  notificheEmail: boolean;
  notifichePush: boolean;
};

function classeBanner(variante: VarianteStato): string {
  switch (variante) {
    case "ok":
      return "border-emerald-200 bg-emerald-50/90 text-emerald-950";
    case "warn":
      return "border-amber-200 bg-amber-50/90 text-amber-950";
    case "err":
      return "border-red-200 bg-red-50/90 text-red-950";
    default:
      return "border-border bg-surface-muted/80 text-foreground";
  }
}

function Banner({
  etichetta,
  variante,
  titolo,
  dettaglio,
  caricamento,
}: {
  etichetta: string;
  variante: VarianteStato;
  titolo: string;
  dettaglio?: string;
  caricamento?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 text-sm ${classeBanner(caricamento ? "neutral" : variante)}`}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{etichetta}</p>
      <p className="mt-1 font-medium">{caricamento ? "Verifica in corso…" : titolo}</p>
      {!caricamento && dettaglio ? <p className="mt-1 text-xs leading-relaxed opacity-90">{dettaglio}</p> : null}
    </div>
  );
}

export function StatoNotificheDispositivo({
  userId,
  email,
  notificheEmail,
  notifichePush,
}: Props) {
  const push = useStatoPushDispositivo(userId, notifichePush);
  const [resendOk, setResendOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/notifiche/stato", { credentials: "same-origin" });
        const json = (await res.json()) as { resendConfigurato?: boolean };
        if (!cancelled) setResendOk(Boolean(json.resendConfigurato));
      } catch {
        if (!cancelled) setResendOk(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const emailVariante: VarianteStato = !notificheEmail
    ? "warn"
    : resendOk === false
      ? "warn"
      : "ok";

  const emailTitolo = !notificheEmail
    ? "Email disattivate nel profilo"
    : "Email attivate nel profilo";

  const emailDettaglio = !notificheEmail
    ? "Attiva la casella «Email» sopra per ricevere un messaggio in casella quando arriva una chat."
    : resendOk === false
      ? `Invio a ${email} abilitato nel profilo, ma il server non è ancora configurato per l’invio (Resend).`
      : `Gli avvisi email vanno a ${email} (non sono una notifica su questo schermo: controlla la casella posta, anche spam).`;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-1">
      <Banner
        etichetta="Email · profilo account"
        variante={emailVariante}
        titolo={emailTitolo}
        dettaglio={emailDettaglio}
      />
      <Banner
        etichetta="Push · questo dispositivo"
        variante={push.variante}
        titolo={push.titolo}
        dettaglio={push.dettaglio}
        caricamento={push.caricamento}
      />
    </div>
  );
}
