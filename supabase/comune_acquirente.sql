-- Comune di riferimento per gli acquirenti (registrazione + profilo).
-- Esegui in Supabase → SQL Editor dopo gli altri script profili.

alter table public.profiles
  add column if not exists comune_acquirente text null;

comment on column public.profiles.comune_acquirente is
  'Etichetta comune ufficiale (es. "Milano (MI)") per acquirenti; null per negozi.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  cats jsonb;
  lat_raw text := meta ->> 'negozio_lat';
  lng_raw text := meta ->> 'negozio_lng';
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
    accepted_at,
    comune_negozio,
    negozio_lat,
    negozio_lng,
    comune_acquirente
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
    coalesce((meta ->> 'accepted_at')::timestamptz, now()),
    nullif(trim(meta ->> 'comune_negozio'), ''),
    case
      when lat_raw is not null and lat_raw ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$'
        then lat_raw::double precision
      else null
    end,
    case
      when lng_raw is not null and lng_raw ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$'
        then lng_raw::double precision
      else null
    end,
    nullif(trim(meta ->> 'comune_acquirente'), '')
  );

  return new;
end;
$$;
