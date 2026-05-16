import { AccessoForm } from "./accesso-form";

export default function AccessoPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Accedi</h1>
        <p className="mt-2 text-muted">
          Inserisci email e password del tuo account Supabase.
        </p>
        <AccessoForm />
      </div>
    </main>
  );
}
