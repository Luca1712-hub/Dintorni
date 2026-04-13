"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mapAuthErrorToMessage } from "@/lib/auth-errors";
import { SelettoreProvinciaComune } from "@/components/selettore-provincia-comune";
import { CATEGORIE_MERCEOLOGICHE } from "@/lib/categorie-negozio";
import { geocodeViaEComune } from "@/lib/geocode-negozio-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type UserRole = "acquirente" | "negozio";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const ALLOWED_TLDS = new Set([
  "it",
  "com",
  "org",
  "net",
  "eu",
  "info",
  "biz",
  "co",
  "io",
  "dev",
  "app",
  "edu",
  "gov",
  "me",
  "shop",
  "store",
]);
const MIN_PASSWORD_LENGTH = 8;

export default function RegistrazionePage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [nomeNegozio, setNomeNegozio] = useState("");
  const [indirizzoNegozio, setIndirizzoNegozio] = useState("");
  const [comuneNegozio, setComuneNegozio] = useState("");
  const [categorieNegozio, setCategorieNegozio] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [ruolo, setRuolo] = useState<UserRole>("acquirente");
  const [accettaTermini, setAccettaTermini] = useState(false);
  const [accettaPrivacy, setAccettaPrivacy] = useState(false);
  const [password, setPassword] = useState("");
  const [confermaPassword, setConfermaPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [info, setInfo] = useState("");
  const [caricamento, setCaricamento] = useState(false);

  useEffect(() => {
    if (ruolo !== "negozio") setComuneNegozio("");
  }, [ruolo]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrore("");
    const nomePulito = nome.trim();
    const nomeNegozioPulito = nomeNegozio.trim();
    const indirizzoNegozioPulito = indirizzoNegozio.trim();
    const emailPulita = email.trim();
    const tld = emailPulita.split(".").pop()?.toLowerCase() ?? "";

    if (!EMAIL_REGEX.test(emailPulita)) {
      setErrore("Inserisci un'email valida (esempio: utente@dominio.it).");
      return;
    }

    if (!ALLOWED_TLDS.has(tld)) {
      setErrore(
        "L'estensione del dominio email non e` riconosciuta. Usa ad esempio .it, .com, .org, .net.",
      );
      return;
    }

    if (ruolo === "negozio" && !nomeNegozioPulito) {
      setErrore("Se scegli Negozio, il nome del negozio e` obbligatorio.");
      return;
    }

    if (ruolo === "negozio" && !indirizzoNegozioPulito) {
      setErrore("Se scegli Negozio, l'indirizzo (via e numero) e` obbligatorio.");
      return;
    }

    const comuneNegozioPulito = comuneNegozio.trim();
    if (ruolo === "negozio" && !comuneNegozioPulito) {
      setErrore("Se scegli Negozio, seleziona provincia e comune del negozio.");
      return;
    }

    if (ruolo === "negozio" && categorieNegozio.length === 0) {
      setErrore("Se scegli Negozio, seleziona almeno una categoria.");
      return;
    }

    if (!accettaTermini || !accettaPrivacy) {
      setErrore("Per registrarti devi accettare Termini e Privacy.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrore(
        `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
      );
      return;
    }

    if (password !== confermaPassword) {
      setErrore("Le due password non coincidono.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrore(
        "Supabase non e` configurato: crea il file `.env.local` nella cartella del progetto (vedi `.env.example`).",
      );
      return;
    }

    const acceptedAt = new Date().toISOString();

    setCaricamento(true);
    setInfo("");
    try {
      const supabase = createBrowserSupabaseClient();
      const indirizzoCompletoNegozio =
        ruolo === "negozio"
          ? [indirizzoNegozioPulito, comuneNegozioPulito].filter(Boolean).join(" · ")
          : "";

      let negozioLatMeta: string | undefined;
      let negozioLngMeta: string | undefined;
      if (ruolo === "negozio") {
        const geo = await geocodeViaEComune(indirizzoNegozioPulito, comuneNegozioPulito);
        if (geo.ok && geo.lat !== null) {
          negozioLatMeta = String(geo.lat);
          negozioLngMeta = String(geo.lng);
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: emailPulita,
        password,
        options: {
          data: {
            nome: nomePulito,
            ruolo,
            nome_negozio: ruolo === "negozio" ? nomeNegozioPulito : "",
            indirizzo_negozio: ruolo === "negozio" ? indirizzoCompletoNegozio : "",
            categorie: ruolo === "negozio" ? categorieNegozio : [],
            terms_version: "v1",
            privacy_version: "v1",
            accepted_at: acceptedAt,
            ...(ruolo === "negozio"
              ? {
                  comune_negozio: comuneNegozioPulito,
                  ...(negozioLatMeta && negozioLngMeta
                    ? { negozio_lat: negozioLatMeta, negozio_lng: negozioLngMeta }
                    : {}),
                }
              : {}),
          },
        },
      });

      if (error) {
        setErrore(mapAuthErrorToMessage(error));
        return;
      }

      if (!data.session) {
        setInfo(
          "Registrazione ricevuta. Se il progetto Supabase richiede la conferma email, controlla la posta e poi accedi da qui.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErrore(
        e instanceof Error
          ? e.message
          : "Errore imprevisto durante la registrazione.",
      );
    } finally {
      setCaricamento(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Registrazione</h1>
        <p className="mt-2 text-slate-700">
          Compila i dati e scegli una password: account e profilo vengono salvati su{" "}
          <strong>Supabase</strong> (database + autenticazione).
        </p>

        {!isSupabaseConfigured() ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Configurazione mancante</p>
            <p className="mt-1">
              Crea il file <code className="rounded bg-amber-100 px-1">.env.local</code> nella
              cartella del progetto con URL e chiave anon del tuo progetto Supabase (vedi{" "}
              <code className="rounded bg-amber-100 px-1">.env.example</code>
              ), poi riavvia <code className="rounded bg-amber-100 px-1">npm run dev</code>.
            </p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <p className="mb-2 block text-sm font-medium">Ruolo</p>
            <p className="mb-3 text-sm text-slate-600">
              Scegli prima se ti registri come acquirente o come negozio: in base
              alla scelta compariranno i campi adatti.
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ruolo"
                  value="acquirente"
                  checked={ruolo === "acquirente"}
                  onChange={() => setRuolo("acquirente")}
                />
                Acquirente
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ruolo"
                  value="negozio"
                  checked={ruolo === "negozio"}
                  onChange={() => setRuolo("negozio")}
                />
                Negozio
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="nome" className="mb-1 block text-sm font-medium">
              Nome completo
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder="Es. Mario Rossi"
            />
          </div>

          {ruolo === "negozio" ? (
            <>
              <div>
                <label
                  htmlFor="nomeNegozio"
                  className="mb-1 block text-sm font-medium"
                >
                  Nome del negozio
                </label>
                <input
                  id="nomeNegozio"
                  value={nomeNegozio}
                  onChange={(e) => setNomeNegozio(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                  placeholder="Es. Ferramenta Rossi"
                />
              </div>

              <div>
                <label
                  htmlFor="indirizzoNegozio"
                  className="mb-1 block text-sm font-medium"
                >
                  Via e numero civico
                </label>
                <input
                  id="indirizzoNegozio"
                  value={indirizzoNegozio}
                  onChange={(e) => setIndirizzoNegozio(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                  placeholder="Es. Via Roma 12"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Il comune non va scritto a mano: sceglilo qui sotto dall&apos;elenco ufficiale.
                </p>
              </div>

              <SelettoreProvinciaComune
                idPrefix="reg-negozio"
                value={comuneNegozio}
                onChange={setComuneNegozio}
                disabled={caricamento}
                legend="Comune del negozio (obbligatorio)"
              />

              <div>
                <p className="mb-2 block text-sm font-medium">
                  Categorie merceologiche
                </p>
                <div className="rounded-lg border border-slate-300 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORIE_MERCEOLOGICHE.map((categoria) => (
                      <label key={categoria} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={categorieNegozio.includes(categoria)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategorieNegozio((prev) => [...prev, categoria]);
                              return;
                            }
                            setCategorieNegozio((prev) =>
                              prev.filter((item) => item !== categoria),
                            );
                          }}
                        />
                        {categoria}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder="nome@email.it"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
              placeholder={`Almeno ${MIN_PASSWORD_LENGTH} caratteri`}
            />
          </div>

          <div>
            <label
              htmlFor="confermaPassword"
              className="mb-1 block text-sm font-medium"
            >
              Conferma password
            </label>
            <input
              id="confermaPassword"
              type="password"
              value={confermaPassword}
              onChange={(e) => setConfermaPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-2 rounded-lg bg-slate-100 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={accettaTermini}
                onChange={(e) => setAccettaTermini(e.target.checked)}
                className="mt-1"
              />
              <span>
                Accetto i <Link href="#" className="text-blue-700 underline">Termini e Condizioni</Link>.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={accettaPrivacy}
                onChange={(e) => setAccettaPrivacy(e.target.checked)}
                className="mt-1"
              />
              <span>
                Accetto la <Link href="#" className="text-blue-700 underline">Privacy Policy</Link>.
              </span>
            </label>
          </div>

          {errore ? <p className="text-sm font-medium text-red-600">{errore}</p> : null}
          {info ? <p className="text-sm font-medium text-emerald-800">{info}</p> : null}

          <button
            type="submit"
            disabled={caricamento || !isSupabaseConfigured()}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {caricamento ? "Creazione account…" : "Registrati"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Hai gia` un account?{" "}
            <Link href="/accesso" className="font-semibold text-blue-700 underline">
              Accedi
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
