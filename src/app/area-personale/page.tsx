import Link from "next/link";
import { redirect } from "next/navigation";
import { mapDbProfileToProfile, type DbProfileRow } from "@/lib/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AreaPersonalePanel } from "./area-personale-panel";

export default async function AreaPersonalePage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Supabase non configurato</h1>
          <p className="mt-2 text-muted">
            Aggiungi le variabili in <code className="rounded bg-surface-muted px-1">.env.local</code>{" "}
            (vedi <code className="rounded bg-surface-muted px-1">.env.example</code>
            ) e riavvia il server di sviluppo.
          </p>
          <p className="mt-6">
            <Link href="/" className="font-semibold text-primary underline">
              Torna alla home
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/accesso");
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error || !row) {
    redirect("/accesso");
  }

  const profile = mapDbProfileToProfile(row as DbProfileRow);

  return <AreaPersonalePanel userId={authUser.id} initialUser={profile} />;
}
