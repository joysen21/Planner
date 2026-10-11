-- Planner: Kundenstamm und wiederkehrende Termine (Serien)
-- Im Supabase SQL Editor ausführen (nach 20261013000000_ganztags_zeitraum.sql).

-- ---------------------------------------------------------------- Kundenstamm
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default public.my_org() references public.organizations(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  adresse    text not null default '',
  tel        text not null default '',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists customers_org_idx on public.customers (org_id);

alter table public.customers enable row level security;

-- Alle Mitarbeiter der Firma dürfen Kunden sehen, anlegen und ändern;
-- löschen dürfen nur der Admin oder wer den Kunden angelegt hat.
drop policy if exists customers_read on public.customers;
drop policy if exists customers_insert on public.customers;
drop policy if exists customers_update on public.customers;
drop policy if exists customers_delete on public.customers;
create policy customers_read   on public.customers for select to authenticated using (org_id = public.my_org());
create policy customers_insert on public.customers for insert to authenticated
  with check (org_id = public.my_org() and public.org_writable());
create policy customers_update on public.customers for update to authenticated
  using (org_id = public.my_org() and public.org_writable()) with check (org_id = public.my_org());
create policy customers_delete on public.customers for delete to authenticated
  using (org_id = public.my_org() and public.org_writable() and (public.is_admin() or created_by = auth.uid()));

-- ---------------------------------------------------------------- Serien (wiederkehrende Termine)
-- Alle Termine einer Serie tragen dieselbe series-ID (z. B. zum gemeinsamen Löschen)
alter table public.jobs add column if not exists series uuid;
create index if not exists jobs_series_idx on public.jobs (series);

-- ---------------------------------------------------------------- Live-Aktualisierung
do $$ begin
  alter publication supabase_realtime add table public.customers;
exception when duplicate_object then null; end $$;
