-- Planner: Zeitraum, in dem ganztägige Termine im Kalender angezeigt werden (pro Firma, Standard 08:00–17:00)
-- Im Supabase SQL Editor ausführen (nach 20261012000000_besitzer_benutzerverwaltung.sql).

alter table public.organizations
  add column if not exists allday_start text not null default '08:00' check (allday_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add column if not exists allday_end   text not null default '17:00' check (allday_end   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- Nur der Firmen-Admin darf den Zeitraum seiner Firma ändern
create or replace function public.admin_set_allday(p_start text, p_end text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
begin
  if coalesce(p_start, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p_end, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Bitte gültige Uhrzeiten angeben (z. B. 08:00).';
  end if;
  if p_start >= p_end then raise exception 'Das Ende muss nach dem Beginn liegen.'; end if;
  update public.organizations set allday_start = p_start, allday_end = p_end where id = v_org;
end $$;

revoke execute on function public.admin_set_allday(text, text) from public, anon;
grant  execute on function public.admin_set_allday(text, text) to authenticated;
