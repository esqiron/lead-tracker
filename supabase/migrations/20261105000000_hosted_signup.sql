-- -----------------------------------------------------------------------------
-- Hosted sign-up: who accepted which version of the terms, and when.
--
-- Two separate acceptances, both recorded with the version of the legal pages
-- (LEGAL_UPDATED) they were given for:
--   terms_*            the terms of service, the data processing agreement
--                      (on the organization's behalf) and the privacy policy;
--   special_clauses_*  the express acceptance of the standard-term clauses
--                      that exclude liability, allow suspension and changes,
--                      and set law and courts (Romanian Civil Code art. 1203).
--
-- The app writes them on the profile (service role, at sign-up or when an
-- existing user creates an organization). A new organization copies them from
-- whoever creates it. Signed-in users can't change either copy, so the record
-- reflects what was accepted through the app.
--
-- Material changes to the terms are emailed to workspace owners; to find the
-- organizations on an older version:
--   select o.name, o.terms_version, p.email from public.organizations o
--   join public.memberships m on m.org_id = o.id and m.role = 'owner'
--   join public.profiles p on p.id = m.user_id
--   where o.terms_version is distinct from '<current LEGAL_UPDATED>';
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column terms_accepted_at timestamptz,
  add column terms_version text check (char_length(terms_version) <= 100),
  add column special_clauses_accepted_at timestamptz,
  add column special_clauses_version text check (char_length(special_clauses_version) <= 100);

alter table public.organizations
  add column terms_accepted_at timestamptz,
  add column terms_version text check (char_length(terms_version) <= 100),
  add column special_clauses_accepted_at timestamptz,
  add column special_clauses_version text check (char_length(special_clauses_version) <= 100),
  add column terms_accepted_by uuid references public.profiles (id) on delete set null;

create index organizations_terms_version_idx on public.organizations (terms_version);

-- Profiles: users may change their name and avatar, not their email, id or
-- the acceptance record.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'Email can only be changed through your account settings' using errcode = '42501';
    end if;
    if new.terms_accepted_at is distinct from old.terms_accepted_at
       or new.terms_version is distinct from old.terms_version
       or new.special_clauses_accepted_at is distinct from old.special_clauses_accepted_at
       or new.special_clauses_version is distinct from old.special_clauses_version then
      raise exception 'Terms acceptance can''t be changed directly' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- A new organization records its creator's acceptance, whatever the insert says.
create function public.organization_terms_from_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') or new.created_by is not null then
    -- No profile (or no acceptance) leaves them all null.
    select p.terms_accepted_at, p.terms_version, p.special_clauses_accepted_at, p.special_clauses_version,
           case when p.terms_accepted_at is not null then p.id end
      into new.terms_accepted_at, new.terms_version, new.special_clauses_accepted_at, new.special_clauses_version,
           new.terms_accepted_by
      from public.profiles p where p.id = new.created_by;
  end if;
  return new;
end;
$$;

create trigger organizations_terms_from_creator before insert on public.organizations
  for each row execute function public.organization_terms_from_creator();

create function public.guard_organization_terms()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.terms_accepted_at is distinct from old.terms_accepted_at
       or new.terms_version is distinct from old.terms_version
       or new.special_clauses_accepted_at is distinct from old.special_clauses_accepted_at
       or new.special_clauses_version is distinct from old.special_clauses_version
       or new.terms_accepted_by is distinct from old.terms_accepted_by) then
    raise exception 'Terms acceptance can''t be changed directly' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger organizations_guard_terms before update on public.organizations
  for each row execute function public.guard_organization_terms();
