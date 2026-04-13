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
    <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">
          Dintorni MVP
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {loggedIn && nome ? `Ciao, ${nome}` : "Benvenuto in Dintorni MVP"}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-700">
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

        <section className="mt-8 rounded-xl bg-slate-100 p-5">
          <h2 className="text-lg font-semibold">Roadmap MVP</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
            <li>Registrazione e accesso con Supabase (fatto).</li>
            <li>Dashboard per ruolo (questa schermata e la pagina Dashboard).</li>
            <li>Richiesta acquirente e risposta negozio.</li>
            <li>Messaggi in-app tra le parti.</li>
          </ol>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Vai alla dashboard
              </Link>
              <Link
                href="/area-personale"
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Area personale
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/registrazione"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Registrati
              </Link>
              <Link
                href="/accesso"
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
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
