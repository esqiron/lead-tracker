-- Inbound capture functions. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- These tests create several organizations, like a hosted instance.
update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

-- Runs SQL as a database role (and optional JWT subject), then switches back.
create schema tests;
create function tests.as_role(p_role text, p_sql text, p_sub uuid default null) returns text
language plpgsql as $$
declare
  v text;
begin
  if p_sub is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', p_role)::text, true);
  end if;
  execute format('set local role %I', p_role);
  execute p_sql into v;
  execute 'reset role';
  return v;
end;
$$;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'rep1@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'rep2@test.local', 'authenticated', 'authenticated');

-- An org created the normal way, then two more members.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.org', public.create_organization('Acme')::text, true);
reset role;
insert into public.memberships (org_id, user_id, role, created_at) values
  (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'member', now() + interval '1 second'),
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member', now() + interval '2 seconds');

insert into public.capture_forms (id, org_id, name, round_robin, consent_text)
values ('ffffffff-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Contact form', true, 'I agree.');

-- Permissions
select throws_ok(
  format('select tests.as_role(%L, %L, %L)', 'authenticated',
    format('select public.capture_lead(%L, %L)::text', current_setting('test.org'), '{"email":"x@test.local"}'),
    '11111111-1111-1111-1111-111111111111'),
  '42501', null, 'signed-in users cannot call capture_lead directly');
select throws_ok(
  $$select tests.as_role('anon', 'select public.hit_rate_limit(''x'', 1, 60)::text')$$,
  '42501', null, 'anonymous users cannot call the rate limiter');

-- Basic capture (as the server does it)
set local role service_role;
select set_config('test.r1', public.capture_lead(
  current_setting('test.org')::uuid,
  '{"first_name":"Ana","last_name":"Pop","email":"Ana@Example.com","company":"Northwind","message":"Hi there","stage":"qualified","source":"Webinar","tags":["VIP"]}'
)::text, true);
reset role;

select is((current_setting('test.r1')::jsonb ->> 'contact_created')::boolean, true, 'creates a new contact');
select is((select email from public.contacts where id = (current_setting('test.r1')::jsonb ->> 'contact_id')::uuid), 'ana@example.com', 'email is stored lowercased');
select is((select s.name from public.leads l join public.pipeline_stages s on s.id = l.stage_id where l.id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid), 'Qualified', 'stage is matched by name, case-insensitively');
select is((select count(*)::int from public.lead_sources where org_id = current_setting('test.org')::uuid and name = 'Webinar'), 0, 'unknown sources are not created from outside');
select is((select count(*)::int from public.companies where org_id = current_setting('test.org')::uuid and name = 'Northwind'), 1, 'the company is created');
select is((select body from public.activities where lead_id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid), 'Hi there', 'the message is saved as a note');
select is((current_setting('test.r1')::jsonb ->> 'owner_id')::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'without a form, the org owner gets the lead');

-- Same email again: contact reused, empty fields filled, tags merged
set local role service_role;
select set_config('test.r2', public.capture_lead(
  current_setting('test.org')::uuid,
  '{"email":"ana@example.com","phone":"+40 700","first_name":"Someone Else","stage":"does not exist","tags":["newsletter"],"owner_email":"rep2@test.local"}'
)::text, true);
reset role;

select is(current_setting('test.r2')::jsonb ->> 'contact_id', current_setting('test.r1')::jsonb ->> 'contact_id', 'an existing contact is reused by email');
select is((select first_name || '|' || coalesce(phone, '-') from public.contacts where id = (current_setting('test.r2')::jsonb ->> 'contact_id')::uuid), 'Ana|-', 'an existing contact is never modified by capture');
select is((select array_to_string(tags, ',') from public.contacts where id = (current_setting('test.r2')::jsonb ->> 'contact_id')::uuid), 'vip', 'tags of an existing contact are not changed');
select is((select s.name from public.leads l join public.pipeline_stages s on s.id = l.stage_id where l.id = (current_setting('test.r2')::jsonb ->> 'lead_id')::uuid), 'New', 'an unknown stage falls back to the first open stage');
select is((current_setting('test.r2')::jsonb ->> 'owner_id')::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'owner_email assigns the lead to that member');

-- Round robin through the form cycles owner → rep1 → rep2 → owner
set local role service_role;
select set_config('test.rr', (
  select string_agg(public.capture_lead(current_setting('test.org')::uuid, jsonb_build_object('email', 'rr' || i || '@test.local'), 'ffffffff-0000-0000-0000-000000000001') ->> 'owner_id', ',' order by i)
  from generate_series(1, 4) i
), true);
reset role;
select is(
  current_setting('test.rr'),
  '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222,33333333-3333-3333-3333-333333333333,11111111-1111-1111-1111-111111111111',
  'round robin takes turns across members');

-- Consent is recorded with the form's text
set local role service_role;
select set_config('test.r3', public.capture_lead(current_setting('test.org')::uuid, '{"email":"consent@test.local","consent":true}', 'ffffffff-0000-0000-0000-000000000001')::text, true);
reset role;
select is(
  (select consent_text || '|' || consent_source from public.contacts where id = (current_setting('test.r3')::jsonb ->> 'contact_id')::uuid),
  'I agree.|form:' || (select public_id from public.capture_forms where id = 'ffffffff-0000-0000-0000-000000000001'),
  'consent text and form are recorded on the contact');

-- Won/lost stages and viewers can't be targeted from outside
insert into auth.users (id, email, aud, role) values ('44444444-4444-4444-4444-444444444444', 'viewer@test.local', 'authenticated', 'authenticated');
insert into public.memberships (org_id, user_id, role) values (current_setting('test.org')::uuid, '44444444-4444-4444-4444-444444444444', 'viewer');
set local role service_role;
select set_config('test.r4', public.capture_lead(current_setting('test.org')::uuid, '{"email":"x4@test.local","stage":"Won","owner_email":"viewer@test.local","message":"hello"}')::text, true);
reset role;
select is((select s.name from public.leads l join public.pipeline_stages s on s.id = l.stage_id where l.id = (current_setting('test.r4')::jsonb ->> 'lead_id')::uuid), 'New', 'capture cannot put a lead straight into Won');
select isnt((current_setting('test.r4')::jsonb ->> 'owner_id')::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'capture cannot assign leads to a viewer');

-- Rate limiting
set local role service_role;
select set_config('test.rl', (select string_agg(public.hit_rate_limit('test-bucket', 2, 60)::text, ',') from generate_series(1, 3)), true);
reset role;
select is(current_setting('test.rl'), 'true,true,false', 'the third hit over a limit of 2 is refused');

-- Anonymous visitors can't read forms directly
select is(tests.as_role('anon', 'select count(*)::text from public.capture_forms'), '0', 'forms are not readable anonymously');

select * from finish();
rollback;
