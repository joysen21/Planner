-- Planner: Benutzernamen und Passwörter verwalten
--   * Besitzer: Benutzername + Passwort aller Mitarbeiter mit Anmeldung jeder Firma (auch des Firmen-Admins)
--   * Firmen-Admin: Benutzernamen seiner Mitarbeiter (Passwörter konnte er schon setzen)
-- Im Supabase SQL Editor ausführen (nach 20261011000000_loeschrechte_darstellung.sql).

-- ---------------------------------------------------------------- intern: Benutzername ändern
-- Mitarbeiter-Eintrag und Anmelde-Adresse (benutzername@001.planer.local) werden gemeinsam geändert.
create or replace function public._set_username(p_emp uuid, p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user  text := lower(trim(coalesce(p_username, '')));
  v_emp   public.employees;
  v_nr    int;
  v_email text;
begin
  if v_user !~ '^[a-z0-9][a-z0-9._-]{1,29}$' then
    raise exception 'Benutzername: 2–30 Zeichen, nur a–z, 0–9, Punkt, Minus, Unterstrich.';
  end if;
  select * into v_emp from public.employees where id = p_emp;
  if not found or v_emp.user_id is null then raise exception 'Mitarbeiter nicht gefunden oder ohne Anmeldung.'; end if;
  if v_emp.username = v_user then return; end if;

  select nr into v_nr from public.organizations where id = v_emp.org_id;
  v_email := v_user || '@' || case when v_nr < 1000 then lpad(v_nr::text, 3, '0') else v_nr::text end || '.planer.local';
  if exists (select 1 from public.employees where org_id = v_emp.org_id and username = v_user and id <> p_emp)
     or exists (select 1 from auth.users where email = v_email and id <> v_emp.user_id) then
    raise exception 'Benutzername ist in dieser Firma schon vergeben.';
  end if;

  update public.employees set username = v_user where id = p_emp;
  update auth.users set email = v_email, updated_at = now() where id = v_emp.user_id;
  update auth.identities
     set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email)), updated_at = now()
   where user_id = v_emp.user_id and provider = 'email';
end $$;

-- ---------------------------------------------------------------- Besitzer
-- Alle Mitarbeiter einer Firma (für die Besitzer-Seite)
create or replace function public.owner_company_users(p_org uuid)
returns table (id uuid, display_name text, username text, role text, has_login boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, e.display_name, e.username, e.role, e.user_id is not null
    from public.employees e
   where public.is_owner() and e.org_id = p_org
   order by (e.role = 'admin') desc, e.display_name
$$;

create or replace function public.owner_set_username(p_emp uuid, p_username text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf das.'; end if;
  perform public._set_username(p_emp, p_username);
end $$;

-- Passwort setzen (Admins mind. 10, Mitarbeiter mind. 8 Zeichen)
create or replace function public.owner_set_password(p_emp uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_emp public.employees;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf das.'; end if;
  select * into v_emp from public.employees where id = p_emp;
  if not found or v_emp.user_id is null then raise exception 'Mitarbeiter nicht gefunden oder ohne Anmeldung.'; end if;
  if length(coalesce(p_password, '')) < case when v_emp.role = 'admin' then 10 else 8 end then
    raise exception 'Passwort: mindestens % Zeichen.', case when v_emp.role = 'admin' then 10 else 8 end;
  end if;
  perform public._set_password(v_emp.user_id, p_password);
end $$;

-- ---------------------------------------------------------------- Firmen-Admin
-- Benutzernamen der eigenen Mitarbeiter ändern (nicht den eigenen Admin-Benutzernamen – das macht der Besitzer)
create or replace function public.admin_set_username(p_id uuid, p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public._admin_org();
begin
  if not exists (select 1 from public.employees where id = p_id and org_id = v_org and role = 'user' and user_id is not null) then
    raise exception 'Mitarbeiter nicht gefunden oder ohne Anmeldung.';
  end if;
  perform public._set_username(p_id, p_username);
end $$;

-- ---------------------------------------------------------------- Ausführungsrechte
revoke execute on function public._set_username(uuid, text)        from public, anon, authenticated;
revoke execute on function public.owner_company_users(uuid)        from public, anon;
revoke execute on function public.owner_set_username(uuid, text)   from public, anon;
revoke execute on function public.owner_set_password(uuid, text)   from public, anon;
revoke execute on function public.admin_set_username(uuid, text)   from public, anon;
grant  execute on function public.owner_company_users(uuid)        to authenticated;
grant  execute on function public.owner_set_username(uuid, text)   to authenticated;
grant  execute on function public.owner_set_password(uuid, text)   to authenticated;
grant  execute on function public.admin_set_username(uuid, text)   to authenticated;
