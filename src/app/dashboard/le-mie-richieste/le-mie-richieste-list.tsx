"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAllegati } from "@/lib/chat-types";
import {
  formatoZonaRichiesta,
  parseCategorieRichiesta,
  type RichiestaRow,
  type RichiestaStato,
} from "@/lib/richiesta";
import { fetchUnreadByRichiesta } from "@/lib/unread-chat";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function statoLabel(s: RichiestaStato | string | undefined): RichiestaStato {
  return s === "chiusa" ? "chiusa" : "aperta";
}

export function LeMieRichiesteList() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAcquirente, setIsAcquirente] = useState<boolean | null>(null);
  const [rows, setRows] = useState<RichiestaRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [unreadByRichiesta, setUnreadByRichiesta] = useState<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoadError("Supabase non configurato.");
      setReady(true);
      return;
    }
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/accesso");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("ruolo")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.ruolo === "negozio") {
        setIsAcquirente(false);
        setReady(true);
        return;
      }
      setIsAcquirente(true);

      const { data, error } = await supabase
        .from("richieste")
        .select("*")
        .eq("acquirente_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(
          error.message.includes("column") || error.code === "42703"
            ? "Aggiorna il database: esegui lo script `supabase/richieste_stato_e_chiusura.sql` in Supabase (colonne stato / chiusa_at)."
            : error.message,
        );
        setRows([]);
        setReady(true);
        return;
      }

      setRows((data ?? []) as RichiestaRow[]);
      setLoadError("");
      const unreadMap = await fetchUnreadByRichiesta(supabase);
      setUnreadByRichiesta(unreadMap);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Errore di caricamento.");
      setRows([]);
    } finally {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const aggiornaNonLetti = useCallback(async () => {
    if (!isSupabaseConfigured() || rows.length === 0) return;
    const supabase = createBrowserSupabaseClient();
    const map = await fetchUnreadByRichiesta(supabase);
    setUnreadByRichiesta(map);
  }, [rows.length]);

  useEffect(() => {
    if (rows.length === 0) return;
    const t = setInterval(() => {
      void aggiornaNonLetti();
    }, 20000);
    return () => clearInterval(t);
  }, [rows.length, aggiornaNonLetti]);

  const chiudiRichiesta = async (id: string) => {
    setActionError("");
    setClosingId(id);
    try {
      const supabase = createBrowserSupabaseClient();
      const chiusaAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("richieste")
        .update({ stato: "chiusa", chiusa_at: chiusaAt })
        .eq("id", id)
        .eq("stato", "aperta")
        .select("id");

      if (error) {
        setActionError(
          error.message.includes("allow_close") || error.message.includes("chiusa")
            ? error.message
            : "Impossibile chiudere. Verifica di aver eseguito lo script SQL aggiornato (trigger e policy UPDATE).",
        );
        return;
      }

      if (!data?.length) {
        setActionError("Questa richiesta risulta gia` chiusa o non e` piu` disponibile.");
        await load();
        return;
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, stato: "chiusa" as const, chiusa_at: chiusaAt }
            : r,
        ),
      );
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setClosingId(null);
    }
  };

  if (!ready) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-muted">Caricamento…</p>
      </div>
    );
  }

  if (isAcquirente === false) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Le mie richieste</h1>
        <p className="mt-2 text-muted">
          Questa sezione e` riservata agli acquirenti. Il tuo account e` registrato come negozio.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
        >
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-red-900">Le mie richieste</h1>
        <p className="mt-2 text-sm text-red-800">{loadError}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg border border-border bg-surface px-4 py-2 font-semibold text-muted hover:bg-surface-muted"
        >
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-muted">Non hai ancora inviato richieste.</p>
          <Link
            href="/dashboard/nuova-richiesta"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
          >
            Crea la prima richiesta
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const stato = statoLabel(r.stato);
            const cats = parseCategorieRichiesta(r.categorie);
            const fotoRichiesta = parseAllegati(r.allegati);
            const aperta = stato === "aperta";
            const nonLetti = unreadByRichiesta.get(r.id) ?? 0;

            return (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span
                      className={
                        aperta
                          ? "inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
                          : "inline-block rounded-full bg-accent/40 px-2.5 py-0.5 text-xs font-semibold text-muted"
                      }
                    >
                      {aperta ? "Aperta" : "Chiusa"}
                    </span>
                    <p className="mt-2 text-xs text-subtle">
                      Creata il{" "}
                      {new Date(r.created_at).toLocaleString("it-IT", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {!aperta && r.chiusa_at ? (
                        <>
                          {" "}
                          · Chiusa il{" "}
                          {new Date(r.chiusa_at).toLocaleString("it-IT", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </>
                      ) : null}
                    </p>
                  </div>
                  {aperta ? (
                    <button
                      type="button"
                      disabled={closingId === r.id}
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          !window.confirm(
                            "Chiudere questa richiesta? Non potrai riaprirla da qui.",
                          )
                        ) {
                          return;
                        }
                        void chiudiRichiesta(r.id);
                      }}
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
                    >
                      {closingId === r.id ? "Chiusura…" : "Chiudi richiesta"}
                    </button>
                  ) : null}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-foreground">{r.testo}</p>
                {fotoRichiesta.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fotoRichiesta.map((img) => (
                      <a
                        key={img.url}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.name ?? "Foto"}
                          className="h-16 w-16 rounded-md border border-border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}

                <dl className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground">Zona</dt>
                    <dd>{formatoZonaRichiesta(r)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Categorie</dt>
                    <dd>{cats.length ? cats.join(", ") : "—"}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <Link
                    href={`/dashboard/le-mie-richieste/${r.id}/chat`}
                    className="inline-flex items-center gap-2 rounded-lg border border-accent/45 bg-accent/20 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-accent/30"
                  >
                    <span>Apri chat</span>
                    {nonLetti > 0 ? (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                        {nonLetti > 99 ? "99+" : nonLetti}
                      </span>
                    ) : null}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
