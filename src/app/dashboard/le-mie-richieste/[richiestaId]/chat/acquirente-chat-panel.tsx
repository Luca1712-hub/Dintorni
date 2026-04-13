"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseAllegati,
  type AllegatoMessaggio,
  type ConversazioneRow,
} from "@/lib/chat-types";
import { useMessaggiConversazione } from "@/lib/use-messaggi-conversazione";
import {
  fetchUnreadByConversazione,
  marcaConversazioneLetta,
  messaggioNuovoDopoSogliaUtente,
} from "@/lib/unread-chat";
import type { RichiestaStato } from "@/lib/richiesta";
import { useRichiestaStato } from "@/lib/use-richiesta-stato";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BUCKET = "messaggi-allegati";
const MAX_IMMAGINI = 6;
const MAX_MB = 5;

type Props = { richiestaId: string };

type ConvLabel = ConversazioneRow & { etichetta: string; nonLetti?: number };

export function AcquirenteChatPanel({ richiestaId }: Props) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [richiestaTesto, setRichiestaTesto] = useState<string | null>(null);
  const [conversazioni, setConversazioni] = useState<ConvLabel[]>([]);
  const [selezionata, setSelezionata] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [statoRichiestaInit, setStatoRichiestaInit] = useState<RichiestaStato | null>(null);

  const statoPoll = useRichiestaStato(richiestaId);
  const statoRichiesta = statoPoll ?? statoRichiestaInit;
  const richiestaChiusa = statoRichiesta === "chiusa";

  const { messaggi, ricarica } = useMessaggiConversazione(selezionata);

  const [testo, setTesto] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [invio, setInvio] = useState(false);
  /** Dopo «marca letto», i messaggi del negozio piu` recenti di questa data sono evidenziati come nuovi. */
  const [sogliaNovita, setSogliaNovita] = useState<string | null>(null);

  const aggiornaBadgeNonLetti = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const map = await fetchUnreadByConversazione(supabase);
    setConversazioni((prev) =>
      prev.length ? prev.map((row) => ({ ...row, nonLetti: map.get(row.id) ?? 0 })) : prev,
    );
  }, []);

  const anteprimaFiles = useMemo(
    () =>
      files.map((f) => ({
        file: f,
        url: URL.createObjectURL(f),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      anteprimaFiles.forEach((x) => URL.revokeObjectURL(x.url));
    };
  }, [anteprimaFiles]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setError("Supabase non configurato.");
          setReady(true);
        }
        return;
      }
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/accesso");
        return;
      }
      if (cancelled) return;
      setMyId(user.id);
      setStatoRichiestaInit(null);

      const { data: richiesta, error: er } = await supabase
        .from("richieste")
        .select("testo, acquirente_id, stato")
        .eq("id", richiestaId)
        .maybeSingle();

      if (cancelled) return;
      if (er || !richiesta || richiesta.acquirente_id !== user.id) {
        setError("Richiesta non trovata o non e` tua.");
        setReady(true);
        return;
      }
      setRichiestaTesto(typeof richiesta.testo === "string" ? richiesta.testo : null);
      const st = richiesta.stato;
      if (!cancelled && (st === "aperta" || st === "chiusa")) {
        setStatoRichiestaInit(st);
      }

      const { data: convs, error: cErr } = await supabase
        .from("conversazioni")
        .select("*")
        .eq("richiesta_id", richiestaId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (cErr) {
        setError(cErr.message);
        setReady(true);
        return;
      }

      const list = (convs ?? []) as ConversazioneRow[];
      const negozioIds = [...new Set(list.map((c) => c.negozio_id))];
      let labels: ConvLabel[] = list.map((c) => ({ ...c, etichetta: "Negozio" }));

      if (negozioIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome_negozio, nome")
          .in("id", negozioIds);
        if (!cancelled) {
          const map = new Map<string, string>();
          (profs ?? []).forEach(
            (p: { id: string; nome_negozio?: string | null; nome?: string | null }) => {
              const nn =
                typeof p.nome_negozio === "string" && p.nome_negozio.trim()
                  ? p.nome_negozio.trim()
                  : null;
              const nome = typeof p.nome === "string" && p.nome.trim() ? p.nome.trim() : null;
              map.set(p.id, nn ?? nome ?? "Negozio");
            },
          );
          labels = list.map((c) => ({
            ...c,
            etichetta: map.get(c.negozio_id) ?? "Negozio",
          }));
        }
      }

      if (!cancelled) {
        const unreadMap = await fetchUnreadByConversazione(supabase);
        const withUnread = labels.map((row) => ({
          ...row,
          nonLetti: unreadMap.get(row.id) ?? 0,
        }));
        setConversazioni(withUnread);
        setReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [richiestaId, router]);

  useEffect(() => {
    if (conversazioni.length === 0) return;
    setSelezionata((prev) => prev ?? conversazioni[0].id);
  }, [conversazioni]);

  useEffect(() => {
    if (conversazioni.length === 0) return;
    const t = setInterval(() => {
      void aggiornaBadgeNonLetti();
    }, 16000);
    return () => clearInterval(t);
  }, [conversazioni.length, aggiornaBadgeNonLetti]);

  useEffect(() => {
    if (!selezionata || !myId) return;
    let cancelled = false;
    setSogliaNovita(null);
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      await marcaConversazioneLetta(supabase, selezionata);
      if (cancelled) return;
      setSogliaNovita(new Date().toISOString());
      await aggiornaBadgeNonLetti();
    })();
    return () => {
      cancelled = true;
    };
  }, [selezionata, myId, aggiornaBadgeNonLetti]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi.length, selezionata]);

  const onFilePick = (list: FileList | null) => {
    if (richiestaChiusa) return;
    if (!list?.length) return;
    const next: File[] = [...files];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_MB * 1024 * 1024) continue;
      if (next.length >= MAX_IMMAGINI) break;
      next.push(f);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const rimuoviFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const invia = async () => {
    setError("");
    if (richiestaChiusa) {
      setError("La richiesta e` chiusa: non puoi inviare altri messaggi.");
      return;
    }
    if (!selezionata || !myId) return;
    const supabase = createBrowserSupabaseClient();
    const testoPulito = testo.trim();
    if (testoPulito.length === 0 && files.length === 0) {
      setError("Scrivi un messaggio oppure allega un'immagine.");
      return;
    }
    setInvio(true);
    try {
      const allegati: AllegatoMessaggio[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${myId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) {
          setError(`Caricamento immagine fallito: ${upErr.message}`);
          return;
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        allegati.push({ url: pub.publicUrl, path, name: f.name });
      }
      const { error: msgErr } = await supabase.from("messaggi").insert({
        conversazione_id: selezionata,
        mittente_id: myId,
        testo: testoPulito,
        allegati,
      });
      if (msgErr) {
        setError(msgErr.message);
        return;
      }
      setTesto("");
      setFiles([]);
      ricarica();
      void aggiornaBadgeNonLetti();
    } finally {
      setInvio(false);
    }
  };

  if (!ready && !error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-slate-700">Caricamento chat…</p>
      </div>
    );
  }

  if (error && !richiestaTesto && conversazioni.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <p className="text-sm text-red-800">{error}</p>
        <Link
          href="/dashboard/le-mie-richieste"
          className="mt-4 inline-block text-sm font-semibold text-blue-700 underline"
        >
          Torna alle richieste
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {error && ready ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {richiestaTesto ? (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">La tua richiesta</p>
          <p className="mt-1 text-sm text-slate-800">{richiestaTesto}</p>
        </div>
      ) : null}

      {richiestaChiusa ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Richiesta chiusa</p>
          <p className="mt-1">
            Non e` piu` possibile inviare messaggi in questa chat. I messaggi gia` scambiati restano visibili.
          </p>
        </div>
      ) : null}

      {conversazioni.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-600">
          Nessun negozio ha ancora aperto una chat su questa richiesta. Quando un negozio inizia la
          conversazione, la vedrai qui.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-3 py-2">
            {conversazioni.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelezionata(c.id);
                }}
                className={
                  selezionata === c.id
                    ? "inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                    : "inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100"
                }
              >
                <span>{c.etichetta}</span>
                {c.nonLetti && c.nonLetti > 0 ? (
                  <span
                    className={
                      selezionata === c.id
                        ? "rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold"
                        : "rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    }
                  >
                    {c.nonLetti > 99 ? "99+" : c.nonLetti}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="max-h-[50vh] min-h-[200px] space-y-3 overflow-y-auto px-4 py-4">
            {messaggi.length === 0 ? (
              <p className="text-center text-sm text-slate-500">Nessun messaggio in questa chat.</p>
            ) : (
              messaggi.map((m) => {
                const miei = m.mittente_id === myId;
                const imgs = parseAllegati(m.allegati);
                const nuovo = messaggioNuovoDopoSogliaUtente(m, myId, sogliaNovita);
                return (
                  <div
                    key={m.id}
                    className={`flex ${miei ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={
                        miei
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-3 py-2 text-white"
                          : nuovo
                            ? "max-w-[85%] rounded-2xl rounded-bl-md border-2 border-amber-400 bg-amber-50/90 px-3 py-2 text-slate-900 shadow-sm"
                            : "max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                      }
                    >
                      {m.testo.trim() ? (
                        <p className="whitespace-pre-wrap text-sm">{m.testo}</p>
                      ) : null}
                      {imgs.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {imgs.map((img) => (
                            <a
                              key={img.url}
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.url}
                                alt={img.name ?? "Allegato"}
                                className="max-h-40 max-w-[200px] rounded-lg border border-white/30 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <p
                        className={
                          miei
                            ? "mt-1 text-right text-[10px] text-blue-100"
                            : nuovo
                              ? "mt-1 flex items-center justify-end gap-1 text-right text-[10px] font-medium text-amber-900"
                              : "mt-1 text-right text-[10px] text-slate-500"
                        }
                      >
                        {nuovo && !miei ? (
                          <span className="rounded bg-amber-200/80 px-1 py-0.5">Nuovo</span>
                        ) : null}
                        <span>
                          {new Date(m.created_at).toLocaleString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="space-y-2 border-t border-slate-200 p-4">
            {files.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {anteprimaFiles.map((x, idx) => (
                  <div key={x.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={x.url}
                      alt=""
                      className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => rimuoviFile(idx)}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                      aria-label="Rimuovi"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              rows={3}
              disabled={richiestaChiusa}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="Scrivi un messaggio al negozio…"
            />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFilePick(e.target.files)}
              />
              <button
                type="button"
                disabled={richiestaChiusa}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Allega immagini ({files.length}/{MAX_IMMAGINI})
              </button>
              <button
                type="button"
                disabled={invio || richiestaChiusa}
                onClick={() => void invia()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {invio ? "Invio…" : "Invia"}
              </button>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
