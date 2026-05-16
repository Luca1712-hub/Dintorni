"use server";

import { redirect } from "next/navigation";
import { mapAuthErrorToMessage } from "@/lib/auth-errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export type AccediState = { error: string } | null;

export async function accedi(
  _prevState: AccediState,
  formData: FormData,
): Promise<AccediState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase non e` configurato: crea `.env.local` nella cartella del progetto (vedi `.env.example`).",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Inserisci un'email valida." };
  }

  if (!password) {
    return { error: "Inserisci la password." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapAuthErrorToMessage(error) };
  }

  redirect("/dashboard");
}
