-- start_conversation and log_activity: one-transaction capture from the inbox. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

create schema tests;
create function tests.as_user_value(p_uid uuid, p_sql text) returns text
language plpgsql as $$
declare
  v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute p_sql into v;
  execute 'reset role';
  return v;
end;
$$;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'viewer@test.local', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.qualified', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 2), true);
select set_config('test.lost', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and is_lost), true);
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '44444444-4444-4444-4444-444444444444', 'viewer');

-- A brand-new person, company, deal, first call and next step in one go.
select set_config('test.r1', tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$
  select public.start_conversation(%L, '{
    "person": {"first_name": "Jonas", "last_name": "Berg", "email": "Jonas.Berg@HaldenFerries.no", "title": "Head of Digital", "lawful_basis": "legitimate_interest"},
    "company_name": "Halden Ferries", "company_website": "https://haldenferries.no",
    "lead": {"title": "Passenger booking app", "value": "38000"},
    "first": {"type": "call", "body": "Met at the summit, called today.", "direction": "outbound", "outcome": "Reached"},
    "next": {"body": "Check the route list arrived", "due_at": "2030-01-10T09:00:00Z"}
  }')::text$$, current_setting('test.org'))), true);

select is((current_setting('test.r1')::jsonb ->> 'contact_created')::boolean, true, 'creates the person');
select is((current_setting('test.r1')::jsonb ->> 'company_created')::boolean, true, 'creates the company');
select is((select email from public.contacts where id = (current_setting('test.r1')::jsonb ->> 'contact_id')::uuid), 'jonas.berg@haldenferries.no', 'email is stored lowercase');
select is((select lawful_basis::text from public.contacts where id = (current_setting('test.r1')::jsonb ->> 'contact_id')::uuid), 'legitimate_interest', 'records the lawful basis');
select is((select company_id from public.contacts where id = (current_setting('test.r1')::jsonb ->> 'contact_id')::uuid), (current_setting('test.r1')::jsonb ->> 'company_id')::uuid, 'person belongs to the company');
select is((select s.position from public.leads l join public.pipeline_stages s on s.id = l.stage_id where l.id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid), 0, 'deal starts in the first stage');
select is((select owner_id from public.leads where id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid), '11111111-1111-1111-1111-111111111111'::uuid, 'the creator owns the deal by default');
select is((select outcome || '/' || direction from public.activities where lead_id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid and type = 'call'), 'Reached/outbound', 'logs the first call with outcome and direction');
select is((select folder from public.lead_threads where id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid), 'waiting', 'a new deal with a future next step waits on them');

-- The same email and company name again: both are reused, not duplicated.
select set_config('test.r2', tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$
  select public.start_conversation(%L, '{
    "person": {"first_name": "J.", "email": "jonas.berg@haldenferries.no"},
    "company_name": "halden ferries",
    "lead": {"title": "Crew scheduling", "stage_id": "%s"}
  }')::text$$, current_setting('test.org'), current_setting('test.qualified'))), true);
select is(current_setting('test.r2')::jsonb ->> 'contact_id', current_setting('test.r1')::jsonb ->> 'contact_id', 'reuses the person with the same email');
select is(current_setting('test.r2')::jsonb ->> 'company_id', current_setting('test.r1')::jsonb ->> 'company_id', 'reuses the company with the same name');
select is((select count(*)::int from public.contacts where org_id = current_setting('test.org')::uuid), 1, 'no duplicate person');
select is((select stage_id::text from public.leads where id = (current_setting('test.r2')::jsonb ->> 'lead_id')::uuid), current_setting('test.qualified'), 'uses the picked stage');

-- All or nothing: a bad stage leaves no new person behind.
select throws_ok(
  format('select tests.as_user_value(%L, %L)', '11111111-1111-1111-1111-111111111111',
    format('select public.start_conversation(%L, %L::jsonb)::text', current_setting('test.org'),
      '{"person": {"first_name": "Ghost"}, "lead": {"title": "x", "stage_id": "00000000-0000-0000-0000-000000000000"}}')),
  '23503', null, 'an invalid stage fails the whole call');
select is((select count(*)::int from public.contacts where first_name = 'Ghost'), 0, 'and nothing is left half-created');

-- Who may call it
select throws_ok(
  format('select tests.as_user_value(%L, %L)', '44444444-4444-4444-4444-444444444444',
    format('select public.start_conversation(%L, %L::jsonb)::text', current_setting('test.org'), '{"lead": {"title": "x"}}')),
  '42501', null, 'viewers cannot start conversations');
select throws_ok(
  format('select tests.as_user_value(%L, %L)', '55555555-5555-5555-5555-555555555555',
    format('select public.start_conversation(%L, %L::jsonb)::text', current_setting('test.org'), '{"lead": {"title": "x"}}')),
  '42501', null, 'outsiders cannot start conversations');

-- log_activity: an inbound email, a stage move, the old next step done and a new one set.
-- (Everything in this test shares one now(); the first call happened yesterday.)
update public.activities set created_at = now() - interval '1 day' where lead_id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid and type = 'call';
select tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$
  select public.log_activity(%L, jsonb_build_object(
    'lead_id', %L, 'type', 'email', 'body', 'They sent the route list.', 'direction', 'inbound',
    'move_to_stage_id', %L,
    'complete_task_id', (select id from public.activities where lead_id = %L and type = 'task'),
    'next', jsonb_build_object('body', 'Send pricing', 'due_at', '2030-01-12T09:00:00Z')))::text$$,
  current_setting('test.org'), current_setting('test.r1')::jsonb ->> 'lead_id', current_setting('test.qualified'), current_setting('test.r1')::jsonb ->> 'lead_id'));
select is((select next_task_body || '/' || reason from public.lead_threads where id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid),
  'Send pricing/inbound', 'logged inbound email puts it in Needs reply, with the new next step');
select is((select stage_id::text from public.leads where id = (current_setting('test.r1')::jsonb ->> 'lead_id')::uuid), current_setting('test.qualified'), 'moves the deal');

-- Marking lost through the composer keeps the reason.
select tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$
  select public.log_activity(%L, jsonb_build_object('lead_id', %L, 'type', 'note', 'body', 'Budget cut.', 'move_to_stage_id', %L, 'lost_reason', 'No budget'))::text$$,
  current_setting('test.org'), current_setting('test.r2')::jsonb ->> 'lead_id', current_setting('test.lost')));
select is((select status || '/' || lost_reason from public.leads where id = (current_setting('test.r2')::jsonb ->> 'lead_id')::uuid), 'lost/No budget', 'marks lost with the reason');

select * from finish();
rollback;
