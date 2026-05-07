import type { SupabaseClient } from "@supabase/supabase-js";

/** Stesso bucket usato da chat (`.../negozio-chat-panel.tsx`, `acquirente-chat-panel.tsx`) e nuova richiesta. */
export const BUCKET_MESSAGGI_ALLEGATI = "messaggi-allegati";

const LIST_PAGE = 500;
const REMOVE_CHUNK = 100;

async function listAllInPrefix(
  admin: SupabaseClient,
  prefix: string,
): Promise<Array<{ name: string; metadata: Record<string, unknown> | null }>> {
  const rows: Array<{ name: string; metadata: Record<string, unknown> | null }> = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET_MESSAGGI_ALLEGATI).list(prefix, {
      limit: LIST_PAGE,
      offset,
    });
    if (error) throw new Error(`${error.message} (cartella «${prefix}»)`);
    if (!data?.length) break;
    for (const item of data) {
      rows.push({
        name: item.name,
        metadata: item.metadata as Record<string, unknown> | null,
      });
    }
    if (data.length < LIST_PAGE) break;
    offset += LIST_PAGE;
  }
  return rows;
}

async function collectFilePaths(admin: SupabaseClient, prefix: string, acc: string[]) {
  const items = await listAllInPrefix(admin, prefix);
  for (const item of items) {
    const path = `${prefix}/${item.name}`;
    if (item.metadata === null) {
      await collectFilePaths(admin, path, acc);
    } else {
      acc.push(path);
    }
  }
}

/** Rimuove da Storage tutti i file il cui path è sotto `{userId}/` (policy upload: primo segmento = utente). */
export async function eliminaOggettiStorageMessaggiAllegati(
  admin: SupabaseClient,
  userId: string,
): Promise<{ error?: string }> {
  const paths: string[] = [];
  try {
    await collectFilePaths(admin, userId, paths);
  } catch (e) {
    console.error("[storage-cleanup]", e);
    const msg =
      e instanceof Error ? e.message : "Impossibile elencare i file degli allegati nello storage.";
    return { error: msg };
  }

  for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
    const slice = paths.slice(i, i + REMOVE_CHUNK);
    const { error } = await admin.storage.from(BUCKET_MESSAGGI_ALLEGATI).remove(slice);
    if (error) {
      console.error("[storage-cleanup] remove", error);
      return { error: error.message };
    }
  }

  return {};
}
