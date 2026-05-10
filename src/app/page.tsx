import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function Home() {
  let loggedIn = false;
  let nome: string | null = null;
  let ruolo: "acquirente" | "negozio" | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        loggedIn = true;
        const { data } = await supabase
          .from("profiles")
          .select("nome, ruolo")
          .eq("id", user.id)
          .maybeSingle();
        if (data && typeof data.nome === "string") nome = data.nome;
        if (data?.ruolo === "acquirente" || data?.ruolo === "negozio") {
          ruolo = data.ruolo;
        }
      }
    } catch {
      // ignora: home resta utilizzabile
    }
  }

  return (
    <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          Dintorni MVP
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {loggedIn && nome ? `Ciao, ${nome}` : "Benvenuto in Dintorni MVP"}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          {loggedIn ? (
            <>
              {ruolo === "negozio" ? (
                <>
                  Sei connesso come <strong>negozio</strong>. Apri la dashboard per le azioni operative, o
                  l&apos;area personale per i dati del profilo.
                </>
              ) : (
                <>
                  Sei connesso come <strong>acquirente</strong>. Dalla dashboard potrai creare e seguire le
                  richieste verso i negozi.
                </>
              )}
            </>
          ) : (
            <>
              Mettiamo in contatto <strong>acquirenti</strong> e <strong>negozi</strong> del territorio:
              richieste, risposte e messaggi in un unico posto. Registrati o accedi per iniziare.
            </>
          )}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
              >
                Vai alla dashboard
              </Link>
              <Link
                href="/area-personale"
                className="rounded-lg border border-border px-4 py-2 font-semibold text-muted hover:bg-surface-muted"
              >
                Area personale
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/registrazione"
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
              >
                Registrati
              </Link>
              <Link
                href="/accesso"
                className="rounded-lg border border-border px-4 py-2 font-semibold text-muted hover:bg-surface-muted"
              >
                Accedi
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
