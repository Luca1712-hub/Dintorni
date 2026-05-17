"use client";

import Link from "next/link";
import { useActionState } from "react";
import { accedi, type AccediState } from "./actions";
import { PasswordInput } from "@/components/password-input";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function AccessoForm() {
  const [state, formAction, pending] = useActionState<AccediState, FormData>(accedi, null);

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

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            placeholder="nome@email.it"
          />
        </div>

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          required
          autoComplete="current-password"
        />

        {state?.error ? (
          <p className="text-sm font-medium text-red-600">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !isSupabaseConfigured()}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Accesso in corso…" : "Entra"}
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
