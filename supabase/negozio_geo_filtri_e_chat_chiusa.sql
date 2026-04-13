-- Profilo negozio: comune ufficiale + coordinate GPS (geocoding in app).
-- Filtro richieste per negozio: stessa logica comune OPPURE distanza km da richiesta GPS.
-- Chat: niente nuovi messaggi se la richiesta e` chiusa.
--
-- Esegui in Supabase → SQL Editor (dopo schema profili, richieste, chat_e_allegati).

alter table public.profiles
  add column if not exists comune_negozio text null,
  add column if not exists negozio_lat double precision null,
  add column if not exists negozio_lng double precision null;

-- Trigger profilo alla registrazione: include comune e coordinate opzionali.
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
    negozio_lng
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
    end
  );

  return new;
end;
$$;

-- Policy negozio: categorie in comune + (comune uguale OPPURE dentro il raggio GPS).
drop policy if exists "richieste_select_negozio_match_categorie" on public.richieste;

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
        and (
          (
            richieste.zona_tipo = 'comune'
            and p.comune_negozio is not null
            and richieste.comune is not null
            and trim(p.comune_negozio) = trim(richieste.comune)
          )
          or
          (
            richieste.zona_tipo = 'gps'
            and richieste.lat is not null
            and richieste.lng is not null
            and richieste.raggio_km is not null
            and p.negozio_lat is not null
            and p.negozio_lng is not null
            and (
              6371.0 * acos(
                least(
                  1.0::double precision,
                  greatest(
                    -1.0::double precision,
                    cos(radians(p.negozio_lat)) * cos(radians(richieste.lat))
                      * cos(radians(richieste.lng) - radians(p.negozio_lng))
                    + sin(radians(p.negozio_lat)) * sin(radians(richieste.lat))
                  )
                )
              )
            ) <= richieste.raggio_km::double precision
          )
        )
    )
  );

-- Nessun nuovo messaggio se la richiesta collegata e` chiusa.
drop policy if exists "messaggi_insert_partecipanti" on public.messaggi;

create policy "messaggi_insert_partecipanti"
  on public.messaggi for insert
  with check (
    mittente_id = auth.uid()
    and exists (
      select 1
      from public.conversazioni c
      join public.richieste r on r.id = c.richiesta_id
      where c.id = conversazione_id
        and (c.acquirente_id = auth.uid() or c.negozio_id = auth.uid())
        and r.stato = 'aperta'
    )
  );
