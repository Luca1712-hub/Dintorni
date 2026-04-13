-- Esegui in Supabase → SQL Editor (dopo richieste + profili).
-- Chat tra acquirente e negozio per richiesta + bucket immagini.
-- Per messaggi quasi istantanei nell'app, dopo questo script esegui anche realtime_messaggi.sql.
-- Per letti / non letti e badge: esegui anche chat_letti_non_letti.sql.

-- --- Tabelle ----------------------------------------------------------------

create table if not exists public.conversazioni (
  id uuid primary key default gen_random_uuid(),
  richiesta_id uuid not null references public.richieste (id) on delete cascade,
  acquirente_id uuid not null references auth.users (id) on delete cascade,
  negozio_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversazioni_uniq_richiesta_negozio unique (richiesta_id, negozio_id)
);

create index if not exists conversazioni_richiesta_idx
  on public.conversazioni (richiesta_id);

create index if not exists conversazioni_negozio_idx
  on public.conversazioni (negozio_id);

create table if not exists public.messaggi (
  id uuid primary key default gen_random_uuid(),
  conversazione_id uuid not null references public.conversazioni (id) on delete cascade,
  mittente_id uuid not null references auth.users (id) on delete cascade,
  testo text not null default '',
  allegati jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint messaggi_allegati_json check (jsonb_typeof(allegati) = 'array'),
  constraint messaggi_ha_contenuto check (
    char_length(trim(testo)) >= 1
    or jsonb_array_length(allegati) >= 1
  )
);

create index if not exists messaggi_conversazione_created_idx
  on public.messaggi (conversazione_id, created_at asc);

-- --- Validazione creazione conversazione (negozio + categorie + richiesta aperta) -

create or replace function public.conversazioni_bi_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.richieste%rowtype;
  p public.profiles%rowtype;
begin
  select * into r from public.richieste where id = new.richiesta_id;
  if not found then
    raise exception 'Richiesta non trovata';
  end if;
  if new.acquirente_id is distinct from r.acquirente_id then
    raise exception 'Acquirente non coerente con la richiesta';
  end if;
  if r.stato <> 'aperta' then
    raise exception 'La richiesta non e` piu` aperta';
  end if;

  select * into p from public.profiles where id = new.negozio_id;
  if not found or p.ruolo <> 'negozio' then
    raise exception 'Profilo negozio non valido';
  end if;

  if
    jsonb_typeof(r.categorie) <> 'array'
    or jsonb_typeof(p.categorie_merceologiche) <> 'array'
    or jsonb_array_length(r.categorie) < 1
    or jsonb_array_length(p.categorie_merceologiche) < 1
  then
    raise exception 'Categorie non valide per la chat';
  end if;

  if not (
    array(select jsonb_array_elements_text(r.categorie))
    && array(select jsonb_array_elements_text(p.categorie_merceologiche))
  ) then
    raise exception 'Nessuna categoria in comune tra richiesta e negozio';
  end if;

  return new;
end;
$fn$;

drop trigger if exists conversazioni_bi_validate on public.conversazioni;

create trigger conversazioni_bi_validate
  before insert on public.conversazioni
  for each row
  execute function public.conversazioni_bi_validate();

-- --- RLS conversazioni --------------------------------------------------------

alter table public.conversazioni enable row level security;

drop policy if exists "conversazioni_select_partecipanti" on public.conversazioni;

create policy "conversazioni_select_partecipanti"
  on public.conversazioni for select
  using (acquirente_id = auth.uid() or negozio_id = auth.uid());

drop policy if exists "conversazioni_insert_negozio" on public.conversazioni;

create policy "conversazioni_insert_negozio"
  on public.conversazioni for insert
  with check (negozio_id = auth.uid());

-- --- RLS messaggi ------------------------------------------------------------

alter table public.messaggi enable row level security;

drop policy if exists "messaggi_select_partecipanti" on public.messaggi;

create policy "messaggi_select_partecipanti"
  on public.messaggi for select
  using (
    exists (
      select 1
      from public.conversazioni c
      where c.id = conversazione_id
        and (c.acquirente_id = auth.uid() or c.negozio_id = auth.uid())
    )
  );

drop policy if exists "messaggi_insert_partecipanti" on public.messaggi;

create policy "messaggi_insert_partecipanti"
  on public.messaggi for insert
  with check (
    mittente_id = auth.uid()
    and exists (
      select 1
      from public.conversazioni c
      where c.id = conversazione_id
        and (c.acquirente_id = auth.uid() or c.negozio_id = auth.uid())
    )
  );

grant select, insert on table public.conversazioni to authenticated;
grant select, insert on table public.messaggi to authenticated;

-- --- Storage bucket (immagini in chat) --------------------------------------

insert into storage.buckets (id, name, public)
values ('messaggi-allegati', 'messaggi-allegati', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "messaggi_allegati_insert_authenticated" on storage.objects;

create policy "messaggi_allegati_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'messaggi-allegati'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "messaggi_allegati_select_public" on storage.objects;

create policy "messaggi_allegati_select_public"
  on storage.objects for select
  using (bucket_id = 'messaggi-allegati');

-- --- Profili: controparte visibile se c'e` una conversazione in comune --------

drop policy if exists "profiles_select_controparte_chat" on public.profiles;

create policy "profiles_select_controparte_chat"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.conversazioni c
      where
        (c.acquirente_id = auth.uid() and c.negozio_id = profiles.id)
        or (c.negozio_id = auth.uid() and c.acquirente_id = profiles.id)
    )
  );
