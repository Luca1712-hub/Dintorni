/**
 * Simula il webhook di Supabase (nuovo messaggio) verso l'app in locale.
 *
 * Uso (da cartella progetto, Node 20+):
 *   npm run test:notify-webhook -- <conversazione_id> <mittente_id>
 *
 * Gli UUID li copi da Supabase → Table Editor → conversazioni / messaggi,
 * oppure dalla risposta di rete del browser dopo aver inviato un messaggio in chat.
 */

const conversazioneId = process.argv[2];
const mittenteId = process.argv[3];

if (!conversazioneId || !mittenteId) {
  console.error(
    "Uso: npm run test:notify-webhook -- <conversazione_id> <mittente_id>\n" +
      "Esempio: npm run test:notify-webhook -- a1b2c3d4-... e5f6g7h8-...",
  );
  process.exit(1);
}

const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.MESSAGGIO_WEBHOOK_SECRET;

if (!secret) {
  console.error("Manca MESSAGGIO_WEBHOOK_SECRET nel file .env.local");
  process.exit(1);
}

const url = `${base}/api/webhooks/notify-message`;
const body = {
  type: "INSERT",
  table: "messaggi",
  record: {
    conversazione_id: conversazioneId,
    mittente_id: mittenteId,
    testo: "Messaggio di prova (script test-notify-webhook).",
  },
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text);
