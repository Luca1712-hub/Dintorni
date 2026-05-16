import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { initNegozioChat } from "@/lib/chat-negozio-init";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NegozioChatPanel } from "./negozio-chat-panel";

type PageProps = { params: Promise<{ richiestaId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { richiestaId } = await params;
  return {
    title: `Chat richiesta | Dintorni MVP`,
    description: `Chat per la richiesta ${richiestaId.slice(0, 8)}…`,
  };
}

export default async function NegozioRichiestaChatPage({ params }: PageProps) {
  const { richiestaId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <p className="text-muted">Supabase non configurato.</p>
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

  const { data: profilo } = await supabase
    .from("profiles")
    .select("ruolo")
    .eq("id", user.id)
    .maybeSingle();

  if (profilo?.ruolo !== "negozio") {
    return (
      <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-muted">
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              ← Dashboard
            </Link>
          </p>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-red-800">Questa chat e` riservata ai negozi.</p>
          </div>
        </div>
      </main>
    );
  }

  const init = await initNegozioChat(supabase, richiestaId, user.id);

  return (
    <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/dashboard/richieste-in-arrivo" className="font-medium text-primary hover:underline">
            ← Richieste in arrivo
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold">Chat con l&apos;acquirente</h1>
        <p className="mt-2 text-sm text-muted">
          Usa le frasi rapide per velocizzare e allega foto del prodotto quando serve.
        </p>
        <div className="mt-6">
          <NegozioChatPanel
            richiestaId={richiestaId}
            serverInit={init}
          />
        </div>
      </div>
    </main>
  );
}
