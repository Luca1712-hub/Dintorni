"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const supabase = createBrowserSupabaseClient();
          await supabase.auth.signOut();
        } catch {
          // ignora
        }
        router.push("/");
        router.refresh();
      }}
      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-muted disabled:opacity-50"
    >
      {pending ? "Uscita…" : "Esci"}
    </button>
  );
}
