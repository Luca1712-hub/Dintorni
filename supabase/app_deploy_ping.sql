-- Esegui UNA VOLTA in Supabase → SQL Editor → New query → Run.
-- Tabella minimale per verificare dalla home che Vercel legga il database.
-- Puoi cambiare il testo con: update public.app_deploy_ping set message = 'tuo-test';

create table if not exists public.app_deploy_ping (
  id smallint primary key default 1,
  constraint app_deploy_ping_single_row check (id = 1),
  message text not null default 'ok',
  updated_at timestamptz not null default now()
);

insert into public.app_deploy_ping (id, message)
values (1, 'pipeline-ok')
on conflict (id) do update
set message = excluded.message, updated_at = now();

alter table public.app_deploy_ping enable row level security;

drop policy if exists "app_deploy_ping_select_public" on public.app_deploy_ping;

create policy "app_deploy_ping_select_public"
  on public.app_deploy_ping
  for select
  to anon, authenticated
  using (true);

grant select on table public.app_deploy_ping to anon, authenticated;
