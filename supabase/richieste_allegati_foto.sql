-- Esegui in Supabase → SQL Editor se hai gia` creato `richieste` senza foto.
-- Aggiunge allegati (foto) alla richiesta iniziale, come in chat (max 6 immagini).

alter table public.richieste
  add column if not exists allegati jsonb not null default '[]'::jsonb;

alter table public.richieste drop constraint if exists richieste_allegati_json;

alter table public.richieste
  add constraint richieste_allegati_json check (
    jsonb_typeof(allegati) = 'array'
    and jsonb_array_length(allegati) <= 6
  );

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
