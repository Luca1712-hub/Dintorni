import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignOutButton } from "./sign-out-button";

export async function SiteHeader() {
  if (!isSupabaseConfigured()) {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Dintorni
        </Link>

        {user ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">
              {nome ? (
                <>
                  Ciao, <span className="font-medium text-slate-900">{nome}</span>
                  {ruolo ? (
                    <span className="text-slate-500">
                      {" "}
                      · {ruolo === "negozio" ? "Negozio" : "Acquirente"}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-slate-600">Account attivo</span>
              )}
            </span>
            <nav className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50"
              >
                Dashboard
              </Link>
              <Link
                href="/area-personale"
                className="rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
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
              className="rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
            >
              Registrati
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
