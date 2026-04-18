"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  mapDbProfileToProfile,
  type DbProfileRow,
  type DintorniUserProfile,
} from "@/lib/profile";
import { NotifichePushSetup } from "@/components/notifiche-push-setup";
import { SelettoreProvinciaComune } from "@/components/selettore-provincia-comune";
import { CATEGORIE_MERCEOLOGICHE } from "@/lib/categorie-negozio";
import { geocodeViaEComune } from "@/lib/geocode-negozio-client";
import { joinIndirizzoNegozio, splitIndirizzoNegozio } from "@/lib/indirizzo-negozio";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function AreaPersonalePage() {
  const router = useRouter();
  const [user, setUser] = useState<DintorniUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvataggioNotifiche, setSalvataggioNotifiche] = useState(false);

  const [viaNegozioEdit, setViaNegozioEdit] = useState("");
  const [comuneNegozioEdit, setComuneNegozioEdit] = useState("");
  const [salvataggioIndirizzo, setSalvataggioIndirizzo] = useState(false);
  const [msgIndirizzo, setMsgIndirizzo] = useState("");
  const [errIndirizzo, setErrIndirizzo] = useState("");

  const [nomeNegozioEdit, setNomeNegozioEdit] = useState("");
  const [categorieNegozioEdit, setCategorieNegozioEdit] = useState<string[]>([]);
  const [salvataggioSchedaNegozio, setSalvataggioSchedaNegozio] = useState(false);
  const [msgSchedaNegozio, setMsgSchedaNegozio] = useState("");
  const [errSchedaNegozio, setErrSchedaNegozio] = useState("");

  const [comuneAcquirenteEdit, setComuneAcquirenteEdit] = useState("");
  const [salvataggioComuneAcquirente, setSalvataggioComuneAcquirente] = useState(false);
  const [msgComuneAcquirente, setMsgComuneAcquirente] = useState("");
  const [errComuneAcquirente, setErrComuneAcquirente] = useState("");

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: row, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError || !row) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(mapDbProfileToProfile(row as DbProfileRow));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (user?.ruolo !== "negozio") return;
    const { via, comuneLabel } = splitIndirizzoNegozio(user.indirizzoNegozio);
    setViaNegozioEdit(via);
    setComuneNegozioEdit(comuneLabel);
  }, [user?.ruolo, user?.indirizzoNegozio]);

  useEffect(() => {
    if (user?.ruolo !== "acquirente") return;
    setComuneAcquirenteEdit((user.comuneAcquirente ?? "").trim());
  }, [user?.ruolo, user?.comuneAcquirente]);

  const syncKeySchedaNegozio =
    user?.ruolo === "negozio"
      ? `${user.nomeNegozio ?? ""}|${(user.categorieNegozio ?? []).join("|")}`
      : "";

  useEffect(() => {
    if (!user || user.ruolo !== "negozio") return;
    setNomeNegozioEdit((user.nomeNegozio ?? "").trim());
    setCategorieNegozioEdit([...user.categorieNegozio]);
    // syncKeySchedaNegozio riassume nome+categorie: evita reset quando cambiano solo le preferenze notifiche.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `user` coerente con syncKey nello stesso render
  }, [syncKeySchedaNegozio]);

  const salvaIndirizzoNegozio = useCallback(async () => {
    if (!user || user.ruolo !== "negozio") return;
    setErrIndirizzo("");
    setMsgIndirizzo("");
    const via = viaNegozioEdit.trim();
    const comune = comuneNegozioEdit.trim();
    if (!via) {
      setErrIndirizzo("Inserisci via e numero civico.");
      return;
    }
    if (!comune || !/\([A-Z]{2}\)\s*$/.test(comune)) {
      setErrIndirizzo("Seleziona provincia e comune dall'elenco.");
      return;
    }
    const indirizzoCompleto = joinIndirizzoNegozio(via, comune);
    setSalvataggioIndirizzo(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const geo = await geocodeViaEComune(via, comune);
      const coords =
        geo.ok && geo.lat !== null ? { negozio_lat: geo.lat, negozio_lng: geo.lng } : { negozio_lat: null, negozio_lng: null };

      const { error } = await supabase
        .from("profiles")
        .update({
          indirizzo_negozio: indirizzoCompleto,
          comune_negozio: comune,
          ...coords,
        })
        .eq("id", authUser.id);
      if (error) {
        setErrIndirizzo(error.message);
        return;
      }
      setUser({ ...user, indirizzoNegozio: indirizzoCompleto });
      setMsgIndirizzo("Indirizzo aggiornato.");
    } finally {
      setSalvataggioIndirizzo(false);
    }
  }, [user, viaNegozioEdit, comuneNegozioEdit]);

  const salvaSchedaNegozio = useCallback(async () => {
    if (!user || user.ruolo !== "negozio") return;
    setErrSchedaNegozio("");
    setMsgSchedaNegozio("");
    const nome = nomeNegozioEdit.trim();
    if (!nome) {
      setErrSchedaNegozio("Il nome del negozio e` obbligatorio.");
      return;
    }
    if (categorieNegozioEdit.length === 0) {
      setErrSchedaNegozio("Seleziona almeno una categoria merceologica.");
      return;
    }
    setSalvataggioSchedaNegozio(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_negozio: nome,
          categorie_merceologiche: categorieNegozioEdit,
        })
        .eq("id", authUser.id);
      if (error) {
        setErrSchedaNegozio(error.message);
        return;
      }
      setUser({
        ...user,
        nomeNegozio: nome,
        categorieNegozio: [...categorieNegozioEdit],
      });
      setMsgSchedaNegozio("Nome e categorie aggiornati.");
    } finally {
      setSalvataggioSchedaNegozio(false);
    }
  }, [user, nomeNegozioEdit, categorieNegozioEdit]);

  const salvaComuneAcquirente = useCallback(async () => {
    if (!user || user.ruolo !== "acquirente") return;
    setErrComuneAcquirente("");
    setMsgComuneAcquirente("");
    const comune = comuneAcquirenteEdit.trim();
    if (!comune || !/\([A-Z]{2}\)\s*$/.test(comune)) {
      setErrComuneAcquirente("Seleziona provincia e comune dall'elenco.");
      return;
    }
    setSalvataggioComuneAcquirente(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { error } = await supabase
        .from("profiles")
        .update({ comune_acquirente: comune })
        .eq("id", authUser.id);
      if (error) {
        setErrComuneAcquirente(error.message);
        return;
      }
      setUser({ ...user, comuneAcquirente: comune });
      setMsgComuneAcquirente("Comune aggiornato.");
    } finally {
      setSalvataggioComuneAcquirente(false);
    }
  }, [user, comuneAcquirenteEdit]);

  const aggiornaPreferenzaNotifiche = useCallback(
    async (campo: "notifiche_email" | "notifiche_push", valore: boolean) => {
      if (!user) return;
      setSalvataggioNotifiche(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;
        const { error } = await supabase
          .from("profiles")
          .update({ [campo]: valore })
          .eq("id", authUser.id);
        if (error) {
          console.error(error);
          return;
        }
        setUser({
          ...user,
          ...(campo === "notifiche_email" ? { notificheEmail: valore } : { notifichePush: valore }),
        });
      } finally {
        setSalvataggioNotifiche(false);
      }
    },
    [user],
  );

  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Supabase non configurato</h1>
          <p className="mt-2 text-muted">
            Aggiungi le variabili in <code className="rounded bg-surface-muted px-1">.env.local</code>{" "}
            (vedi <code className="rounded bg-surface-muted px-1">.env.example</code>
            ) e riavvia il server di sviluppo.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <p className="text-muted">Caricamento profilo…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Accesso richiesto</h1>
          <p className="mt-2 text-muted">
            Accedi con email e password oppure crea un nuovo account.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/accesso"
              className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
            >
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="inline-block rounded-lg border border-border px-4 py-2 font-semibold text-muted hover:bg-surface-muted"
            >
              Registrati
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Area personale</h1>
        <p className="mt-2 text-muted">
          Dati del profilo salvati su Supabase (tabella <code className="rounded bg-surface-muted px-1">profiles</code>
          ).
        </p>

        <dl className="mt-6 space-y-2">
          <div>
            <dt className="font-semibold">Nome</dt>
            <dd>{user.nome}</dd>
          </div>
          {user.ruolo === "negozio" ? (
            <div>
              <dt className="font-semibold">Nome negozio</dt>
              <dd>{user.nomeNegozio?.trim() ? user.nomeNegozio : "—"}</dd>
            </div>
          ) : null}
          {user.ruolo === "negozio" ? (
            <div>
              <dt className="font-semibold">Indirizzo negozio</dt>
              <dd>{user.indirizzoNegozio?.trim() ? user.indirizzoNegozio : "—"}</dd>
            </div>
          ) : null}
          {user.ruolo === "negozio" ? (
            <div>
              <dt className="font-semibold">Categorie merceologiche</dt>
              <dd>{user.categorieNegozio.length ? user.categorieNegozio.join(", ") : "—"}</dd>
            </div>
          ) : null}
          {user.ruolo === "acquirente" ? (
            <div>
              <dt className="font-semibold">Comune di riferimento</dt>
              <dd>{user.comuneAcquirente?.trim() ? user.comuneAcquirente : "—"}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="font-semibold">Ruolo</dt>
            <dd className="capitalize">{user.ruolo}</dd>
          </div>
          <div>
            <dt className="font-semibold">Termini accettati</dt>
            <dd>
              {user.termsVersion} ({new Date(user.acceptedAt).toLocaleString("it-IT")})
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Privacy accettata</dt>
            <dd>{user.privacyVersion}</dd>
          </div>
        </dl>

        {user.ruolo === "negozio" ? (
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">Nome e categorie</h2>
            <p className="mt-1 text-sm text-muted">
              Aggiorna come compare il negozio agli acquirenti e in quali richieste puoi comparire in
              elenco.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="ap-nome-negozio" className="mb-1 block text-sm font-medium text-foreground">
                  Nome del negozio
                </label>
                <input
                  id="ap-nome-negozio"
                  value={nomeNegozioEdit}
                  onChange={(e) => setNomeNegozioEdit(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Es. Ferramenta Rossi"
                />
              </div>
              <div>
                <p className="mb-2 block text-sm font-medium text-foreground">Categorie merceologiche</p>
                <div className="rounded-lg border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORIE_MERCEOLOGICHE.map((categoria) => (
                      <label key={categoria} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={categorieNegozioEdit.includes(categoria)}
                          disabled={salvataggioSchedaNegozio}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategorieNegozioEdit((prev) => [...prev, categoria]);
                              return;
                            }
                            setCategorieNegozioEdit((prev) => prev.filter((c) => c !== categoria));
                          }}
                        />
                        {categoria}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {errSchedaNegozio ? (
                <p className="text-sm font-medium text-red-600">{errSchedaNegozio}</p>
              ) : null}
              {msgSchedaNegozio ? (
                <p className="text-sm font-medium text-emerald-800">{msgSchedaNegozio}</p>
              ) : null}
              <button
                type="button"
                disabled={salvataggioSchedaNegozio}
                onClick={() => void salvaSchedaNegozio()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {salvataggioSchedaNegozio ? "Salvataggio…" : "Salva nome e categorie"}
              </button>
            </div>
          </section>
        ) : null}

        {user.ruolo === "acquirente" ? (
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">Provincia e comune</h2>
            <p className="mt-1 text-sm text-muted">
              Aggiorna il comune di riferimento sul territorio (come in fase di registrazione).
            </p>
            <div className="mt-4 space-y-4">
              <SelettoreProvinciaComune
                idPrefix="ap-acquirente"
                value={comuneAcquirenteEdit}
                onChange={setComuneAcquirenteEdit}
                disabled={salvataggioComuneAcquirente}
                legend="Comune di riferimento"
              />
              {errComuneAcquirente ? (
                <p className="text-sm font-medium text-red-600">{errComuneAcquirente}</p>
              ) : null}
              {msgComuneAcquirente ? (
                <p className="text-sm font-medium text-emerald-800">{msgComuneAcquirente}</p>
              ) : null}
              <button
                type="button"
                disabled={salvataggioComuneAcquirente}
                onClick={() => void salvaComuneAcquirente()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {salvataggioComuneAcquirente ? "Salvataggio…" : "Salva comune"}
              </button>
            </div>
          </section>
        ) : null}

        {user.ruolo === "negozio" ? (
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">Indirizzo del negozio</h2>
            <p className="mt-1 text-sm text-muted">
              Aggiorna via e civico e scegli di nuovo il comune da elenco (come in registrazione).
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="ap-via-negozio" className="mb-1 block text-sm font-medium text-foreground">
                  Via e numero civico
                </label>
                <input
                  id="ap-via-negozio"
                  value={viaNegozioEdit}
                  onChange={(e) => setViaNegozioEdit(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Es. Via Roma 12"
                />
              </div>
              <SelettoreProvinciaComune
                idPrefix="ap-negozio"
                value={comuneNegozioEdit}
                onChange={setComuneNegozioEdit}
                disabled={salvataggioIndirizzo}
                legend="Comune del negozio"
              />
              {errIndirizzo ? (
                <p className="text-sm font-medium text-red-600">{errIndirizzo}</p>
              ) : null}
              {msgIndirizzo ? (
                <p className="text-sm font-medium text-emerald-800">{msgIndirizzo}</p>
              ) : null}
              <button
                type="button"
                disabled={salvataggioIndirizzo}
                onClick={() => void salvaIndirizzoNegozio()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {salvataggioIndirizzo ? "Salvataggio…" : "Salva indirizzo"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-foreground">Notifiche</h2>
          <p className="mt-1 text-sm text-muted">
            Quando ricevi un messaggio in chat, possiamo avvisarti per email e (se lo attivi sul
            dispositivo) con una notifica del browser.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border"
                checked={user.notificheEmail}
                disabled={salvataggioNotifiche}
                onChange={(e) => void aggiornaPreferenzaNotifiche("notifiche_email", e.target.checked)}
              />
              <span>
                <span className="font-medium">Email</span>
                <span className="block text-muted">
                  Invia un&apos;email quando arriva un nuovo messaggio (serve{" "}
                  <code className="rounded bg-surface-muted px-1 text-xs">RESEND_API_KEY</code> sul server).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border"
                checked={user.notifichePush}
                disabled={salvataggioNotifiche}
                onChange={(e) => void aggiornaPreferenzaNotifiche("notifiche_push", e.target.checked)}
              />
              <span>
                <span className="font-medium">Notifiche push</span>
                <span className="block text-muted">
                  Consenti l&apos;invio tramite Web Push (puoi attivare il dispositivo qui sotto).
                </span>
              </span>
            </label>
          </div>
          <div className="mt-5 rounded-lg border border-border bg-surface-muted/80 p-4">
            <p className="text-sm font-medium text-foreground">Questo dispositivo</p>
            <p className="mt-1 text-xs text-muted">
              Chrome o Edge consigliati. Su iOS le notifiche web hanno limitazioni note.
            </p>
            <div className="mt-3">
              <NotifichePushSetup abilitato={user.notifichePush} />
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="inline-block rounded-lg border border-border px-4 py-2 font-semibold text-muted hover:bg-surface-muted"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={async () => {
              try {
                const supabase = createBrowserSupabaseClient();
                await supabase.auth.signOut();
              } catch {
                // ignora
              }
              setUser(null);
              router.push("/accesso");
              router.refresh();
            }}
            className="rounded-lg bg-accent/40 px-4 py-2 font-semibold text-foreground hover:bg-accent/55"
          >
            Esci
          </button>
        </div>
      </div>
    </main>
  );
}
