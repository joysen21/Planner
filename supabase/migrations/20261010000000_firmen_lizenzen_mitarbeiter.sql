-- Auftragsplaner: mehrere Firmen mit Lizenz, Besitzer-Verwaltung, Mitarbeiter mit und ohne Anmeldung
-- Im Supabase SQL Editor einmal komplett ausführen (nach 20261009000000_init.sql).
--
-- ACHTUNG: Die bisherigen Testdaten (Aufträge, Feiertage, Benutzer *@planer.local) werden gelöscht.
--
-- Konzept:
--   * owners         – Besitzer der Seite (Anbieter). Meldet sich mit E-Mail + Passwort an und verwaltet
--                      in der App alle Firmen und Lizenzen. Eintrag nur per SQL (siehe README).
--   * organizations  – eine Firma = eine Lizenz. Lizenz-ID JK.PLANNER.001, .002, … (fortlaufend),
--                      max_users = erlaubte Anmeldungen inkl. Admin, valid_until, active (gesperrt?)
--   * employees      – alle Mitarbeiter einer Firma. user_id leer = „Dummy“ (wird nur verplant,
--                      meldet sich nie an, zählt nicht zur Lizenz)
--
-- Anmeldung (Firmen-Admin und Mitarbeiter gleich):
--   Lizenz-ID + Benutzername + Passwort; intern <benutzername>@<nummer>.planer.local, z. B. uwe@001.planer.local
--   Den Firmen-Admin legt der Besitzer an, die Mitarbeiter der Firmen-Admin.

-- ---------------------------------------------------------------- Altes Schema entfernen

drop function if exists public.claim_admin();
drop function if exists public.admin_create_user(text, text, text, text);
drop function if exists public.admin_set_password(uuid, text);
drop function if exists public.admin_delete_user(uuid);
drop table if exists public.jobs;
drop table if exists public.holidays;
drop table if exists public.profiles;
drop function if exists public.is_member();
drop function if exists public.is_admin();
delete from auth.users where email like '%@planer.local';

-- ---------------------------------------------------------------- Tabellen

create table public.owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create sequence public.org_nr_seq;

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  nr          int  not null unique default nextval('public.org_nr_seq'),
  license_id  text generated always as
              ('JK.PLANNER.' || case when nr < 1000 then lpad(nr::text, 3, '0') else nr::text end) stored,
  name        text not null check (length(trim(name)) > 0),
  max_users   int  not null check (max_users > 0),
  valid_until date,                       -- leer = unbegrenzt
  active      boolean not null default true,
  note        text not null default '',   -- nur für den Besitzer
  created_at  timestamptz not null default now()
);
alter sequence public.org_nr_seq owned by public.organizations.nr;

create table public.employees (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  user_id      uuid unique references auth.users(id) on delete set null,
  username     text check (username ~ '^[a-z0-9][a-z0-9._-]{1,29}$'),
  display_name text not null check (length(trim(display_name)) > 0),
  role         text not null default 'user' check (role in ('admin', 'user')),
  color        text not null default '#2f6fa8' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at   timestamptz not null default now(),
  unique (org_id, username)
);
create index employees_org_idx on public.employees (org_id);

-- ---------------------------------------------------------------- Hilfsfunktionen

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.owners where user_id = auth.uid())
$$;

-- Firma des angemeldeten Mitarbeiters; leer, wenn die Lizenz gesperrt ist
create function public.my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.org_id from public.employees e join public.organizations o on o.id = e.org_id
   where e.user_id = auth.uid() and o.active
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.employees
                  where user_id = auth.uid() and role = 'admin' and org_id = public.my_org())
$$;

-- Lizenz gültig? Sonst nur noch lesen.
create function public.org_writable() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations
     where id = public.my_org() and (valid_until is null or valid_until >= current_date)
  )
$$;

-- ---------------------------------------------------------------- Aufträge und Feiertage (pro Firma)

create table public.jobs (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default public.my_org() references public.organizations(id) on delete cascade,
  kunde      text not null default '',
  adresse    text not null default '',
  tel        text not null default '',
  art        text not null default 'montage'
             check (art in ('montage', 'werkstatt', 'planung', 'termin', 'urlaub')),
  wer        uuid[] not null default '{}',   -- employees.id
  start      date,
  tage       int not null default 1 check (tage between 1 and 366),
  zeit       text not null default '' check (zeit ~ '^([0-2][0-9]:[0-5][0-9])?$'),
  ende       text not null default '' check (ende ~ '^([0-2][0-9]:[0-5][0-9])?$'),
  fix        boolean not null default false,
  imp        boolean not null default false,
  material   boolean not null default true,
  notiz      text not null default '',
  done       boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_org_idx on public.jobs (org_id);
create index jobs_wer_idx on public.jobs using gin (wer);
create index jobs_start_idx on public.jobs (start);

create trigger jobs_touch before update on public.jobs
for each row execute function public.touch_updated_at();

create table public.holidays (
  org_id uuid not null default public.my_org() references public.organizations(id) on delete cascade,
  d      date not null,
  n      text not null,
  primary key (org_id, d)
);

-- ---------------------------------------------------------------- Zeilenrechte (RLS)

alter table public.owners        enable row level security;   -- keine Policy: nur über Funktionen
alter table public.organizations enable row level security;
alter table public.employees     enable row level security;
alter table public.jobs          enable row level security;
alter table public.holidays      enable row level security;

create policy organizations_read on public.organizations for select to authenticated
  using (id = public.my_org());

create policy employees_read   on public.employees for select to authenticated
  using (org_id = public.my_org());
create policy employees_update on public.employees for update to authenticated
  using (org_id = public.my_org() and public.is_admin() and public.org_writable())
  with check (org_id = public.my_org());

create policy jobs_read   on public.jobs for select to authenticated using (org_id = public.my_org());
create policy jobs_insert on public.jobs for insert to authenticated
  with check (org_id = public.my_org() and public.org_writable());
create policy jobs_update on public.jobs for update to authenticated
  using (org_id = public.my_org() and public.org_writable())
  with check (org_id = public.my_org());
create policy jobs_delete on public.jobs for delete to authenticated
  using (org_id = public.my_org() and public.org_writable());

create policy holidays_read  on public.holidays for select to authenticated using (org_id = public.my_org());
create policy holidays_write on public.holidays for all to authenticated
  using (org_id = public.my_org() and public.is_admin() and public.org_writable())
  with check (org_id = public.my_org() and public.is_admin() and public.org_writable());

-- Mitarbeiter: direkt nur Name und Farbe änderbar, alles andere über Funktionen
revoke insert, update, delete on public.employees from authenticated;
grant update (display_name, color) on public.employees to authenticated;
revoke insert, update, delete on public.organizations from authenticated;
revoke all on public.owners from anon, authenticated;

-- ---------------------------------------------------------------- Anmeldung anlegen (intern)

-- Benutzername + Passwort prüfen. Admins brauchen mind. 10, Mitarbeiter mind. 8 Zeichen.
create function public._check_login(p_username text, p_password text, p_min int) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9][a-z0-9._-]{1,29}$' then
    raise exception 'Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich.';
  end if;
  if length(coalesce(p_password, '')) < p_min then
    raise exception 'Passwort: mindestens % Zeichen.', p_min;
  end if;
end $$;

-- Anmeldung für einen bestehenden Mitarbeiter anlegen (prüft das Lizenzlimit)
create function public._create_login(p_org uuid, p_emp uuid, p_username text, p_password text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id    uuid := gen_random_uuid();
  v_user  text := lower(trim(coalesce(p_username, '')));
  v_role  text;
  v_nr    int;
  v_max   int;
  v_used  int;
  v_email text;
begin
  select role into v_role from public.employees where id = p_emp and org_id = p_org and user_id is null;
  if v_role is null then raise exception 'Mitarbeiter nicht gefunden oder hat schon eine Anmeldung.'; end if;
  perform public._check_login(v_user, p_password, case when v_role = 'admin' then 10 else 8 end);

  -- Sperre auf die Firma, damit zwei gleichzeitige Anlagen das Limit nicht überschreiten
  select nr, max_users into v_nr, v_max from public.organizations where id = p_org for update;
  select count(*) into v_used from public.employees where org_id = p_org and user_id is not null;
  if v_used >= v_max then
    raise exception 'Lizenzlimit erreicht: % von % Anmeldungen belegt. Mitarbeiter ohne Anmeldung sind weiterhin möglich.', v_used, v_max;
  end if;

  v_email := v_user || '@' || case when v_nr < 1000 then lpad(v_nr::text, 3, '0') else v_nr::text end || '.planer.local';
  if exists (select 1 from public.employees where org_id = p_org and username = v_user)
     or exists (select 1 from auth.users where email = v_email) then
    raise exception 'Benutzername ist schon vergeben.';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', v_user), now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  update public.employees set user_id = v_id, username = v_user where id = p_emp;
  return v_id;
end $$;

create function public._set_password(p_uid uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_uid;
end $$;

-- ---------------------------------------------------------------- Besitzer: Firmen und Lizenzen

create function public.owner_companies()
returns table (id uuid, nr int, license_id text, name text, max_users int, valid_until date, active boolean,
               note text, created_at timestamptz, logins bigint, employees bigint, admin_username text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.nr, o.license_id, o.name, o.max_users, o.valid_until, o.active, o.note, o.created_at,
         (select count(*) from public.employees e where e.org_id = o.id and e.user_id is not null),
         (select count(*) from public.employees e where e.org_id = o.id),
         (select e.username from public.employees e
           where e.org_id = o.id and e.role = 'admin' and e.user_id is not null order by e.created_at limit 1)
    from public.organizations o
   where public.is_owner()
   order by o.nr
$$;

-- Neue Firma mit Admin anlegen; gibt die Lizenz-ID zurück (z. B. JK.PLANNER.001)
create function public.owner_create_company(
  p_name text, p_max_users int, p_valid_until date,
  p_admin_name text, p_admin_username text, p_admin_password text, p_note text default ''
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_lic text;
  v_emp uuid;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Firmen anlegen.'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Bitte den Firmennamen angeben.'; end if;
  if coalesce(p_max_users, 0) < 1 then raise exception 'Mindestens 1 Anmeldung (für den Admin).'; end if;
  -- vorab prüfen, damit bei Fehlern keine Lizenznummer verbraucht wird
  perform public._check_login(p_admin_username, p_admin_password, 10);

  insert into public.organizations (name, max_users, valid_until, note)
  values (trim(p_name), p_max_users, p_valid_until, coalesce(trim(p_note), ''))
  returning id, license_id into v_org, v_lic;

  insert into public.employees (org_id, display_name, role, color)
  values (v_org, coalesce(nullif(trim(p_admin_name), ''), lower(trim(p_admin_username))), 'admin', '#8a5a2b')
  returning id into v_emp;
  perform public._create_login(v_org, v_emp, p_admin_username, p_admin_password);

  return v_lic;
end $$;

create function public.owner_update_company(
  p_id uuid, p_name text, p_max_users int, p_valid_until date, p_active boolean, p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Lizenzen ändern.'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Bitte den Firmennamen angeben.'; end if;
  select count(*) into v_used from public.employees where org_id = p_id and user_id is not null;
  if coalesce(p_max_users, 0) < greatest(v_used, 1) then
    raise exception 'Es sind schon % Anmeldungen belegt – das Limit kann nicht kleiner sein.', v_used;
  end if;
  update public.organizations
     set name = trim(p_name), max_users = p_max_users, valid_until = p_valid_until,
         active = coalesce(p_active, true), note = coalesce(trim(p_note), '')
   where id = p_id;
  if not found then raise exception 'Firma nicht gefunden.'; end if;
end $$;

create function public.owner_set_admin_password(p_id uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf das.'; end if;
  if length(coalesce(p_password, '')) < 10 then raise exception 'Passwort: mindestens 10 Zeichen.'; end if;
  select user_id into v_uid from public.employees
   where org_id = p_id and role = 'admin' and user_id is not null order by created_at limit 1;
  if v_uid is null then raise exception 'Diese Firma hat keinen Admin mit Anmeldung.'; end if;
  perform public._set_password(v_uid, p_password);
end $$;

-- Firma mit allen Daten löschen; zur Sicherheit muss die Lizenz-ID mitgegeben werden
create function public.owner_delete_company(p_id uuid, p_confirm text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lic text;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Firmen löschen.'; end if;
  select license_id into v_lic from public.organizations where id = p_id;
  if v_lic is null then raise exception 'Firma nicht gefunden.'; end if;
  if upper(trim(coalesce(p_confirm, ''))) <> v_lic then raise exception 'Lizenz-ID stimmt nicht – nichts gelöscht.'; end if;
  delete from auth.users where id in (select user_id from public.employees where org_id = p_id and user_id is not null);
  delete from public.organizations where id = p_id;   -- Mitarbeiter, Aufträge, Feiertage mit
end $$;

-- ---------------------------------------------------------------- Firmen-Admin: Mitarbeiterverwaltung

-- Firma des Admins, wenn er schreiben darf; sonst Fehler
create function public._admin_org() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.employees
   where user_id = auth.uid() and role = 'admin' and org_id = public.my_org();
  if v_org is null then raise exception 'Nur der Admin darf Mitarbeiter verwalten.'; end if;
  if not public.org_writable() then raise exception 'Die Lizenz ist abgelaufen – bitte an JoKe Smart Solutions wenden.'; end if;
  return v_org;
end $$;

-- Mitarbeiter ohne Anmeldung („Dummy“) anlegen
create function public.admin_add_employee(p_display_name text, p_color text default '#2f6fa8') returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
  v_id  uuid;
begin
  if length(trim(coalesce(p_display_name, ''))) = 0 then raise exception 'Bitte einen Namen angeben.'; end if;
  insert into public.employees (org_id, display_name, color)
  values (v_org, trim(p_display_name), coalesce(p_color, '#2f6fa8'))
  returning id into v_id;
  return v_id;
end $$;

-- Mitarbeiter mit Anmeldung anlegen
create function public.admin_create_user(
  p_username text, p_password text, p_display_name text, p_color text default '#2f6fa8'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
  v_id  uuid;
begin
  insert into public.employees (org_id, display_name, color)
  values (v_org, coalesce(nullif(trim(p_display_name), ''), lower(trim(p_username))), coalesce(p_color, '#2f6fa8'))
  returning id into v_id;
  perform public._create_login(v_org, v_id, p_username, p_password);
  return v_id;
end $$;

-- Bestehendem Mitarbeiter (Dummy) eine Anmeldung geben
create function public.admin_create_login(p_id uuid, p_username text, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._create_login(public._admin_org(), p_id, p_username, p_password);
end $$;

-- Anmeldung entfernen: Mitarbeiter bleibt mit allen Terminen als Dummy erhalten, Lizenzplatz wird frei
create function public.admin_remove_login(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
  v_uid uuid;
begin
  select user_id into v_uid from public.employees where id = p_id and org_id = v_org and role = 'user';
  if v_uid is null then raise exception 'Mitarbeiter nicht gefunden oder ohne Anmeldung.'; end if;
  update public.employees set user_id = null, username = null where id = p_id;
  delete from auth.users where id = v_uid;
end $$;

create function public.admin_set_password(p_id uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
  v_uid uuid;
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'Passwort: mindestens 8 Zeichen.'; end if;
  select user_id into v_uid from public.employees where id = p_id and org_id = v_org and role = 'user';
  if v_uid is null then raise exception 'Mitarbeiter nicht gefunden oder ohne Anmeldung.'; end if;
  perform public._set_password(v_uid, p_password);
end $$;

-- Mitarbeiter ganz löschen (wird aus allen Aufträgen entfernt)
create function public.admin_delete_employee(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
  v_emp public.employees;
begin
  select * into v_emp from public.employees where id = p_id and org_id = v_org;
  if not found then raise exception 'Mitarbeiter nicht gefunden.'; end if;
  if v_emp.role = 'admin' then raise exception 'Der Admin kann nicht gelöscht werden.'; end if;
  update public.jobs set wer = array_remove(wer, p_id) where org_id = v_org and p_id = any (wer);
  delete from public.employees where id = p_id;
  if v_emp.user_id is not null then delete from auth.users where id = v_emp.user_id; end if;
end $$;

-- ---------------------------------------------------------------- Ausführungsrechte

revoke execute on function public._check_login(text, text, int)                      from public, anon, authenticated;
revoke execute on function public._create_login(uuid, uuid, text, text)              from public, anon, authenticated;
revoke execute on function public._set_password(uuid, text)                          from public, anon, authenticated;
revoke execute on function public._admin_org()                                       from public, anon, authenticated;
revoke execute on function public.is_owner()                                         from public, anon;
revoke execute on function public.owner_companies()                                  from public, anon;
revoke execute on function public.owner_create_company(text, int, date, text, text, text, text) from public, anon;
revoke execute on function public.owner_update_company(uuid, text, int, date, boolean, text)    from public, anon;
revoke execute on function public.owner_set_admin_password(uuid, text)               from public, anon;
revoke execute on function public.owner_delete_company(uuid, text)                   from public, anon;
revoke execute on function public.admin_add_employee(text, text)                     from public, anon;
revoke execute on function public.admin_create_user(text, text, text, text)          from public, anon;
revoke execute on function public.admin_create_login(uuid, text, text)               from public, anon;
revoke execute on function public.admin_remove_login(uuid)                           from public, anon;
revoke execute on function public.admin_set_password(uuid, text)                     from public, anon;
revoke execute on function public.admin_delete_employee(uuid)                        from public, anon;

grant execute on function public.is_owner()                                          to authenticated;
grant execute on function public.owner_companies()                                   to authenticated;
grant execute on function public.owner_create_company(text, int, date, text, text, text, text) to authenticated;
grant execute on function public.owner_update_company(uuid, text, int, date, boolean, text)    to authenticated;
grant execute on function public.owner_set_admin_password(uuid, text)                to authenticated;
grant execute on function public.owner_delete_company(uuid, text)                    to authenticated;
grant execute on function public.admin_add_employee(text, text)                      to authenticated;
grant execute on function public.admin_create_user(text, text, text, text)           to authenticated;
grant execute on function public.admin_create_login(uuid, text, text)                to authenticated;
grant execute on function public.admin_remove_login(uuid)                            to authenticated;
grant execute on function public.admin_set_password(uuid, text)                      to authenticated;
grant execute on function public.admin_delete_employee(uuid)                         to authenticated;

-- ---------------------------------------------------------------- Live-Aktualisierung

alter publication supabase_realtime add table public.jobs, public.holidays, public.employees, public.organizations;
