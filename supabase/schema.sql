-- Esegui questo script in Supabase: SQL Editor → New query → Run
-- Crea tabella profili collegata a auth.users e un trigger che la popola alla registrazione.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text not null default '',
  ruolo text not null default 'acquirente' check (ruolo in ('acquirente', 'negozio')),
  nome_negozio text,
  indirizzo_negozio text,
  categorie_merceologiche jsonb not null default '[]'::jsonb,
  terms_version text not null default 'v1',
  privacy_version text not null default 'v1',
  accepted_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  cats jsonb;
begin
  if jsonb_typeof(meta -> 'categorie') = 'array' then
    cats := meta -> 'categorie';
  else
    cats := '[]'::jsonb;
  end if;

  insert into public.profiles (
    id,
    email,
    nome,
    ruolo,
    nome_negozio,
    indirizzo_negozio,
    categorie_merceologiche,
    terms_version,
    privacy_version,
    accepted_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(meta ->> 'nome', ''),
    case
      when meta ->> 'ruolo' in ('acquirente', 'negozio') then meta ->> 'ruolo'
      else 'acquirente'
    end,
    nullif(trim(meta ->> 'nome_negozio'), ''),
    nullif(trim(meta ->> 'indirizzo_negozio'), ''),
    cats,
    coalesce(meta ->> 'terms_version', 'v1'),
    coalesce(meta ->> 'privacy_version', 'v1'),
    coalesce((meta ->> 'accepted_at')::timestamptz, now())
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

-- PostgreSQL 14+: EXECUTE FUNCTION. Se fallisce, usa: execute procedure public.handle_new_user();
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant select, update on table public.profiles to authenticated;
