"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAllegati } from "@/lib/chat-types";
import {
  formatoZonaRichiesta,
  parseCategorieRichiesta,
  type RichiestaRow,
} from "@/lib/richiesta";
import { fetchUnreadByRichiesta } from "@/lib/unread-chat";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function RichiesteNegozioList() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isNegozio, setIsNegozio] = useState<boolean | null>(null);
  const [nomeNegozio, setNomeNegozio] = useState<string | null>(null);
  const [categorieNegozio, setCategorieNegozio] = useState<string[]>([]);
  const [rows, setRows] = useState<RichiestaRow[]>([]);
  const [loadError, setLoadError] = useState("");
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
        .select("ruolo, nome_negozio, categorie_merceologiche")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.ruolo !== "negozio") {
        setIsNegozio(false);
        setReady(true);
        return;
      }

      setIsNegozio(true);
      setNomeNegozio(
        typeof profile.nome_negozio === "string" ? profile.nome_negozio : null,
      );
      setCategorieNegozio(
        parseCategorieRichiesta(profile.categorie_merceologiche),
      );

      const { data, error } = await supabase
        .from("richieste")
        .select("*")
        .eq("stato", "aperta")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(
          error.code === "42501" || error.message.toLowerCase().includes("policy")
            ? "Permessi mancanti: esegui in Supabase lo SQL per le policy negozio (es. `supabase/negozio_geo_filtri_e_chat_chiusa.sql` o `supabase/richieste_negozio_select.sql`)."
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

  if (!ready) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-muted">Caricamento…</p>
      </div>
    );
  }

  if (isNegozio === false) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Richieste in arrivo</h1>
        <p className="mt-2 text-muted">
          Questa sezione e` dedicata ai negozi. Il tuo account e` registrato come acquirente.
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
        <h1 className="text-2xl font-bold text-red-900">Richieste in arrivo</h1>
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
      <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
        <p className="font-medium text-foreground">Come funziona il filtro (MVP)</p>
        <p className="mt-1">
          Vedi solo richieste ancora <strong>aperte</strong> che hanno{" "}
          <strong>almeno una categoria merceologica in comune</strong> con il tuo negozio
          {nomeNegozio ? (
            <>
              {" "}
              (<strong>{nomeNegozio}</strong>)
            </>
          ) : null}
          , e in cui la zona coincide con il tuo profilo: per richieste <strong>senza GPS</strong> la
          sede del negozio deve essere in uno dei comuni scelti dall&apos;acquirente, oppure in{" "}
          <strong>qualsiasi comune della provincia</strong> se ha scelto &quot;tutta la provincia&quot;;
          per richieste <strong>GPS</strong> la sede deve rientrare nel raggio indicato.
        </p>
        {categorieNegozio.length === 0 ? (
          <p className="mt-2 font-medium text-amber-800">
            Non hai categorie sul profilo: aggiornale in area personale (o in registrazione) per ricevere
            richieste qui.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Categorie del tuo negozio: {categorieNegozio.join(", ")}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-muted">
            Nessuna richiesta aperta compatibile con le tue categorie in questo momento.
          </p>
          <Link
            href="/area-personale"
            className="mt-4 inline-block text-sm font-semibold text-primary underline"
          >
            Controlla categorie e profilo negozio
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const cats = parseCategorieRichiesta(r.categorie);
            const fotoRichiesta = parseAllegati(r.allegati);
            const nonLetti = unreadByRichiesta.get(r.id) ?? 0;
            return (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <p className="text-xs text-subtle">
                  Ricevuta il{" "}
                  {new Date(r.created_at).toLocaleString("it-IT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-foreground">{r.testo}</p>
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
                    <dt className="font-medium text-foreground">Zona indicata</dt>
                    <dd>{formatoZonaRichiesta(r)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Categorie richiesta</dt>
                    <dd>{cats.length ? cats.join(", ") : "—"}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <Link
                    href={`/dashboard/richieste-in-arrivo/${r.id}/chat`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                  >
                    <span>Rispondi in chat</span>
                    {nonLetti > 0 ? (
                      <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-bold text-foreground">
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
