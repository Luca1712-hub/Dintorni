"use client";

import { useCallback, useState } from "react";

type Diagnostica = {
  onesignalConfigurato: boolean;
  subscriptionVapidInDb: number;
  onesignal?: {
    webPushAttive: number;
    androidWebPushAttive: number;
    subscriptions: Array<{ id?: string; type?: string; device_os?: string }>;
  } | null;
  nota?: string;
};

export function PushDiagnostica() {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<Diagnostica | null>(null);
  const [prova, setProva] = useState<string>("");
  const [err, setErr] = useState("");

  const carica = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/push/diagnostica", { credentials: "include" });
      const json = (await res.json()) as Diagnostica & { error?: string };
      if (!res.ok) {
        setErr(json.error ?? "Errore diagnostica");
        setInfo(null);
        return;
      }
      setInfo(json);
    } catch {
      setErr("Impossibile contattare il server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const inviaProva = useCallback(async () => {
    setErr("");
    setProva("");
    setLoading(true);
    try {
      const res = await fetch("/api/push/prova", { method: "POST", credentials: "include" });
      const json = (await res.json()) as {
        messaggio?: string;
        onesignalNotificationId?: string | null;
        dispositiviTarget?: number;
        inviata?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setErr(json.error ?? "Invio prova fallito");
        return;
      }
      const id = json.onesignalNotificationId;
      setProva(
        `${json.messaggio ?? ""}${id ? ` ID OneSignal: ${id}` : ""} (target: ${json.dispositiviTarget ?? 0} device)`,
      );
    } catch {
      setErr("Invio prova fallito.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-3">
      <p className="text-xs font-medium text-foreground">Diagnostica push (chat)</p>
      <p className="mt-1 text-xs text-muted">
        Il pannello OneSignal spesso <strong className="text-foreground">non mostra</strong> la cronologia
        degli invii dalla web app (API). Qui verifichi lo stesso canale usato dalla chat.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void carica()}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
        >
          {loading ? "…" : "Aggiorna stato"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void inviaProva()}
          className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Prova push (come la chat)
        </button>
      </div>
      {info ? (
        <ul className="mt-2 space-y-1 text-xs text-muted">
          <li>
            OneSignal su server:{" "}
            <strong className="text-foreground">{info.onesignalConfigurato ? "sì" : "no"}</strong>
          </li>
          <li>
            Dispositivi web su OneSignal:{" "}
            <strong className="text-foreground">{info.onesignal?.webPushAttive ?? "?"}</strong>
            {info.onesignal?.androidWebPushAttive != null ? (
              <> (Android: {info.onesignal.androidWebPushAttive})</>
            ) : null}
          </li>
          <li>
            Vecchie subscription VAPID in DB:{" "}
            <strong className="text-foreground">{info.subscriptionVapidInDb}</strong>
            {info.subscriptionVapidInDb > 0 ? " — invii senza cronologia OneSignal" : ""}
          </li>
        </ul>
      ) : null}
      {prova ? <p className="mt-2 text-xs font-medium text-emerald-800">{prova}</p> : null}
      {err ? <p className="mt-2 text-xs font-medium text-red-600">{err}</p> : null}
      {info?.nota ? <p className="mt-2 text-[11px] text-muted">{info.nota}</p> : null}
    </div>
  );
}
