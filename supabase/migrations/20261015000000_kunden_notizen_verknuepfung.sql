-- Planner: Notizen beim Kunden und feste Verknüpfung Termin → Kunde
-- Im Supabase SQL Editor ausführen (nach 20261014000000_kunden_serien.sql).

alter table public.customers add column if not exists notiz text not null default '';

-- Wird ein Kunde im Termin-Dialog ausgewählt, merkt sich der Termin den Kunden.
-- Ältere Termine ohne Verknüpfung findet die App weiterhin über den Namen.
alter table public.jobs add column if not exists customer_id uuid references public.customers(id) on delete set null;
create index if not exists jobs_customer_idx on public.jobs (customer_id);
