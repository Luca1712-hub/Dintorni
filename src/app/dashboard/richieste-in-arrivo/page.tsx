import type { Metadata } from "next";
import Link from "next/link";
import { RichiesteNegozioList } from "./richieste-negozio-list";

export const metadata: Metadata = {
  title: "Richieste in arrivo | Dintorni MVP",
};

export default function RichiesteInArrivoPage() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-600">
          <Link href="/dashboard" className="font-medium text-blue-700 hover:underline">
            ← Dashboard
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold">Richieste in arrivo</h1>
        <p className="mt-2 text-slate-700">
          Richieste degli acquirenti che coincidono con le categorie del tuo negozio (solo richieste ancora
          aperte).
        </p>
        <div className="mt-8">
          <RichiesteNegozioList />
        </div>
      </div>
    </main>
  );
}
