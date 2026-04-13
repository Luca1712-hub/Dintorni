import type { Metadata } from "next";
import Link from "next/link";
import { NuovaRichiestaForm } from "./nuova-richiesta-form";

export const metadata: Metadata = {
  title: "Nuova richiesta | Dintorni MVP",
};

export default function NuovaRichiestaPage() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-600">
          <Link href="/dashboard" className="font-medium text-blue-700 hover:underline">
            ← Dashboard
          </Link>
        </p>
        <NuovaRichiestaForm />
      </div>
    </main>
  );
}
