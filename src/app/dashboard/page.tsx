import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Dashboard | Dintorni MVP",
};

function DashboardCard(props: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{props.title}</h2>
        {props.badge ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            {props.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{props.description}</p>
    </div>
  );
}

type DashboardPageProps = {
  searchParams: Promise<{ richiesta?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await searchParams;
  const richiestaInviata = sp.richiesta === "inviata";
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-2 text-slate-700">
            Supabase non e` configurato. Aggiungi <code className="rounded bg-slate-100 px-1">.env.local</code> e
            riavvia il server.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/accesso");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, ruolo, nome_negozio")
    .eq("id", user.id)
    .maybeSingle();

  const ruolo =
    profile?.ruolo === "negozio" || profile?.ruolo === "acquirente"
      ? profile.ruolo
      : "acquirente";
  const nome = typeof profile?.nome === "string" ? profile.nome : null;
  const nomeNegozio =
    typeof profile?.nome_negozio === "string" ? profile.nome_negozio : null;

  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {ruolo === "negozio" ? "Area negozio" : "Area acquirente"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
          {nome ? (
            <>
              Bentornato, <strong>{nome}</strong>.
              {ruolo === "negozio" && nomeNegozio ? (
                <>
                  {" "}
                  Stai operando come <strong>{nomeNegozio}</strong>.
                </>
              ) : null}{" "}
            </>
          ) : null}
          Da qui gestisci le azioni principali dell&apos;MVP (richieste, risposte, messaggi).
        </p>

        {richiestaInviata ? (
          <div
            className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            Richiesta inviata correttamente. Puoi seguirla in{" "}
            <Link href="/dashboard/le-mie-richieste" className="font-semibold underline">
              Le mie richieste
            </Link>
            .
          </div>
        ) : null}

        {ruolo === "acquirente" ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/nuova-richiesta"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm outline-none ring-blue-600 transition hover:border-blue-300 hover:shadow-md focus-visible:ring-2"
            >
              <h2 className="text-lg font-semibold text-slate-900">Nuova richiesta</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Descrivi cosa cerchi, scegli zona (GPS, oppure provincia con uno o più comuni o tutta la
                provincia) e fino a tre categorie di negozi.
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-blue-700">
                Compila il modulo →
              </span>
            </Link>
            <Link
              href="/dashboard/le-mie-richieste"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm outline-none ring-blue-600 transition hover:border-blue-300 hover:shadow-md focus-visible:ring-2"
            >
              <h2 className="text-lg font-semibold text-slate-900">Le mie richieste</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Vedi le richieste inviate, lo stato (aperta o chiusa) e chiudi quelle che non servono piu`.
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-blue-700">
                Apri elenco →
              </span>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/richieste-in-arrivo"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm outline-none ring-blue-600 transition hover:border-blue-300 hover:shadow-md focus-visible:ring-2"
            >
              <h2 className="text-lg font-semibold text-slate-900">Richieste in arrivo</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Vedi le richieste aperte degli acquirenti compatibili con le categorie del tuo negozio.
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-blue-700">
                Apri elenco →
              </span>
            </Link>
            <DashboardCard
              title="Scheda negozio"
              description="Aggiorna indirizzo, categorie e informazioni visibili agli acquirenti."
              badge="Prossimamente"
            />
          </div>
        )}

        <p className="mt-8 text-sm text-slate-600">
          Dati anagrafici e consensi:{" "}
          <Link href="/area-personale" className="font-medium text-blue-700 underline">
            Area personale
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
