import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { parseCategorieRichiesta, type RichiestaRow } from "@/lib/richiesta";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RichiesteNegozioList } from "./richieste-negozio-list";

export const metadata: Metadata = {
  title: "Richieste in arrivo | Dintorni MVP",
};

function formatRichiesteError(message: string, code?: string): string {
  if (code === "42501" || message.toLowerCase().includes("policy")) {
    return "Permessi mancanti: esegui in Supabase lo SQL per le policy negozio (es. `supabase/negozio_geo_filtri_e_chat_chiusa.sql` o `supabase/richieste_negozio_select.sql`).";
  }
  return message;
}

export default async function RichiesteInArrivoPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Richieste in arrivo</h1>
          <p className="mt-2 text-muted">
            Supabase non e` configurato. Aggiungi <code className="rounded bg-surface-muted px-1">.env.local</code> e
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
    .select("ruolo, nome_negozio, categorie_merceologiche")
    .eq("id", user.id)
    .maybeSingle();

  const isNegozio = profile?.ruolo === "negozio";
  const nomeNegozio =
    typeof profile?.nome_negozio === "string" ? profile.nome_negozio : null;
  const categorieNegozio = parseCategorieRichiesta(profile?.categorie_merceologiche);

  let rows: RichiestaRow[] = [];
  let loadError = "";

  if (isNegozio) {
    const { data, error } = await supabase
      .from("richieste")
      .select("*")
      .eq("stato", "aperta")
      .order("created_at", { ascending: false });

    if (error) {
      loadError = formatRichiesteError(error.message, error.code);
    } else {
      rows = (data ?? []) as RichiestaRow[];
    }
  }

  return (
    <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            ← Dashboard
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold">Richieste in arrivo</h1>
        <p className="mt-2 text-muted">
          Richieste degli acquirenti che coincidono con le categorie del tuo negozio (solo richieste ancora
          aperte).
        </p>
        <div className="mt-8">
          <RichiesteNegozioList
            serverData={{
              isNegozio,
              nomeNegozio,
              categorieNegozio,
              rows,
              loadError,
            }}
          />
        </div>
      </div>
    </main>
  );
}
