"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NegozioChatInit } from "@/lib/chat-negozio-init";
import { ImageAttachButtons } from "@/components/image-attach-buttons";
import { inviaMessaggioChat } from "@/lib/chat-invio-client";
import { parseAllegati, type AllegatoMessaggio } from "@/lib/chat-types";
import { RISPOSTE_PREDEFINITE_NEGOZIO } from "@/lib/risposte-predefinite-negozio";
import { useMessaggiConversazione } from "@/lib/use-messaggi-conversazione";
import {
  marcaConversazioneLetta,
  messaggioNuovoDopoSogliaUtente,
} from "@/lib/unread-chat";
import type { RichiestaStato } from "@/lib/richiesta";
import { useRichiestaStato } from "@/lib/use-richiesta-stato";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const BUCKET = "messaggi-allegati";
const MAX_IMMAGINI = 6;
const MAX_MB = 5;

type Props = { richiestaId: string; serverInit: NegozioChatInit };

export function NegozioChatPanel({ richiestaId, serverInit }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState(serverInit.ok ? "" : serverInit.error);
  const [richiestaTesto] = useState<string | null>(
    serverInit.ok ? serverInit.richiestaTesto : null,
  );
  const [richiestaAllegati] = useState<AllegatoMessaggio[]>(
    serverInit.ok ? serverInit.richiestaAllegati : [],
  );
  const [conversazioneId] = useState<string | null>(
    serverInit.ok ? serverInit.conversazioneId : null,
  );
  const [myId] = useState<string | null>(serverInit.ok ? serverInit.myId : null);
  const [statoRichiestaInit] = useState<RichiestaStato | null>(
    serverInit.ok ? serverInit.statoRichiestaInit : null,
  );
  const statoPoll = useRichiestaStato(richiestaId);
  const statoRichiesta = statoPoll ?? statoRichiestaInit;
  const richiestaChiusa = statoRichiesta === "chiusa";

  const { messaggi, ricarica } = useMessaggiConversazione(conversazioneId);

  const [testo, setTesto] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [invio, setInvio] = useState(false);
  const [sogliaNovita, setSogliaNovita] = useState<string | null>(null);

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
    if (!conversazioneId) return;
    let cancelled = false;
    setSogliaNovita(null);
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      await marcaConversazioneLetta(supabase, conversazioneId);
      if (cancelled) return;
      setSogliaNovita(new Date().toISOString());
    })();
    return () => {
      cancelled = true;
    };
  }, [conversazioneId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi.length]);

  const inserisciPredefinita = (frase: string) => {
    if (richiestaChiusa) return;
    setTesto((prev) => {
      const t = prev.trim();
      if (!t) return frase;
      return `${t}\n${frase}`;
    });
  };

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
    if (!conversazioneId) return;

    const testoPulito = testo.trim();
    if (testoPulito.length === 0 && files.length === 0) {
      setError("Scrivi un messaggio oppure allega almeno un'immagine.");
      return;
    }

    setInvio(true);
    try {
      const esito = await inviaMessaggioChat({
        conversazioneId,
        testo: testoPulito,
        files,
      });

      if (!esito.ok) {
        setError(esito.error);
        return;
      }

      setTesto("");
      setFiles([]);
      ricarica();
    } catch {
      setError("Errore di rete. Controlla la connessione e riprova.");
    } finally {
      setInvio(false);
    }
  };

  if (error && !conversazioneId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <p className="text-sm text-red-800">{error}</p>
        <Link
          href="/dashboard/richieste-in-arrivo"
          className="mt-4 inline-block text-sm font-semibold text-primary underline"
        >
          Torna alle richieste
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm">
      {richiestaTesto || richiestaAllegati.length > 0 ? (
        <div className="border-b border-border bg-surface-muted px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
            Richiesta dell&apos;acquirente
          </p>
          {richiestaTesto ? <p className="mt-1 text-sm text-foreground">{richiestaTesto}</p> : null}
          {richiestaAllegati.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {richiestaAllegati.map((img) => (
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
                    alt={img.name ?? "Foto richiesta"}
                    className="max-h-40 max-w-[200px] rounded-lg border border-border object-cover"
                  />
                </a>
              ))}
            </div>
          ) : null}
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

      <div className="max-h-[50vh] min-h-[200px] space-y-3 overflow-y-auto px-4 py-4">
        {messaggi.length === 0 ? (
          <p className="text-center text-sm text-subtle">
            Nessun messaggio ancora. Saluta l&apos;acquirente o rispondi usando le frasi rapide sotto.
          </p>
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
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white"
                      : nuovo
                        ? "max-w-[85%] rounded-2xl rounded-bl-md border-2 border-amber-400 bg-amber-50/90 px-3 py-2 text-foreground shadow-sm"
                        : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface-muted px-3 py-2 text-foreground"
                  }
                >
                  {m.testo.trim() ? (
                    <p className="whitespace-pre-wrap text-sm">{m.testo}</p>
                  ) : null}
                  {imgs.length ? (
                    <div className={`mt-2 flex flex-wrap gap-2 ${m.testo.trim() ? "" : ""}`}>
                      {imgs.map((img) => (
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
                        ? "mt-1 text-right text-[10px] text-white/85"
                        : nuovo
                          ? "mt-1 flex items-center justify-end gap-1 text-right text-[10px] font-medium text-amber-900"
                          : "mt-1 text-right text-[10px] text-subtle"
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

      <div className="border-t border-border bg-surface-muted px-4 py-3">
        <p className="mb-2 text-xs font-medium text-muted">Frasi rapide (inserite nel messaggio)</p>
        <div className="flex flex-wrap gap-2">
          {RISPOSTE_PREDEFINITE_NEGOZIO.map((f) => (
            <button
              key={f}
              type="button"
              disabled={richiestaChiusa}
              onClick={() => inserisciPredefinita(f)}
              className="rounded-full border border-border bg-surface px-3 py-1 text-left text-xs text-foreground hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {f.length > 48 ? `${f.slice(0, 48)}…` : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-border p-4">
        {files.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {anteprimaFiles.map((x, idx) => (
              <div key={x.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={x.url}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => rimuoviFile(idx)}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs text-white hover:bg-foreground/90"
                  aria-label="Rimuovi immagine"
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
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle"
          placeholder="Scrivi la tua risposta all'acquirente…"
        />

        <div className="flex flex-wrap items-center gap-2">
          <ImageAttachButtons
            onPick={onFilePick}
            disabled={richiestaChiusa}
            multiple
            galleryLabel={`Galleria (${files.length}/${MAX_IMMAGINI})`}
          />
          <button
            type="button"
            disabled={invio || richiestaChiusa}
            onClick={() => void invia()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {invio ? "Invio…" : "Invia"}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
