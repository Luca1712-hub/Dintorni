"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { sanitizeSiteAccessNext } from "@/lib/site-access";

export function SiteAccessForm() {
  const searchParams = useSearchParams();
  const nextPath = sanitizeSiteAccessNext(searchParams.get("next"));

  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrore("");
    setCaricamento(true);

    try {
      const res = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrore(data?.error ?? "Password non corretta.");
        return;
      }

      // Ricarica intera pagina così il cookie impostato dalla risposta è sicuramente inviato al server
      // (router.push dopo fetch a volte non applica subito il cookie e si resta bloccati su /site-access).
      window.location.assign(nextPath);
      return;
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setCaricamento(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Accesso al sito</h1>
        <p className="mt-2 text-muted">
          Questa versione è protetta. Inserisci la password condivisa per continuare.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <PasswordInput
            id="site-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {errore ? <p className="text-sm font-medium text-red-600">{errore}</p> : null}

          <button
            type="submit"
            disabled={caricamento}
            className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {caricamento ? "Verifica in corso…" : "Continua"}
          </button>
        </form>
      </div>
    </main>
  );
}
