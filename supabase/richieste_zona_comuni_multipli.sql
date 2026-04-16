-- Zona "comune": provincia, elenco comuni (jsonb) oppure tutta la provincia.
-- Esegui in Supabase → SQL Editor (dopo richieste_acquirenti.sql e negozio_geo_filtri_e_chat_chiusa.sql).

alter table public.richieste
  add column if not exists provincia_sigla text null,
  add column if not exists comuni jsonb null,
  add column if not exists comuni_tutta_provincia boolean not null default false;

comment on column public.richieste.provincia_sigla is
  'Sigla provincia (es. MI) quando zona_tipo=comune; null per righe legacy solo con comune.';
comment on column public.richieste.comuni is
  'Elenco etichette comune ufficiale (es. ["Milano (MI)"]); null se tutta provincia o legacy.';
comment on column public.richieste.comuni_tutta_provincia is
  'Se true, la richiesta vale per ogni comune della provincia_sigla.';

alter table public.richieste drop constraint if exists richieste_zona_comune;

alter table public.richieste add constraint richieste_zona_comune check (
  zona_tipo <> 'comune'
  or (
    lat is null
    and lng is null
    and raggio_km is null
    and (
      (
        comuni_tutta_provincia = true
        and provincia_sigla is not null
        and char_length(trim(provincia_sigla)) = 2
      )
      or (
        comuni_tutta_provincia = false
        and (
          (
            comune is not null
            and char_length(trim(comune)) >= 2
          )
          or (
            comuni is not null
            and jsonb_typeof(comuni) = 'array'
            and jsonb_array_length(comuni) >= 1
            and jsonb_array_length(comuni) <= 50
          )
        )
      )
    )
  )
);

-- Aggiorna il trigger "solo chiusura": impedisce modifica anche dei nuovi campi zona.
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
     or new.provincia_sigla is distinct from old.provincia_sigla
     or new.comuni is distinct from old.comuni
     or new.comuni_tutta_provincia is distinct from old.comuni_tutta_provincia
  then
    raise exception 'Non puoi modificare il contenuto della richiesta.';
  end if;
  if new.chiusa_at is null then
    new.chiusa_at := now();
  end if;
  return new;
end;
$fn$;

-- Policy negozio: match comune esteso (lista, tutta provincia, legacy).
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
            and (
              (
                coalesce(richieste.comuni_tutta_provincia, false) = true
                and richieste.provincia_sigla is not null
                and char_length(trim(richieste.provincia_sigla)) = 2
                and upper(
                  coalesce(
                    (regexp_match(trim(p.comune_negozio), '\(([A-Za-z]{2})\)\s*$'))[1],
                    ''
                  )
                ) = upper(trim(richieste.provincia_sigla))
              )
              or
              (
                coalesce(richieste.comuni_tutta_provincia, false) = false
                and (
                  (
                    richieste.comune is not null
                    and trim(p.comune_negozio) = trim(richieste.comune)
                  )
                  or exists (
                    select 1
                    from jsonb_array_elements_text(
                      case
                        when jsonb_typeof(coalesce(richieste.comuni, '[]'::jsonb)) = 'array'
                          then coalesce(richieste.comuni, '[]'::jsonb)
                        else '[]'::jsonb
                      end
                    ) as comune_el(lbl)
                    where trim(p.comune_negozio) = trim(comune_el.lbl)
                  )
                )
              )
            )
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
