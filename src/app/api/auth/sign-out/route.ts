import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Uscita account: cancella i cookie di sessione lato server e reindirizza ad Accedi. */
export async function GET(request: Request) {
  const redirectUrl = new URL("/accesso", request.url);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // reindirizza comunque
    }
  }

  return NextResponse.redirect(redirectUrl);
}
