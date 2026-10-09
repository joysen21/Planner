-- Auftragsplaner: Grundschema
-- Im Supabase SQL Editor einmal komplett ausführen.
--
-- Anmeldung:
--   * Der Admin meldet sich mit E-Mail + Passwort an (Benutzer im Dashboard anlegen).
--     Beim ersten Login wird er automatisch Admin (claim_admin), solange es noch keinen Admin gibt.
--   * Weitere Benutzer legt der Admin in der App an (admin_create_user). Sie melden sich nur mit
--     Benutzername + Passwort an; intern wird daraus die Adresse <benutzername>@planer.local.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- Tabellen

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9._-]{2,30}$'),
  display_name text not null check (length(trim(display_name)) > 0),
  role         text not null default 'user' check (role in ('admin', 'user')),
  color        text not null default '#2f6fa8' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at   timestamptz not null default now()
);

create table public.jobs (
  id         uuid primary key default gen_random_uuid(),
  kunde      text not null default '',
  adresse    text not null default '',
  tel        text not null default '',
  art        text not null default 'montage'
             check (art in ('montage', 'werkstatt', 'planung', 'termin', 'urlaub')),
  wer        uuid[] not null default '{}',
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
create index jobs_wer_idx on public.jobs using gin (wer);
create index jobs_start_idx on public.jobs (start);

create table public.holidays (
  d date primary key,
  n text not null
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger jobs_touch before update on public.jobs
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- Hilfsfunktionen

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------------------------------------------------------------- Zeilenrechte (RLS)

alter table public.profiles enable row level security;
alter table public.jobs     enable row level security;
alter table public.holidays enable row level security;

create policy profiles_read   on public.profiles for select to authenticated using (public.is_member());
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy jobs_read   on public.jobs for select to authenticated using (public.is_member());
create policy jobs_insert on public.jobs for insert to authenticated with check (public.is_member());
create policy jobs_update on public.jobs for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy jobs_delete on public.jobs for delete to authenticated using (public.is_member());

create policy holidays_read  on public.holidays for select to authenticated using (public.is_member());
create policy holidays_write on public.holidays for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Rolle und Benutzername nur über die Admin-Funktionen ändern
revoke update on public.profiles from authenticated;
grant update (display_name, color) on public.profiles to authenticated;

-- ---------------------------------------------------------------- Erster Admin

create function public.claim_admin() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_user  text;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then return true; end if;

  perform pg_advisory_xact_lock(hashtext('planer_claim_admin'));
  if exists (select 1 from public.profiles where role = 'admin') then return false; end if;

  select email into v_email from auth.users where id = auth.uid();
  if v_email is null or v_email like '%@planer.local' then return false; end if;

  v_user := left(regexp_replace(lower(split_part(v_email, '@', 1)), '[^a-z0-9._-]', '', 'g'), 30);
  if length(v_user) < 2 or exists (select 1 from public.profiles where username = v_user) then
    v_user := 'admin';
  end if;

  insert into public.profiles (id, username, display_name, role, color)
  values (auth.uid(), v_user, split_part(v_email, '@', 1), 'admin', '#8a5a2b');
  return true;
end $$;

-- ---------------------------------------------------------------- Benutzerverwaltung (nur Admin)

create function public.admin_create_user(
  p_username text, p_password text, p_display_name text, p_color text default '#2f6fa8'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id    uuid := gen_random_uuid();
  v_user  text := lower(trim(p_username));
  v_email text;
begin
  if not public.is_admin() then raise exception 'Nur der Admin darf Benutzer anlegen.'; end if;
  if v_user !~ '^[a-z0-9._-]{2,30}$' then
    raise exception 'Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich.';
  end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Passwort: mindestens 6 Zeichen.'; end if;

  v_email := v_user || '@planer.local';
  if exists (select 1 from public.profiles where username = v_user)
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

  insert into public.profiles (id, username, display_name, role, color)
  values (v_id, v_user, coalesce(nullif(trim(p_display_name), ''), v_user), 'user', p_color);

  return v_id;
end $$;

create function public.admin_set_password(p_id uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nur der Admin darf Passwörter setzen.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Passwort: mindestens 6 Zeichen.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Benutzer nicht gefunden.'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_id;
end $$;

create function public.admin_delete_user(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nur der Admin darf Benutzer löschen.'; end if;
  if p_id = auth.uid() then raise exception 'Du kannst dich nicht selbst löschen.'; end if;
  update public.jobs set wer = array_remove(wer, p_id) where p_id = any (wer);
  delete from auth.users where id = p_id;  -- löscht Profil + Anmeldedaten mit
end $$;

revoke execute on function public.claim_admin()                              from public, anon;
revoke execute on function public.admin_create_user(text, text, text, text)  from public, anon;
revoke execute on function public.admin_set_password(uuid, text)             from public, anon;
revoke execute on function public.admin_delete_user(uuid)                    from public, anon;
grant  execute on function public.claim_admin()                              to authenticated;
grant  execute on function public.admin_create_user(text, text, text, text)  to authenticated;
grant  execute on function public.admin_set_password(uuid, text)             to authenticated;
grant  execute on function public.admin_delete_user(uuid)                    to authenticated;

-- ---------------------------------------------------------------- Live-Aktualisierung

alter publication supabase_realtime add table public.jobs, public.holidays, public.profiles;
