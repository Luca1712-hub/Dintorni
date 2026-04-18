import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignOutButton } from "./sign-out-button";

export async function SiteHeader() {
  if (!isSupabaseConfigured()) {
    return (
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
            Dintorni
          </Link>
          <p className="text-xs text-amber-800">
            Configura <code className="rounded bg-amber-50 px-1">.env.local</code>
          </p>
        </div>
      </header>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome: string | null = null;
  let ruolo: "acquirente" | "negozio" | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nome, ruolo")
      .eq("id", user.id)
      .maybeSingle();

    if (data && typeof data.nome === "string") {
      nome = data.nome;
    }
    if (
      data &&
      (data.ruolo === "acquirente" || data.ruolo === "negozio")
    ) {
      ruolo = data.ruolo;
    }
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          Dintorni
        </Link>

        {user ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">
              {nome ? (
                <>
                  Ciao, <span className="font-medium text-foreground">{nome}</span>
                  {ruolo ? (
                    <span className="text-subtle">
                      {" "}
                      · {ruolo === "negozio" ? "Negozio" : "Acquirente"}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-muted">Account attivo</span>
              )}
            </span>
            <nav className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 font-medium text-primary hover:bg-accent/25"
              >
                Dashboard
              </Link>
              <Link
                href="/area-personale"
                className="rounded-md px-3 py-1.5 font-medium text-muted hover:bg-surface-muted"
              >
                Profilo
              </Link>
              <SignOutButton />
            </nav>
          </div>
        ) : (
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/accesso"
              className="rounded-md px-3 py-1.5 font-medium text-muted hover:bg-surface-muted"
            >
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary-hover"
            >
              Registrati
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
