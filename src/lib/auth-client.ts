import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Uscita account + ricarica pagina (i cookie di sessione devono aggiornarsi subito). */
export async function esciDallAccount(redirectTo = "/accesso"): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    }
  } catch {
    // sessione già assente
  }
  window.location.assign(redirectTo);
}

/** Sessione locale: più affidabile di getUser() nel browser (evita blocchi su «Preparazione chat» / profilo). */
export async function getBrowserAuthUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
