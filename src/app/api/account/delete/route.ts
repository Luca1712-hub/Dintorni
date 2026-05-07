import { NextResponse } from "next/server";
import { confermaEliminazioneAccount, FRASE_ELIMINAZIONE_ACCOUNT } from "@/lib/account-delete-confirm";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { eliminaOggettiStorageMessaggiAllegati } from "@/lib/storage-cleanup-user";

export const runtime = "nodejs";

function confermaValida(raw: unknown): boolean {
  return typeof raw === "string" && confermaEliminazioneAccount(raw);
}

/**
 * Cancella prima i file degli allegati sotto `{userId}/` nello bucket messaggi-allegati,
 * poi elimina l'utente Auth (e in CASCADE il resto sul DB pubblico).
 */
export async function POST(request: Request) {
  let body: { confirm?: unknown; accetto_irreversibile?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }

  if (body.accetto_irreversibile !== true) {
    return NextResponse.json(
      { error: "Devi confermare di aver compreso che l’operazione è irreversibile." },
      { status: 400 },
    );
  }

  if (!confermaValida(body.confirm)) {
    return NextResponse.json(
      { error: `Digita esattamente la frase: «${FRASE_ELIMINAZIONE_ACCOUNT}».` },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  let admin;
  try {
    admin = createServiceSupabaseClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Il server non è configurato per l’eliminazione account (manca SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 },
    );
  }

  const storErr = await eliminaOggettiStorageMessaggiAllegati(admin, user.id);
  if (storErr.error) {
    return NextResponse.json(
      {
        error: `Eliminazione file allegati fallita (${storErr.error}). Riprova subito o contatta il supporto.`,
      },
      { status: 500 },
    );
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[account/delete]", delErr);
    return NextResponse.json(
      {
        error:
          "Allegati rimossi dallo storage, ma la cancellazione account non è andata a buon fine: contatta il supporto.",
      },
      { status: 500 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
