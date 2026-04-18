import type { Metadata } from "next";
import Link from "next/link";
import { NuovaRichiestaForm } from "./nuova-richiesta-form";

export const metadata: Metadata = {
  title: "Nuova richiesta | Dintorni MVP",
};

export default function NuovaRichiestaPage() {
  return (
    <main className="flex-1 bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            ← Dashboard
          </Link>
        </p>
        <NuovaRichiestaForm />
      </div>
    </main>
  );
}
