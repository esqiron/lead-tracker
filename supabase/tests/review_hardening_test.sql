-- Review hardening: forged or moved review sessions, cross-org review answers,
-- goals for non-members, and what the exports include. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

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
-- Runs SQL as a user, for throws_ok.
create function tests.as_user_sql(p_uid uuid, p_sql text) returns text
language sql as $$ select format('select tests.as_user_value(%L, %L)', p_uid, p_sql) $$;

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

-- Org A: owner 1, member 3 (who is also a viewer in org B). Org B: owner 6.
insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated', now()),
  ('33333333-3333-3333-3333-333333333333', 'member@test.local', 'authenticated', 'authenticated', now()),
  ('66666666-6666-6666-6666-666666666666', 'other@test.local', 'authenticated', 'authenticated', now());

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.other_org', tests.as_user_value('66666666-6666-6666-6666-666666666666', $$select public.create_organization('Other')::text$$), true);
select set_config('test.stage', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 1), true);
select set_config('test.other_stage', (select id::text from public.pipeline_stages where org_id = current_setting('test.other_org')::uuid and position = 1), true);
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member'),
  (current_setting('test.other_org')::uuid, '33333333-3333-3333-3333-333333333333', 'viewer');

insert into public.contacts (id, org_id, first_name, owner_id) values
  ('cccccccc-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Pat', '33333333-3333-3333-3333-333333333333');
insert into public.leads (id, org_id, title, contact_id, owner_id, stage_id, value) values
  ('bbbbbbbb-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Member deal', 'cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', current_setting('test.stage')::uuid, 1000),
  ('bbbbbbbb-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'Owner deal', null, '11111111-1111-1111-1111-111111111111', current_setting('test.stage')::uuid, 50000),
  ('bbbbbbbb-0000-0000-0000-00000000000b', current_setting('test.other_org')::uuid, 'Other org deal', null, '66666666-6666-6666-6666-666666666666', current_setting('test.other_stage')::uuid, 999);
insert into public.activities (id, org_id, type, lead_id, contact_id, body, direction, created_by) values
  ('dddddddd-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'email', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'They wrote', 'inbound', '33333333-3333-3333-3333-333333333333');
insert into public.activities (id, org_id, type, lead_id, body, assigned_to, created_by) values
  ('dddddddd-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'task', 'bbbbbbbb-0000-0000-0000-000000000002', 'Owner task', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('dddddddd-0000-0000-0000-00000000000b', current_setting('test.other_org')::uuid, 'task', 'bbbbbbbb-0000-0000-0000-00000000000b', 'Other org task', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666');

-- -----------------------------------------------------------------------------
-- 1. Review sessions
-- -----------------------------------------------------------------------------
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$insert into public.review_sessions (org_id, scope) values (%L, 'everyone') returning id::text$$, current_setting('test.org'))),
  '42501', null, 'members can''t start an everyone review by writing the table directly');

select set_config('test.sess', tests.as_user_value('33333333-3333-3333-3333-333333333333',
  format($$insert into public.review_sessions (org_id, scope, lead_count, forecast_before, forecast_after, started_at, completed_at)
           values (%L, 'mine', 999, 123456, 1, '2020-01-01', '2020-01-02') returning id::text$$, current_setting('test.org'))), true);
select is((select lead_count from public.review_sessions where id = current_setting('test.sess')::uuid), 1, 'the deal count is worked out by the database');
select ok((select forecast_before <> 123456 and forecast_after is null and completed_at is null and started_at = now()
           from public.review_sessions where id = current_setting('test.sess')::uuid),
  'forecast, start time and completion can''t be forged on insert');

select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$update public.review_sessions set org_id = %L where id = %L returning id::text$$, current_setting('test.other_org'), current_setting('test.sess'))),
  '42501', null, 'a session can''t be moved to another org (where the user is a viewer)');
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$update public.review_sessions set scope = 'everyone' where id = %L returning id::text$$, current_setting('test.sess'))),
  '42501', null, 'the scope can''t be widened after starting');
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$update public.review_sessions set lead_count = 999 where id = %L returning id::text$$, current_setting('test.sess'))),
  '42501', null, 'the deal count can''t be changed');
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$update public.review_sessions set forecast_after = 1e9 where id = %L returning id::text$$, current_setting('test.sess'))),
  '42501', null, 'the forecast after can''t be set on an open review');

-- Finishing directly: the time and forecast come from the database.
select tests.as_user_value('33333333-3333-3333-3333-333333333333',
  format($$update public.review_sessions set completed_at = '2020-01-01', forecast_after = 1e9 where id = %L returning id::text$$, current_setting('test.sess')));
select ok((select completed_at = now() and forecast_after = public.review_forecast(org_id, scope)
           from public.review_sessions where id = current_setting('test.sess')::uuid),
  'finishing records the database time and the real forecast');
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$update public.review_sessions set completed_at = null where id = %L returning id::text$$, current_setting('test.sess'))),
  '42501', null, 'a finished review can''t be reopened');

-- The RPCs still work.
select set_config('test.sess2', tests.as_user_value('33333333-3333-3333-3333-333333333333',
  format($$select public.start_review(%L, 'mine')::text$$, current_setting('test.org'))), true);
select is((select lead_count from public.review_sessions where id = current_setting('test.sess2')::uuid), 1, 'start_review still records the deal count');

-- -----------------------------------------------------------------------------
-- 2. Review answers
-- -----------------------------------------------------------------------------
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$insert into public.lead_reviews (org_id, session_id, lead_id, answer, next_task_id) values (%L, %L, 'bbbbbbbb-0000-0000-0000-000000000001', 'kept', 'dddddddd-0000-0000-0000-00000000000b') returning id::text$$,
      current_setting('test.org'), current_setting('test.sess2'))),
  '42501', null, 'an answer can''t point at another org''s task');
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$insert into public.lead_reviews (org_id, session_id, lead_id, answer, next_task_id) values (%L, %L, 'bbbbbbbb-0000-0000-0000-000000000001', 'kept', gen_random_uuid()) returning id::text$$,
      current_setting('test.org'), current_setting('test.sess2'))),
  '42501', null, 'an unknown task id gets the same error (no existence check across orgs)');
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333',
    format($$insert into public.lead_reviews (org_id, session_id, lead_id, answer, next_task_id) values (%L, %L, 'bbbbbbbb-0000-0000-0000-000000000001', 'kept', 'dddddddd-0000-0000-0000-000000000002') returning id::text$$,
      current_setting('test.org'), current_setting('test.sess2'))),
  '42501', null, 'an answer can''t point at a task on another deal');
select throws_ok(
  format($$insert into public.lead_reviews (org_id, session_id, lead_id, answer, next_task_id) values (%L, %L, 'bbbbbbbb-0000-0000-0000-000000000001', 'kept', 'dddddddd-0000-0000-0000-00000000000b')$$,
    current_setting('test.org'), current_setting('test.sess2')),
  '23503', null, 'the composite key keeps even trusted writes inside the org');

select tests.as_user_value('33333333-3333-3333-3333-333333333333',
  format($$insert into public.lead_reviews (org_id, session_id, lead_id, answer, reviewed_at) values (%L, %L, 'bbbbbbbb-0000-0000-0000-000000000001', 'kept', '2020-01-01') returning id::text$$,
    current_setting('test.org'), current_setting('test.sess2')));
select is((select reviewed_at from public.lead_reviews where session_id = current_setting('test.sess2')::uuid), now(), 'reviewed_at is the database time');

-- -----------------------------------------------------------------------------
-- 3. Goals
-- -----------------------------------------------------------------------------
select throws_ok(tests.as_user_sql('11111111-1111-1111-1111-111111111111',
    format($$insert into public.goals (org_id, user_id, period_start, amount) values (%L, '66666666-6666-6666-6666-666666666666', date_trunc('quarter', current_date)::date, 5) returning id::text$$, current_setting('test.org'))),
  '23503', null, 'a goal can''t be set for someone outside the org');
select throws_ok(tests.as_user_sql('11111111-1111-1111-1111-111111111111',
    format($$select public.set_goals(%L, date_trunc('quarter', current_date)::date, '[{"user_id": "66666666-6666-6666-6666-666666666666", "amount": 5}]')::text$$, current_setting('test.org'))),
  '23503', null, 'set_goals refuses non-members too');

select set_config('test.goal', tests.as_user_value('11111111-1111-1111-1111-111111111111',
  format($$insert into public.goals (org_id, user_id, period_start, amount, updated_by) values (%L, '33333333-3333-3333-3333-333333333333', date_trunc('quarter', current_date)::date, 5, '33333333-3333-3333-3333-333333333333') returning id::text$$, current_setting('test.org'))), true);
select is((select updated_by from public.goals where id = current_setting('test.goal')::uuid), '11111111-1111-1111-1111-111111111111'::uuid, 'updated_by is whoever added the goal');
select tests.as_user_value('11111111-1111-1111-1111-111111111111',
  format($$update public.goals set amount = 6, updated_by = '33333333-3333-3333-3333-333333333333' where id = %L returning id::text$$, current_setting('test.goal')));
select is((select updated_by from public.goals where id = current_setting('test.goal')::uuid), '11111111-1111-1111-1111-111111111111'::uuid, 'updated_by is whoever changed the goal');

-- -----------------------------------------------------------------------------
-- 4. Exports
-- -----------------------------------------------------------------------------
select set_config('test.contact_export', tests.as_user_value('11111111-1111-1111-1111-111111111111',
  $$select public.export_contact_data('cccccccc-0000-0000-0000-000000000001')::text$$), true);
select is(current_setting('test.contact_export')::jsonb #>> '{activities,0,direction}', 'inbound', 'the contact export includes which way an email went');
select is(jsonb_array_length(current_setting('test.contact_export')::jsonb -> 'reviews'), 1, 'the contact export includes review answers on their deals');

select ok(tests.as_user_value('11111111-1111-1111-1111-111111111111',
    format($$select public.export_org_data(%L)::text$$, current_setting('test.org')))::jsonb ?& array['dashboards', 'goals', 'review_sessions', 'lead_reviews'],
  'the full export includes dashboards, goals and reviews');
select is(jsonb_array_length(tests.as_user_value('11111111-1111-1111-1111-111111111111',
    format($$select public.export_org_data(%L)::text$$, current_setting('test.org')))::jsonb -> 'review_sessions'), 2, 'the full export lists the org''s review sessions');

select * from finish();
rollback;
