"use client";

import { useState } from "react";
import { esciDallAccount } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        esciDallAccount();
      }}
      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-muted disabled:opacity-50"
    >
      {pending ? "Uscita…" : "Esci"}
    </button>
  );
}
