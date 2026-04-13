import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-600">
          <Link href="/dashboard/richieste-in-arrivo" className="font-medium text-blue-700 hover:underline">
            ← Richieste in arrivo
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold">Chat con l&apos;acquirente</h1>
        <p className="mt-2 text-sm text-slate-600">
          Usa le frasi rapide per velocizzare e allega foto del prodotto quando serve.
        </p>
        <div className="mt-6">
          <NegozioChatPanel richiestaId={richiestaId} />
        </div>
      </div>
    </main>
  );
}
