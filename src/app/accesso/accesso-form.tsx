"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { mapAuthErrorToMessage } from "@/lib/auth-errors";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function AccessoForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(false);
  const [controlloSessione, setControlloSessione] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setControlloSessione(false);
      return;
    }
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        window.location.assign("/dashboard");
        return;
      }
      setControlloSessione(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrore("");
    const emailPulita = email.trim();

    if (!EMAIL_REGEX.test(emailPulita)) {
      setErrore("Inserisci un'email valida.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrore(
        "Supabase non e` configurato: crea `.env.local` nella cartella del progetto (vedi `.env.example`).",
      );
      return;
    }

    setCaricamento(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: emailPulita,
        password,
      });

      if (error) {
        setErrore(mapAuthErrorToMessage(error));
        return;
      }

      window.location.assign("/dashboard");
    } catch (e) {
      setErrore(
        e instanceof Error
          ? e.message
          : "Errore imprevisto durante l'accesso.",
      );
    } finally {
      setCaricamento(false);
    }
  };

  if (controlloSessione) {
    return <p className="mt-8 text-sm text-muted">Verifica accesso…</p>;
  }

  return (
    <>
      {!isSupabaseConfigured() ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Configurazione mancante</p>
          <p className="mt-1">
            Aggiungi <code className="rounded bg-amber-100 px-1">.env.local</code> con URL e chiave anon,
            poi riavvia il server di sviluppo.
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
            autoComplete="email"
            className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
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
            autoComplete="current-password"
            className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </div>

        {errore ? <p className="text-sm font-medium text-red-600">{errore}</p> : null}

        <button
          type="submit"
          disabled={caricamento || !isSupabaseConfigured()}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {caricamento ? "Accesso in corso…" : "Entra"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Non hai un account?{" "}
        <Link href="/registrazione" className="font-semibold text-primary underline">
          Registrati
        </Link>
      </p>
    </>
  );
}
