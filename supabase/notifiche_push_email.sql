-- Preferenze notifiche sul profilo + tabella subscription Web Push.
--
-- Cosa fa tutto insieme (push «da capo a coda»):
--   A) L'utente, nell'app (Area personale), registra il browser nella tabella push_subscriptions.
--   B) Quando qualcuno scrive un messaggio in chat, Supabase può avvisare questo progetto (webhook).
--   C) L'app legge chi e` il destinatario, prende le sue subscription e manda la notifica col server (web-push).
--
-- Passi operativi:
--   1) Esegui questo file nell'SQL Editor di Supabase.
--   2) In .env.local: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (npx web-push generate-vapid-keys),
--      MESSAGGIO_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL.
--   3) Webhook: Database → Webhooks → New hook
--        Table: public.messaggi   Events: INSERT
--        URL: https://TUO-DOMINIO/api/webhooks/notify-message
--        HTTP Header: Authorization: Bearer <stesso MESSAGGIO_WEBHOOK_SECRET di .env.local>
--      In sviluppo su localhost Supabase non raggiunge il PC: usa un tunnel (es. ngrok) verso la porta 3000
--      e nell'URL del webhook metti https://xxxx.ngrok-free.app/api/webhooks/notify-message
--      In alternativa, dalla cartella progetto: npm run test:notify-webhook -- <conversazione_id> <mittente_id>

alter table public.profiles add column if not exists notifiche_email boolean not null default true;
alter table public.profiles add column if not exists notifiche_push boolean not null default true;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
