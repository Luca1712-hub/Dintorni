import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase non e` configurato: aggiungi `.env.local` con URL e chiave anon (vedi `.env.example`).",
    );
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
