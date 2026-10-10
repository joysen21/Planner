-- Auftragsplaner: Löschrechte und Darstellung (hell/dunkel) pro Mitarbeiter
-- Im Supabase SQL Editor ausführen (nach 20261010000000_firmen_lizenzen_mitarbeiter.sql).

-- ---------------------------------------------------------------- Aufträge löschen
-- Löschen darf nur der Admin der Firma oder wer den Auftrag angelegt hat.
-- (Bearbeiten bleibt für alle Mitarbeiter der Firma erlaubt.)
drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs for delete to authenticated
  using (org_id = public.my_org() and public.org_writable()
         and (public.is_admin() or created_by = auth.uid()));

-- ---------------------------------------------------------------- Darstellung pro Mitarbeiter
-- auto = wie das Gerät, light = hell, dark = dunkel
alter table public.employees
  add column if not exists theme text not null default 'auto' check (theme in ('auto', 'light', 'dark'));

-- Jeder Mitarbeiter darf nur seine eigene Darstellung ändern
create or replace function public.set_my_theme(p_theme text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_theme not in ('auto', 'light', 'dark') then raise exception 'Ungültige Darstellung.'; end if;
  update public.employees set theme = p_theme where user_id = auth.uid();
end $$;

revoke execute on function public.set_my_theme(text) from public, anon;
grant  execute on function public.set_my_theme(text) to authenticated;
