"use client";

import { useCallback, useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  ensureOneSignalInit,
  formatOnesignalError,
  isOnesignalClientConfigured,
  resetOneSignalInit,
} from "@/lib/onesignal/client-init";
import { urlBase64ToVapidKeyBuffer } from "@/lib/push-client";
import { withTimeout } from "@/lib/with-timeout";

type Stato = "idle" | "loading" | "ok" | "err" | "non_supportato" | "no_key";

export function NotifichePushSetup(props: { abilitato: boolean; userId: string }) {
  const [stato, setStato] = useState<Stato>("idle");
  const [messaggio, setMessaggio] = useState("");

  const onesignalMode = isOnesignalClientConfigured();
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setStato("non_supportato");
      return;
    }
    if (onesignalMode) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStato("non_supportato");
    }
  }, [onesignalMode]);

  const registraOnesignal = useCallback(async () => {
    setMessaggio("");
    if (!props.abilitato) {
      setMessaggio("Attiva prima la casella «Notifiche push» sopra, poi premi di nuovo questo pulsante.");
      return;
    }
    if (!("Notification" in window)) {
      setStato("non_supportato");
      return;
    }

    setStato("loading");
    setMessaggio("Avvio OneSignal…");

    try {
      try {
        await withTimeout(ensureOneSignalInit(), 20_000, "Inizializzazione OneSignal");
      } catch (e) {
        resetOneSignalInit();
        throw e;
      }

      setMessaggio("Collegamento al tuo account…");
      try {
        await withTimeout(OneSignal.login(props.userId), 12_000, "Collegamento account");
      } catch {
        // Il bridge in layout può aver già fatto login; continuiamo.
      }

      setMessaggio("Il browser ti chiederà il permesso: scegli «Consenti».");
      const permesso = await withTimeout(
        (async () => {
          const p = await Notification.requestPermission();
          return p === "granted";
        })(),
        120_000,
        "Permesso notifiche",
      );

      if (!permesso) {
        setStato("err");
        setMessaggio(
          "Permesso negato o bloccato. In Chrome: icona lucchetto nella barra indirizzi → Notifiche → Consenti, poi riprova.",
        );
        return;
      }

      setMessaggio("Registrazione dispositivo…");
      await withTimeout(OneSignal.User.PushSubscription.optIn(), 25_000, "Registrazione push");

      const regs = await withTimeout(navigator.serviceWorker.getRegistrations(), 8_000, "Service worker");
      const onesignalReg = regs.some((r) => r.scope.includes("/onesignal"));
      if (!onesignalReg) {
        setStato("err");
        setMessaggio(
          "Worker OneSignal non trovato. Ricarica la pagina (F5), attendi qualche secondo, poi premi di nuovo «Attiva notifiche».",
        );
        return;
      }

      setStato("ok");
      setMessaggio("Notifiche push attive su questo dispositivo.");
    } catch (e) {
      setStato("err");
      setMessaggio(formatOnesignalError(e));
    }
  }, [props.abilitato, props.userId]);

  const disattivaOnesignal = useCallback(async () => {
    setMessaggio("");
    setStato("loading");
    setMessaggio("Disattivazione…");
    try {
      await withTimeout(ensureOneSignalInit(), 15_000, "OneSignal");
      await withTimeout(OneSignal.User.PushSubscription.optOut(), 15_000, "Disattivazione");
      setStato("idle");
      setMessaggio("Push disattivato su questo dispositivo.");
    } catch (e) {
      setStato("err");
      setMessaggio(formatOnesignalError(e));
    }
  }, []);

  const registraVapid = useCallback(async () => {
    setMessaggio("");
    if (!props.abilitato) {
      setMessaggio("Attiva prima la casella «Notifiche push» sopra.");
      return;
    }
    if (!vapidPublic) {
      setStato("no_key");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStato("non_supportato");
      return;
    }

    setStato("loading");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await reg.update();

      const permesso = await Notification.requestPermission();
      if (permesso !== "granted") {
        setStato("err");
        setMessaggio("Permesso notifiche negato dal browser.");
        return;
      }

      const esistente = await reg.pushManager.getSubscription();
      if (esistente) {
        await esistente.unsubscribe();
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToVapidKeyBuffer(vapidPublic),
      });

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Subscription incompleta");
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await withTimeout(
        Promise.resolve(
          supabase.from("push_subscriptions").upsert(
            {
              user_id: props.userId,
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            },
            { onConflict: "user_id,endpoint" },
          ),
        ),
        15_000,
        "Salvataggio subscription",
      );

      if (error) {
        throw new Error(error.message);
      }

      setStato("ok");
      setMessaggio("Notifiche push attive su questo dispositivo.");
    } catch (e) {
      setStato("err");
      setMessaggio(e instanceof Error ? e.message : "Errore durante la registrazione.");
    }
  }, [props.abilitato, props.userId, vapidPublic]);

  const disattivaVapid = useCallback(async () => {
    setMessaggio("");
    setStato("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        if (json.endpoint) {
          const supabase = createBrowserSupabaseClient();
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", props.userId)
            .eq("endpoint", json.endpoint);
        }
        await sub.unsubscribe();
      }
      setStato("idle");
      setMessaggio("Push disattivato su questo dispositivo.");
    } catch (e) {
      setStato("err");
      setMessaggio(e instanceof Error ? e.message : "Errore.");
    }
  }, [props.userId]);

  if (stato === "non_supportato") {
    return (
      <p className="text-sm text-muted">
        Il browser non supporta le notifiche push (prova Chrome o Edge su desktop).
      </p>
    );
  }

  if (onesignalMode) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted">
          Servizio <strong className="text-foreground">OneSignal</strong>. Usa Chrome o Edge su desktop per
          risultati migliori.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void registraOnesignal()}
            disabled={stato === "loading" || !props.abilitato}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {stato === "loading" ? "Attendere…" : "Attiva notifiche su questo dispositivo"}
          </button>
          <button
            type="button"
            onClick={() => void disattivaOnesignal()}
            disabled={stato === "loading"}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            Disattiva su questo dispositivo
          </button>
        </div>
        {stato === "ok" ? (
          <p className="text-sm font-medium text-emerald-800">{messaggio}</p>
        ) : messaggio ? (
          <p className={stato === "err" ? "text-sm font-medium text-red-600" : "text-sm text-muted"}>
            {messaggio}
          </p>
        ) : null}
      </div>
    );
  }

  if (stato === "no_key" || !vapidPublic) {
    return (
      <p className="text-sm text-amber-800">
        Configura <code className="rounded bg-amber-50 px-1">NEXT_PUBLIC_ONESIGNAL_APP_ID</code> su Vercel
        oppure le chiavi VAPID in <code className="rounded bg-amber-50 px-1">.env.local</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void registraVapid()}
          disabled={stato === "loading" || !props.abilitato}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {stato === "loading" ? "Attendere…" : "Attiva notifiche su questo dispositivo"}
        </button>
        <button
          type="button"
          onClick={() => void disattivaVapid()}
          disabled={stato === "loading"}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
        >
          Disattiva su questo dispositivo
        </button>
      </div>
      {stato === "ok" ? (
        <p className="text-sm font-medium text-emerald-800">{messaggio}</p>
      ) : messaggio ? (
        <p className={stato === "err" ? "text-sm font-medium text-red-600" : "text-sm text-muted"}>
          {messaggio}
        </p>
      ) : null}
        </div>
  );
}

