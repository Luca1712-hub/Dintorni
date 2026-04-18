import type { Metadata } from "next";
import Link from "next/link";
import { LeMieRichiesteList } from "./le-mie-richieste-list";

export const metadata: Metadata = {
  title: "Le mie richieste | Dintorni MVP",
};

export default function LeMieRichiestePage() {
  return (
    <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            ← Dashboard
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold">Le mie richieste</h1>
        <p className="mt-2 text-muted">
          Elenco delle richieste inviate ai negozi. Puoi chiudere quelle ancora aperte quando non ti servono
          piu`.
        </p>
        <div className="mt-8">
          <LeMieRichiesteList />
        </div>
      </div>
    </main>
  );
}
