import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyPolicySection } from "./privacy-policy-section";

export const metadata: Metadata = {
  title: "Privacy e termini | Dintorni",
  description: "Informativa sulla privacy e termini e condizioni del servizio Dintorni.",
};

export default function PrivacyETerminiPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-sm font-medium text-muted">
          <Link href="/" className="text-primary underline hover:text-primary-hover">
            Torna alla home
          </Link>
          {" · "}
          <Link href="/registrazione" className="text-primary underline hover:text-primary-hover">
            Registrazione
          </Link>
        </p>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy e Termini di utilizzo</h1>
        <p className="mt-2 text-muted">Versione registrata nell&apos;app: Termini <strong>v1</strong>, Privacy <strong>v1</strong>.</p>

        <nav className="mt-8 flex flex-wrap gap-4 border-b border-border pb-6 text-sm font-semibold">
          <a href="#termini" className="text-primary underline underline-offset-4 hover:text-primary-hover">
            Termini e condizioni
          </a>
          <a href="#privacy" className="text-primary underline underline-offset-4 hover:text-primary-hover">
            Privacy Policy
          </a>
        </nav>

        <section id="termini" className="scroll-mt-24 border-t border-border pt-10">
          <h2 className="text-2xl font-bold">Termini e condizioni</h2>
          <p className="mt-1 text-sm text-muted">Versione: v1.</p>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">
            <p>
              L&apos;App fornisce esclusivamente una piattaforma di messaggistica. Qualsiasi contratto di
              compravendita, consiglio di acquisto o transazione economica avviene esclusivamente tra Negoziante e
              Utente presso il locale fisico. L&apos;App non è responsabile della qualità, sicurezza o conformità dei
              prodotti.
            </p>
            <p>
              L&apos;utente e il negoziante sono gli unici responsabili del materiale inviato. È vietato l&apos;invio di
              immagini protette da copyright, offensive o che violino i diritti di terzi. Il gestore dell&apos;App si
              riserva il diritto di sospendere gli account che violano tali regole.
            </p>
            <p>
              Il servizio è attualmente in fase sperimentale (Beta). Il gestore non garantisce la continuità assoluta
              del servizio e non è responsabile per eventuali danni derivanti da malfunzionamenti tecnici, mancata
              consegna di messaggi o notifiche.
            </p>
            <p>
              Il Negoziante concede al Gestore dell&apos;App il diritto non esclusivo e gratuito di utilizzare il
              proprio nome e logo all&apos;interno della piattaforma e nei materiali di comunicazione marketing del
              progetto.
            </p>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-24 mt-14 border-t border-border pt-10">
          <h2 className="text-2xl font-bold">Privacy Policy</h2>
          <p className="mt-1 text-sm text-muted">Informativa ai sensi del Regolamento (UE) 2016/679 (GDPR). Versione: v1.</p>

          <PrivacyPolicySection />
        </section>
      </article>
    </main>
  );
}
