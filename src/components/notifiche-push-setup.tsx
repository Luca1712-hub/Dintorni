"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { urlBase64ToVapidKeyBuffer } from "@/lib/push-client";

type Stato = "idle" | "loading" | "ok" | "err" | "non_supportato" | "no_key";

export function NotifichePushSetup(props: { abilitato: boolean }) {
  const [stato, setStato] = useState<Stato>("idle");
  const [messaggio, setMessaggio] = useState("");

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStato("non_supportato");
    }
  }, []);

  const registra = useCallback(async () => {
    setMessaggio("");
    if (!props.abilitato) {
      setMessaggio("Attiva prima «Notifiche push» nella sezione sotto.");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStato("err");
        setMessaggio("Devi essere connesso.");
        return;
      }

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "user_id,endpoint" },
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
  }, [props.abilitato, vapidPublic]);

  const disattiva = useCallback(async () => {
    setMessaggio("");
    setStato("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const json = sub.toJSON();
        if (json.endpoint && user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
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
  }, []);

  if (stato === "non_supportato") {
    return (
      <p className="text-sm text-muted">
        Il browser non supporta le notifiche push (prova Chrome o Edge su desktop, o aggiorna il sistema).
      </p>
    );
  }

  if (stato === "no_key" || !vapidPublic) {
    return (
      <p className="text-sm text-amber-800">
        Manca <code className="rounded bg-amber-50 px-1">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> nel file{" "}
        <code className="rounded bg-amber-50 px-1">.env.local</code> (vedi{" "}
        <code className="rounded bg-amber-50 px-1">.env.example</code>
        ). Riavvia il server dopo averla aggiunta.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void registra()}
          disabled={stato === "loading" || !props.abilitato}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {stato === "loading" ? "Attendere…" : "Attiva notifiche su questo dispositivo"}
        </button>
        <button
          type="button"
          onClick={() => void disattiva()}
          disabled={stato === "loading"}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
        >
          Disattiva su questo dispositivo
        </button>
      </div>
      {stato === "ok" ? (
        <p className="text-sm font-medium text-emerald-800">{messaggio}</p>
      ) : messaggio ? (
        <p className="text-sm text-muted">{messaggio}</p>
      ) : null}
    </div>
  );
}
