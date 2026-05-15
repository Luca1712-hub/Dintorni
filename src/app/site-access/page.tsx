import { Suspense } from "react";
import { SiteAccessForm } from "./site-access-form";

export default function SiteAccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-6 py-12 text-foreground">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-muted">Caricamento…</p>
          </div>
        </main>
      }
    >
      <SiteAccessForm />
    </Suspense>
  );
}
