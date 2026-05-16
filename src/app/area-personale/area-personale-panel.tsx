"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DintorniUserProfile } from "@/lib/profile";
import { NotifichePushSetup } from "@/components/notifiche-push-setup";
import { PushDiagnostica } from "@/components/push-diagnostica";
import { SelettoreProvinciaComune } from "@/components/selettore-provincia-comune";
import { CATEGORIE_MERCEOLOGICHE } from "@/lib/categorie-negozio";
import { geocodeViaEComune } from "@/lib/geocode-negozio-client";
import { joinIndirizzoNegozio, splitIndirizzoNegozio } from "@/lib/indirizzo-negozio";
import { FRASE_ELIMINAZIONE_ACCOUNT, confermaEliminazioneAccount } from "@/lib/account-delete-confirm";
import { esciDallAccount } from "@/lib/auth-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
type Props = {
  userId: string;
  initialUser: DintorniUserProfile;
};

export function AreaPersonalePanel({ userId, initialUser }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<DintorniUserProfile>(initialUser);
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

  const [eliminaIrreversibile, setEliminaIrreversibile] = useState(false);
  const [eliminaFrase, setEliminaFrase] = useState("");
  const [eliminaInCorso, setEliminaInCorso] = useState(false);
  const [eliminaErr, setEliminaErr] = useState("");

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
        .eq("id", userId);
      if (error) {
        setErrIndirizzo(error.message);
        return;
      }
      setUser({ ...user, indirizzoNegozio: indirizzoCompleto });
      setMsgIndirizzo("Indirizzo aggiornato.");
    } finally {
      setSalvataggioIndirizzo(false);
    }
  }, [user, userId, viaNegozioEdit, comuneNegozioEdit]);

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
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_negozio: nome,
          categorie_merceologiche: categorieNegozioEdit,
        })
        .eq("id", userId);
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
  }, [user, userId, nomeNegozioEdit, categorieNegozioEdit]);

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
      const { error } = await supabase
        .from("profiles")
        .update({ comune_acquirente: comune })
        .eq("id", userId);
      if (error) {
        setErrComuneAcquirente(error.message);
        return;
      }
      setUser({ ...user, comuneAcquirente: comune });
      setMsgComuneAcquirente("Comune aggiornato.");
    } finally {
      setSalvataggioComuneAcquirente(false);
    }
  }, [user, userId, comuneAcquirenteEdit]);

  const aggiornaPreferenzaNotifiche = useCallback(
    async (campo: "notifiche_email" | "notifiche_push", valore: boolean) => {
      if (!user) return;
      setSalvataggioNotifiche(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase
          .from("profiles")
          .update({ [campo]: valore })
          .eq("id", userId);
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
    [user, userId],
  );

  const eliminaAccount = useCallback(async () => {
    setEliminaErr("");
    if (!eliminaIrreversibile) {
      setEliminaErr("Segna la casella di conferma per procedere.");
      return;
    }
    if (!confermaEliminazioneAccount(eliminaFrase)) {
      setEliminaErr(`Digita esattamente: ${FRASE_ELIMINAZIONE_ACCOUNT}`);
      return;
    }
    setEliminaInCorso(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accetto_irreversibile: true,
          confirm: eliminaFrase.trim(),
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const msg =
        typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null;
      if (!res.ok) {
        setEliminaErr(msg ?? "Non è stato possibile eliminare l’account.");
        return;
      }
      esciDallAccount();
    } catch {
      setEliminaErr("Errore di rete. Riprova.");
    } finally {
      setEliminaInCorso(false);
    }
  }, [eliminaFrase, eliminaIrreversibile, router]);
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
            <p className="mt-2 text-xs text-muted">
              In OneSignal cerchi questo account con{" "}
              <strong className="text-foreground">External ID</strong> ={" "}
              <code className="break-all rounded bg-surface px-1 text-[11px] text-foreground">{userId}</code>{" "}
              ({user.ruolo === "negozio" ? "negozio" : "acquirente"} · {user.email})
            </p>
            <div className="mt-3">
              <NotifichePushSetup abilitato={user.notifichePush} userId={userId} />
              <PushDiagnostica userId={userId} />
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-red-800">Elimina account</h2>
          <p className="mt-2 text-sm text-muted">
            Per <strong className="font-medium text-foreground">acquirenti</strong> e{" "}
            <strong className="font-medium text-foreground">negozianti</strong>: la cancellazione è
            definitiva. Vengono eliminati profilo, preferenze di notifica, iscrizioni push e — a seconda
            del ruolo — le tue richieste o le conversazioni e i messaggi collegati al tuo negozio.
            Anche le <strong className="font-medium text-foreground">foto e gli allegati</strong> che
            hai caricato vengono rimossi dallo storage. Non potrai recuperare questi dati.
          </p>
          <div className="mt-4 space-y-4 rounded-lg border border-red-200 bg-red-50/80 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border"
                checked={eliminaIrreversibile}
                disabled={eliminaInCorso}
                onChange={(e) => setEliminaIrreversibile(e.target.checked)}
              />
              <span>
                Ho compreso che l&apos;operazione è <strong className="font-medium">irreversibile</strong>
                .
              </span>
            </label>
            <div>
              <label htmlFor="ap-elimina-frase" className="mb-1 block text-sm font-medium text-foreground">
                Per confermare, digita:{" "}
                <span className="font-mono text-xs text-muted">{FRASE_ELIMINAZIONE_ACCOUNT}</span>
              </label>
              <input
                id="ap-elimina-frase"
                type="text"
                autoComplete="off"
                value={eliminaFrase}
                disabled={eliminaInCorso}
                onChange={(e) => setEliminaFrase(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder={FRASE_ELIMINAZIONE_ACCOUNT}
              />
            </div>
            {eliminaErr ? <p className="text-sm font-medium text-red-700">{eliminaErr}</p> : null}
            <button
              type="button"
              disabled={
                eliminaInCorso || !eliminaIrreversibile || !confermaEliminazioneAccount(eliminaFrase)
              }
              onClick={() => void eliminaAccount()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {eliminaInCorso ? "Eliminazione…" : "Elimina definitivamente il mio account"}
            </button>
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
            onClick={() => {
              esciDallAccount();
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
