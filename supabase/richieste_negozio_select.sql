-- Esegui in Supabase → SQL Editor (dopo `richieste_acquirenti` e policy acquirente).
-- Consente ai negozi di LEGGERE le richieste APERTE con almeno una categoria in comune con il profilo negozio.
-- Il filtro geografico non e` ancora applicato (arriva in un secondo momento).

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
    )
  );
