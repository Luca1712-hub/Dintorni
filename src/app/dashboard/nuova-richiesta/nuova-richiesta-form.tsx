"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SelettoreProvinciaComune } from "@/components/selettore-provincia-comune";
import {
  CATEGORIE_MERCEOLOGICHE,
  MAX_CATEGORIE_RICHIESTA,
} from "@/lib/categorie-negozio";
import type { AllegatoMessaggio } from "@/lib/chat-types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BUCKET_ALLEGATI = "messaggi-allegati";
const MAX_IMMAGINI_RICHIESTA = 6;
const MAX_MB_IMMAGINE = 5;

const PLACEHOLDER_RICHIESTA =
  "Es.: cerco tavolo da giardino in legno per 4 persone, budget intorno ai 200 euro; oppure: cerco farmacia che faccia consegna a domicilio entro domani sera.";

type ZonaTipo = "gps" | "comune";
type RaggioKm = 5 | 10 | 15 | 20;

export function NuovaRichiestaForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAcquirente, setIsAcquirente] = useState<boolean | null>(null);

  const [testo, setTesto] = useState("");
  const [zonaTipo, setZonaTipo] = useState<ZonaTipo>("gps");
  const [raggioKm, setRaggioKm] = useState<RaggioKm>(10);
  const [comune, setComune] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );
  const [categorie, setCategorie] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured()) {
        setIsAcquirente(false);
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
        if (cancelled) return;
        if (profile?.ruolo === "negozio") {
          setIsAcquirente(false);
        } else {
          setIsAcquirente(true);
        }
      } catch {
        if (!cancelled) setIsAcquirente(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (zonaTipo === "gps") {
      setComune("");
    } else {
      setLat(null);
      setLng(null);
      setGeoStatus("idle");
    }
  }, [zonaTipo]);

  const toggleCategoria = (nome: string) => {
    setErrore("");
    setCategorie((prev) => {
      if (prev.includes(nome)) {
        return prev.filter((c) => c !== nome);
      }
      if (prev.length >= MAX_CATEGORIE_RICHIESTA) {
        setErrore(`Puoi selezionare al massimo ${MAX_CATEGORIE_RICHIESTA} categorie.`);
        return prev;
      }
      return [...prev, nome];
    });
  };

  const onFilePick = (list: FileList | null) => {
    if (!list?.length) return;
    const next: File[] = [...files];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_MB_IMMAGINE * 1024 * 1024) continue;
      if (next.length >= MAX_IMMAGINI_RICHIESTA) break;
      next.push(f);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const rimuoviFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const acquisisciPosizione = () => {
    setErrore("");
    if (!navigator.geolocation) {
      setGeoStatus("err");
      setErrore("Il browser non supporta la geolocalizzazione.");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoStatus("ok");
      },
      () => {
        setLat(null);
        setLng(null);
        setGeoStatus("err");
        setErrore(
          "Non e` stato possibile ottenere la posizione. Controlla i permessi del browser o scegli un comune.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrore("");

    const testoPulito = testo.trim();
    if (testoPulito.length < 5) {
      setErrore("Scrivi una richiesta piu` dettagliata (almeno 5 caratteri).");
      return;
    }

    if (categorie.length === 0) {
      setErrore("Seleziona almeno una categoria di negozi.");
      return;
    }

    if (zonaTipo === "gps") {
      if (lat == null || lng == null) {
        setErrore("Acquisisci la tua posizione oppure scegli l'opzione comune.");
        return;
      }
    } else {
      const c = comune.trim();
      if (c.length < 4 || !/\([A-Z]{2}\)\s*$/.test(c)) {
        setErrore("Seleziona provincia e comune dall'elenco ufficiale.");
        return;
      }
    }

    if (!isSupabaseConfigured()) {
      setErrore("Supabase non e` configurato.");
      return;
    }

    setCaricamento(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/accesso");
        return;
      }

      const richiestaId = crypto.randomUUID();
      const allegati: AllegatoMessaggio[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${user.id}/richiesta/${richiestaId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET_ALLEGATI)
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) {
          setErrore(`Caricamento immagine fallito: ${upErr.message}`);
          return;
        }
        const { data: pub } = supabase.storage.from(BUCKET_ALLEGATI).getPublicUrl(path);
        allegati.push({ url: pub.publicUrl, path, name: f.name });
      }

      const row =
        zonaTipo === "gps"
          ? {
              id: richiestaId,
              acquirente_id: user.id,
              testo: testoPulito,
              zona_tipo: "gps" as const,
              raggio_km: raggioKm,
              lat,
              lng,
              comune: null,
              categorie,
              allegati,
            }
          : {
              id: richiestaId,
              acquirente_id: user.id,
              testo: testoPulito,
              zona_tipo: "comune" as const,
              raggio_km: null,
              lat: null,
              lng: null,
              comune: comune.trim(),
              categorie,
              allegati,
            };

      const { error } = await supabase.from("richieste").insert(row);

      if (error) {
        setErrore(
          error.message.includes("allegati") || error.code === "42703"
            ? "Aggiorna il database: esegui lo script `supabase/richieste_allegati_foto.sql` in Supabase (colonna allegati sulle richieste)."
            : error.message.includes("richieste")
              ? "Impossibile salvare: verifica di aver eseguito lo script SQL `supabase/richieste_acquirenti.sql` nel progetto Supabase."
              : error.message,
        );
        return;
      }

      router.push("/dashboard?richiesta=inviata");
      router.refresh();
    } catch (err) {
      setErrore(
        err instanceof Error ? err.message : "Errore durante l'invio della richiesta.",
      );
    } finally {
      setCaricamento(false);
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-slate-700">Caricamento…</p>
      </div>
    );
  }

  if (isAcquirente === false) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Nuova richiesta</h1>
        <p className="mt-2 text-slate-700">
          Questa pagina e` dedicata agli acquirenti. Il tuo account e` registrato come negozio.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Nuova richiesta</h1>
      <p className="mt-2 text-slate-700">
        Descrivi cosa cerchi, dove (intorno a te o in un comune) e a quali categorie di negozi
        inviare la richiesta.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <div>
          <label htmlFor="testo" className="mb-2 block text-sm font-medium text-slate-900">
            La tua richiesta
          </label>
          <textarea
            id="testo"
            value={testo}
            onChange={(ev) => setTesto(ev.target.value)}
            required
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600"
            placeholder={PLACEHOLDER_RICHIESTA}
          />
          <p className="mt-1 text-xs text-slate-500">
            Il testo in grigio chiaro e` solo un suggerimento: scompare quando inizi a scrivere.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900">Foto (facoltativo)</p>
          <p className="mt-1 text-xs text-slate-500">
            Fino a {MAX_IMMAGINI_RICHIESTA} immagini, max {MAX_MB_IMMAGINE} MB ciascuna. Visibili ai negozi insieme al testo della richiesta.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="richiesta-foto"
              onChange={(ev) => onFilePick(ev.target.files)}
            />
            <label
              htmlFor="richiesta-foto"
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Scegli foto
            </label>
            <span className="text-xs text-slate-600">
              {files.length} / {MAX_IMMAGINI_RICHIESTA}
            </span>
          </div>
          {files.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {files.map((f, idx) => (
                <li
                  key={`${f.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => rimuoviFile(idx)}
                    className="shrink-0 text-xs font-semibold text-red-700 underline"
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-slate-900">Dove cercare</legend>

          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="zona"
                checked={zonaTipo === "gps"}
                onChange={() => setZonaTipo("gps")}
                className="mt-1"
              />
              <span>
                <span className="font-medium">A partire dalla mia posizione</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Useremo il punto in cui ti trovi ora e un raggio in chilometri.
                </span>
              </span>
            </label>

            {zonaTipo === "gps" ? (
              <div className="ml-6 space-y-3 border-l-2 border-blue-100 pl-4">
                <div>
                  <label htmlFor="raggio" className="mb-1 block text-sm font-medium">
                    Raggio
                  </label>
                  <select
                    id="raggio"
                    value={raggioKm}
                    onChange={(ev) =>
                      setRaggioKm(Number(ev.target.value) as RaggioKm)
                    }
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 sm:w-auto"
                  >
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={20}>20 km</option>
                  </select>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={acquisisciPosizione}
                    disabled={geoStatus === "loading"}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {geoStatus === "loading" ? "Acquisizione posizione…" : "Acquisisci posizione"}
                  </button>
                  {geoStatus === "ok" ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">
                      Posizione acquisita correttamente.
                    </p>
                  ) : null}
                  {geoStatus === "err" && !errore ? (
                    <p className="mt-2 text-sm text-red-600">Posizione non disponibile.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="zona"
                checked={zonaTipo === "comune"}
                onChange={() => setZonaTipo("comune")}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Indica un comune</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Scegli provincia e comune dall&apos;elenco (dati ufficiali). La richiesta sara` legata a
                  quel comune, senza usare il GPS.
                </span>
              </span>
            </label>

            {zonaTipo === "comune" ? (
              <div className="ml-6 space-y-3 border-l-2 border-blue-100 pl-4">
                <SelettoreProvinciaComune
                  key={zonaTipo}
                  idPrefix="richiesta-comune"
                  value={comune}
                  onChange={setComune}
                  disabled={caricamento}
                  legend="Zona della richiesta"
                />
              </div>
            ) : null}
          </div>
        </fieldset>

        <div>
          <p className="text-sm font-medium text-slate-900">
            Categorie di negozi (max {MAX_CATEGORIE_RICHIESTA})
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Seleziona da 1 a {MAX_CATEGORIE_RICHIESTA} categorie: la richiesta sara` indirizzata a
            negozi di quel tipo.
          </p>
          <div className="mt-3 rounded-lg border border-slate-300 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORIE_MERCEOLOGICHE.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={categorie.includes(cat)}
                    onChange={() => toggleCategoria(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Selezionate: {categorie.length} / {MAX_CATEGORIE_RICHIESTA}
            </p>
          </div>
        </div>

        {errore ? <p className="text-sm font-medium text-red-600">{errore}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={caricamento}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {caricamento ? "Invio in corso…" : "Invia richiesta"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
