/**
 * Privacy Policy v1 — titolare persona fisica (Luca Petrù).
 */
export function PrivacyPolicySection() {
  return (
    <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground">
      <p>
        Ai sensi dell&apos;<strong>art. 13 del Regolamento (UE) 2016/679</strong> (&quot;GDPR&quot;) e delle disposizioni
        applicabili in materia di protezione dei dati personali in Italia, il titolare del trattamento fornisce le
        seguenti informazioni riguardo al trattamento dei dati effettuato tramite l&apos;applicazione e i servizi web
        connessi (di seguito, il &quot;<strong>Servizio</strong>&quot;, marca &quot;Dintorni&quot;).
      </p>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">1. Titolare del trattamento</h3>
        <p className="text-muted">
          Il Servizio è attualmente gestito da una <strong className="text-foreground">persona fisica</strong>, in assenza
          di una società costituita. Il titolare del trattamento è la persona indicata nella tabella seguente. Qualora in
          futuro il Servizio fosse gestito da un soggetto giuridico diverso (es. società), la presente informativa sarà
          aggiornata e, se necessario, ne sarà data comunicazione agli utenti.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-muted/40">
          <table className="w-full min-w-[280px] border-collapse text-left text-sm">
            <tbody>
              <tr className="border-b border-border">
                <th className="w-[40%] px-4 py-3 align-top font-semibold text-foreground">Nome e cognome</th>
                <td className="px-4 py-3 text-muted">Luca Petrù</td>
              </tr>
              <tr>
                <th className="px-4 py-3 align-top font-semibold text-foreground">Email di contatto generale</th>
                <td className="px-4 py-3">
                  <a
                    href="mailto:dintorni@dintorni.app"
                    className="text-primary underline hover:text-primary-hover"
                  >
                    dintorni@dintorni.app
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-muted">
          Per l&apos;esercizio dei diritti di cui al GDPR (vedi sezione 7) e per qualsiasi richiesta relativa ai dati
          personali potete scrivere all&apos;indirizzo email indicato sopra.
        </p>
        <p className="text-muted">
          Non è stato nominato un <strong className="text-foreground">Responsabile della protezione dei dati (DPO)</strong>
          , salvo diversa decisione futura o obbligo di legge.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">2. Dati personali oggetto di trattamento</h3>
        <p className="text-muted">Secondo il modo in cui usate il Servizio possono essere trattati, tra gli altri:</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>
            <strong className="text-foreground">Dati di registrazione e account:</strong> indirizzo email, password (in
            forma crittografata presso il fornitore di autenticazione), nome indicato nel profilo, ruolo es. acquirente /
            negozio, nome negozio, indirizzo o comune associate al profilo, categorie merceologiche comunicate dai
            negozi.
          </li>
          <li>
            <strong className="text-foreground">Dati relativi alle richieste e alla messaggistica:</strong> testi delle
            richieste, parametri geografici scelti (es. GPS o scelta del comune), categorie selezionate, messaggi in
            chat, metadati operativi (es. stato richiesta, marcature di lettura ove previste nell&apos;app).
          </li>
          <li>
            <strong className="text-foreground">Contenuti caricati:</strong> immagini o allegati collegati a richieste o
            messaggi, memorizzati in spazio archiviazione sul cloud.
          </li>
          <li>
            <strong className="text-foreground">Coordinate geografiche sul negozio:</strong> se utilizzato un servizio di
            geocodifica per associare via e comune a latitudine/longitudine, tali coordinate possono essere calcolate e
            conservate nei sistemi gestiti tramite Supabase.
          </li>
          <li>
            <strong className="text-foreground">Notifiche e comunicazioni:</strong> preferenze (es. email e/o push),
            parametri tecnici relativi alla consegna di notifiche web o email transazionali (es. indirizzo email di
            recapito già noto, token del dispositivo per il push ove attivato).
          </li>
          <li>
            <strong className="text-foreground">Dati tecnici e di log:</strong> informazioni che i server e i fornitori
            di hosting possono registrare in sede di erogazione del Servizio (es. indirizzo IP, data e ora, tipo di
            browser, URL richiesti, codici di errore), nei limiti necessari a sicurezza, conformità e funzionamento.
          </li>
          <li>
            <strong className="text-foreground">Dati raccolti tramite Wix (ove applicabile):</strong> se il titolare
            utilizza siti, landing page o moduli ospitati su Wix collegati al progetto, possono essere trattati dati
            inviati tramite form di contatto, cookie o strumenti di analisi attivati nella console Wix (es. strumenti di
            analytics o marketing offerti da Wix). È opportuno elencare esplicitamente quali strumenti Wix sono attivi e
            aggiornare la relativa sezione cookie.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">3. Finalità, basi giuridiche e conservazione</h3>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-foreground">Erogazione del Servizio, gestione account e profili</strong> (art. 6(1)(b)
            GDPR: esecuzione del contratto o precontrattuale). I dati sono conservati per la durata dell&apos;account e
            comunque per il tempo necessario ad adempiere a obblighi di legge o a tutela in sede contenziosa; dopo la
            cancellazione dell&apos;account, i dati possono essere eliminati o resi anonimi secondo le impostazioni
            tecniche del Servizio, salvo obblighi di conservazione documentale.
          </li>
          <li>
            <strong className="text-foreground">Comunicazioni funzionali</strong> (es. notifiche su messaggi o attività
            rilevanti per l&apos;uso del Servizio): in genere art. 6(1)(b) o, se costituiscono comunicazioni di marketing
            distinte, consenso art. 6(1)(a). Le preferenze possono essere gestite dall&apos;area personale ove previsto.
          </li>
          <li>
            <strong className="text-foreground">Sicurezza, prevenzione abusi, conformità legale</strong> (art. 6(1)(c) e
            (f) GDPR: obbligo legale e legittimo interesse), inclusi log tecnici su Vercel/Supabase nella misura
            necessaria.
          </li>
          <li>
            <strong className="text-foreground">Sito o presenza su Wix</strong>: in base alle funzioni attivate, possono
            trovare applicazione consenso (art. 6(1)(a)) per cookie non strettamente necessari o analytics, oppure
            legittimo interesse / esecuzione di misure precontrattuali per richieste inviate tramite moduli; specificare
            nel dettaglio sul sito Wix e negli eventuali banner cookie.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">4. Trattamento con strumenti elettronici e luogo</h3>
        <p className="text-muted">
          I dati sono trattati con strumenti informatici e telematici, con logiche correlate alle finalità indicate. La
          infrastruttura principale può risiedere su server situati nello <strong>Spazio economico europeo</strong> o, in
          parte, <strong>fuori dall&apos;UE</strong>, nel rispetto delle garanzie previste dal GDPR (es. decisioni di
          adeguatezza della Commissione o Clausole contrattuali tipo approvate dalla Commissione europea), secondo le
          informative e i contratti dei singoli fornitori.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">5. Destinatari e responsabili del trattamento</h3>
        <p className="text-muted">
          I dati possono essere accessibili a persone autorizzate dal titolare (es. amministratori di sistema) e sono
          trattati da fornitori che agiscono come <strong>Responsabili del trattamento</strong> ai sensi dell&apos;art. 28
          GDPR, in base a accordi contrattuali. In relazione all&apos;architettura tipica del Servizio:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-foreground">Supabase</strong> (Supabase, Inc. e/o società del gruppo): database,
            autenticazione, storage di file, real-time ove usato, esecuzione di funzioni lato server collegate al
            progetto. Informativa e documentazione:{" "}
            <a
              href="https://supabase.com/privacy"
              className="text-primary underline hover:text-primary-hover"
              target="_blank"
              rel="noopener noreferrer"
            >
              supabase.com/privacy
            </a>
            .
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> (Vercel Inc.): hosting e distribuzione dell&apos;applicazione
            web, funzioni serverless, log di esecuzione e sicurezza della piattaforma. Informativa:{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="text-primary underline hover:text-primary-hover"
              target="_blank"
              rel="noopener noreferrer"
            >
              vercel.com/legal/privacy-policy
            </a>
            .
          </li>
          <li>
            <strong className="text-foreground">Wix</strong> (Wix.com Ltd. o società del gruppo), <strong>ove</strong> il
            titolare utilizza Wix per siti, pagine o moduli collegati al marchio o al Servizio: ospitaggio sito, moduli,
            eventuali strumenti di analytics/marketing Wix. Informativa privacy Wix:{" "}
            <a
              href="https://it.wix.com/about/privacy-intro"
              className="text-primary underline hover:text-primary-hover"
              target="_blank"
              rel="noopener noreferrer"
            >
              pagina Privacy Wix
            </a>{" "}
            (verificare la versione lingua aggiornata).
          </li>
          <li>
            <strong className="text-foreground">Altri fornitori</strong> strettamente necessari (da elencare in base alla
            configurazione reale): ad esempio servizio di <strong>invio email transazionali</strong>, servizio di{" "}
            <strong>geocodifica</strong> degli indirizzi, eventuali strumenti di monitoraggio errori o analisi uso
            app—ciascuno designato Responsabile nei limiti pertinenti contrattuali.
          </li>
        </ul>
        <p className="text-muted">
          Non si effettua una vendita &quot;dati personali&quot; di utenti finali nel senso ordinario del termine. Non è
          prevista diffusione pubblica sistematica delle conversazioni senza ulteriore base giuridica.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">6. Cookie e tecnologie simili</h3>
        <p className="text-muted">
          Il Servizio ospitato su Vercel/Next può utilizzare cookie o storage locale strettamente necessari al funzionamento
          tecnico della sessione o all&apos;autenticazione (es. tramite librerie compatibili con Supabase). Se il titolare
          integra <strong>strumenti di misurazione o marketing</strong> (es. su pagine Wix o tramite script aggiunti
          nell&apos;app), vanno individuati nell&apos;informativa e, quando richiesto, gestiti mediante banner/consenso
          conforme alle linee guida del{" "}
          <a
            href="https://www.garanteprivacy.it"
            className="text-primary underline hover:text-primary-hover"
            target="_blank"
            rel="noopener noreferrer"
          >
            Garante per la protezione dei dati personali
          </a>{" "}
          e al GDPR.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">7. Diritti dell&apos;interessato</h3>
        <p className="text-muted">In qualità di interessato, potete esercitare i diritti di cui agli artt. 15–22 GDPR, tra cui:</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>accesso, rettifica, cancellazione (&quot;diritto all&apos;oblio&quot;) ove applicabile;</li>
          <li>limitazione del trattamento o opposizione, nei casi previsti dalla legge;</li>
          <li>portabilità dei dati forniti, ove prevista;</li>
          <li>
            reclamo all&apos;<strong className="text-foreground">Autorità di controllo italiana</strong> (
            <a
              href="https://www.garanteprivacy.it"
              className="text-primary underline hover:text-primary-hover"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.garanteprivacy.it
            </a>
            ), anche se prima potete scriverci per una soluzione amichevole.
          </li>
        </ul>
        <p className="text-muted">
          Le richieste possono essere inviate ai recapiti del titolare (sezione 1). Ove il Servizio prevede
          cancellazione account dall&apos;area personale, tale funzione contribuisce all&apos;esercizio del diritto di
          cancellazione nei limiti tecnici e soggettivi degli obblighi di legge.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">8. Età minima e natura del conferimento</h3>
        <p className="text-muted">
          Il conferimento dei dati necessari alla registrazione e all&apos;uso delle funzionalità principali è{" "}
          <strong>necessario</strong> per aderire al Servizio; in mancanza, non sarà possibile erogare l&apos;account o le
          funzioni collegate. Se il Servizio è rivolto a minori solo in modo limitato, il titolare deve adeguare
          l&apos;età di accesso e le garanzie (es. consenso del genitore ove previsto dall&apos;ordinamento).
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">9. Modifiche</h3>
        <p className="text-muted">
          Il titolare potrà aggiornare la presente informativa indicando versione e data di ultimo aggiornamento e, se il
          mutamento è sostanziale, adottando le ulteriori misure eventualmente prescritte (es. rinnovo consensi o comunicazioni
          agli utenti). La registrazione nell&apos;app può tracciare la versione accettata (es. Privacy v1) per trasparenza
          nei confronti degli utenti.
        </p>
      </section>

      <p className="rounded-lg border border-border bg-surface-muted/40 p-3 text-xs text-muted">
        Ultimo aggiornamento di questo testo: maggio 2026 (titolare persona fisica, recapiti come in sezione 1).
      </p>
    </div>
  );
}
