import type { Metadata } from "next";
import Link from "next/link";
import { AcquirenteChatPanel } from "./acquirente-chat-panel";

type PageProps = { params: Promise<{ richiestaId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return {
    title: "Chat richiesta | Dintorni MVP",
  };
}

export default async function AcquirenteRichiestaChatPage({ params }: PageProps) {
  const { richiestaId } = await params;

  return (
    <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/dashboard/le-mie-richieste" className="font-medium text-primary hover:underline">
            ← Le mie richieste
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold">Chat sulla richiesta</h1>
        <p className="mt-2 text-sm text-muted">
          Qui vedi i messaggi dei negozi che rispondono. Puoi scrivere e allegare immagini.
        </p>
        <div className="mt-6">
          <AcquirenteChatPanel richiestaId={richiestaId} />
        </div>
      </div>
    </main>
  );
}
