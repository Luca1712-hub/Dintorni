-- Abilita aggiornamenti istantanei sulla tabella messaggi (Supabase Realtime).
-- Esegui una volta in Supabase → SQL Editor.
-- Se la riga e` gia` nella publication, lo script non fallisce.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messaggi'
  ) then
    alter publication supabase_realtime add table public.messaggi;
  end if;
end $$;
