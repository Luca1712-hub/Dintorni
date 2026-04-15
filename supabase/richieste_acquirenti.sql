-- Esegui in Supabase → SQL Editor (dopo lo schema profili).
-- Tabella richieste degli acquirenti con RLS.

create table if not exists public.richieste (
  id uuid primary key default gen_random_uuid(),
  acquirente_id uuid not null references auth.users (id) on delete cascade,
  testo text not null,
  zona_tipo text not null check (zona_tipo in ('gps', 'comune')),
  raggio_km smallint null check (raggio_km is null or raggio_km in (5, 10, 15, 20)),
  lat double precision null,
  lng double precision null,
  comune text null,
  categorie jsonb not null default '[]'::jsonb,
  allegati jsonb not null default '[]'::jsonb,
  stato text not null default 'aperta' check (stato in ('aperta', 'chiusa')),
  chiusa_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint richieste_testo_non_vuoto check (char_length(trim(testo)) >= 5),
  constraint richieste_zona_gps check (
    zona_tipo <> 'gps'
    or (
      raggio_km in (5, 10, 15, 20)
      and lat is not null
      and lng is not null
    )
  ),
  constraint richieste_zona_comune check (
    zona_tipo <> 'comune'
    or (
      comune is not null
      and char_length(trim(comune)) >= 2
      and lat is null
      and lng is null
      and raggio_km is null
    )
  ),
  constraint richieste_categorie check (
    jsonb_typeof(categorie) = 'array'
    and jsonb_array_length(categorie) >= 1
    and jsonb_array_length(categorie) <= 3
  ),
  constraint richieste_allegati_json check (
    jsonb_typeof(allegati) = 'array'
    and jsonb_array_length(allegati) <= 6
  )
);

create index if not exists richieste_acquirente_created_idx
  on public.richieste (acquirente_id, created_at desc);

alter table public.richieste enable row level security;

create policy "richieste_select_own"
  on public.richieste for select
  using (auth.uid() = acquirente_id);

create policy "richieste_select_negozio_match_categorie"
  on public.richieste for select
  using (
    stato = 'aperta'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.ruolo = 'negozio'
        and jsonb_typeof(p.categorie_merceologiche) = 'array'
        and jsonb_array_length(p.categorie_merceologiche) > 0
        and jsonb_typeof(richieste.categorie) = 'array'
        and jsonb_array_length(richieste.categorie) > 0
        and array(
          select jsonb_array_elements_text(richieste.categorie)
        ) && array(
          select jsonb_array_elements_text(p.categorie_merceologiche)
        )
    )
  );

create policy "richieste_insert_own"
  on public.richieste for insert
  with check (auth.uid() = acquirente_id);

create policy "richieste_update_own"
  on public.richieste for update
  using (auth.uid() = acquirente_id)
  with check (auth.uid() = acquirente_id);

grant select, insert, update on table public.richieste to authenticated;

create or replace function public.richieste_allow_close_only()
returns trigger
language plpgsql
as $fn$
begin
  if old.stato = 'chiusa' then
    raise exception 'Richiesta gia` chiusa.';
  end if;
  if new.stato <> 'chiusa' then
    raise exception 'Puoi solo chiudere la richiesta.';
  end if;
  if new.testo is distinct from old.testo
     or new.zona_tipo is distinct from old.zona_tipo
     or new.raggio_km is distinct from old.raggio_km
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.comune is distinct from old.comune
     or new.categorie is distinct from old.categorie
     or new.allegati is distinct from old.allegati
     or new.acquirente_id is distinct from old.acquirente_id
     or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Non puoi modificare il contenuto della richiesta.';
  end if;
  if new.chiusa_at is null then
    new.chiusa_at := now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists richieste_update_close_only on public.richieste;

create trigger richieste_update_close_only
  before update on public.richieste
  for each row
  execute function public.richieste_allow_close_only();
