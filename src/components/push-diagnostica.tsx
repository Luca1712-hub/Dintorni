"use client";

import { useCallback, useState } from "react";
import { ensureOneSignalInit } from "@/lib/onesignal/client-init";
import {
  assicuraLoginOnesignal,
  leggiStatoPushLocale,
  verificaRegistrazioneSuServer,
} from "@/lib/onesignal/subscription";

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

function etichettaOs(os: string | undefined): string {
  const t = (os ?? "").toLowerCase();
  if (t.includes("windows")) return "probabile PC";
  if (t.includes("mac")) return "probabile Mac";
  if (t.includes("linux") && t.includes("arm")) return "probabile telefono Android";
  if (t.includes("android")) return "telefono Android";
  return os?.trim() || "sconosciuto";
}

export function PushDiagnostica(props: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<Diagnostica | null>(null);
  const [locale, setLocale] = useState<{
    optedIn: boolean;
    hasToken: boolean;
    subscriptionId: string | null;
    suServer: boolean;
  } | null>(null);
  const [prova, setProva] = useState<string>("");
  const [err, setErr] = useState("");

  const carica = useCallback(async () => {
    setErr("");
    setLoading(true);
    setLocale(null);
    try {
      let statoLocale = {
        optedIn: false,
        hasToken: false,
        subscriptionId: null as string | null,
        suServer: false,
      };

      try {
        await ensureOneSignalInit();
        await assicuraLoginOnesignal(props.userId);
        const s = leggiStatoPushLocale();
        const v = await verificaRegistrazioneSuServer(s.subscriptionId);
        statoLocale = {
          optedIn: s.optedIn,
          hasToken: Boolean(s.token),
          subscriptionId: s.subscriptionId,
          suServer: v.localRegistered,
        };
        setLocale(statoLocale);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "OneSignal su questo browser non risponde.");
      }

      const res = await fetch("/api/push/diagnostica", { credentials: "include" });
      const json = (await res.json()) as Diagnostica & { error?: string };
      if (!res.ok) {
        setErr((prev) => prev || json.error || "Errore diagnostica");
        setInfo(null);
        return;
      }
      setInfo(json);
    } catch {
      setErr("Impossibile contattare il server.");
    } finally {
      setLoading(false);
    }
  }, [props.userId]);

  const inviaProva = useCallback(async () => {
    setErr("");
    setProva("");
    setLoading(true);
    try {
      const res = await fetch("/api/push/prova", { method: "POST", credentials: "include" });
      const json = (await res.json()) as {
        messaggio?: string | null;
        onesignalNotificationId?: string | null;
        dispositiviTarget?: number;
        inviata?: boolean;
        errore?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setErr(json.error ?? json.errore ?? "Invio prova fallito");
        return;
      }
      if (!json.inviata) {
        setErr(
          json.errore ??
            `OneSignal ha rifiutato l'invio (target: ${json.dispositiviTarget ?? 0} device).`,
        );
        return;
      }
      const id = json.onesignalNotificationId;
      setProva(
        `${json.messaggio ?? "Push inviata."}${id ? ` ID: ${id}` : ""} (target: ${json.dispositiviTarget ?? 0} device)`,
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
          Prova push
        </button>
      </div>
      {locale ? (
        <ul className="mt-2 space-y-1 text-xs text-muted">
          <li>
            <strong className="text-foreground">Questo browser ora:</strong> push{" "}
            {locale.optedIn && locale.hasToken ? "attiva" : "non attiva"}
            {locale.subscriptionId ? ` · id ${locale.subscriptionId.slice(0, 8)}…` : ""}
          </li>
          <li>
            OneSignal riconosce <strong className="text-foreground">questo</strong> telefono/PC:{" "}
            <strong className={locale.suServer ? "text-emerald-800" : "text-red-600"}>
              {locale.suServer ? "sì" : "no"}
            </strong>
          </li>
        </ul>
      ) : null}
      {info ? (
        <ul className="mt-2 space-y-1 text-xs text-muted">
          <li>
            Dispositivi sull&apos;account (totale):{" "}
            <strong className="text-foreground">{info.onesignal?.webPushAttive ?? "?"}</strong>
          </li>
          {info.onesignal?.subscriptions?.length ? (
            <li className="pt-1">
              {info.onesignal.subscriptions.map((s, i) => (
                <span key={s.id ?? i} className="block pl-2 text-foreground">
                  · {etichettaOs(s.device_os)} — {s.device_os ?? "?"}
                </span>
              ))}
            </li>
          ) : null}
        </ul>
      ) : null}
      {locale && info && !locale.suServer && (info.onesignal?.webPushAttive ?? 0) >= 1 ? (
        <p className="mt-2 text-xs font-medium text-amber-900">
          L&apos;account ha un dispositivo registrato, ma <strong>non è questo browser</strong>. Di
          solito è il PC: sul telefono serve «Attiva notifiche» fino al messaggio verde (e OneSignal
          riconosce questo telefono: sì).
        </p>
      ) : null}
      {prova ? <p className="mt-2 text-xs font-medium text-emerald-800">{prova}</p> : null}
      {err ? <p className="mt-2 text-xs font-medium text-red-600">{err}</p> : null}
    </div>
  );
}
