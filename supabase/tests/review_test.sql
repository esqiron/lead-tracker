-- Weekly review: candidates, sessions, answers and who may do what. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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
-- Runs SQL as a user, for throws_ok.
create function tests.as_user_sql(p_uid uuid, p_sql text) returns text
language sql as $$ select format('select tests.as_user_value(%L, %L)', p_uid, p_sql) $$;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'member@test.local', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'viewer@test.local', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.s2', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 2), true);
select set_config('test.s3', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 3), true);
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member'),
  (current_setting('test.org')::uuid, '44444444-4444-4444-4444-444444444444', 'viewer');

-- r1: owner's, close date passed. r2: owner's, looks fine. r3: member's, with a
-- next step the owner wrote. r4: owner's, quiet for 20 days. r5: nobody's.
insert into public.leads (id, org_id, title, owner_id, stage_id, value, expected_close_date) values
  ('bbbbbbbb-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Late', '11111111-1111-1111-1111-111111111111', current_setting('test.s3')::uuid, 10000, current_date - 7),
  ('bbbbbbbb-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'Fine', '11111111-1111-1111-1111-111111111111', current_setting('test.s2')::uuid, 20000, current_date + 30),
  ('bbbbbbbb-0000-0000-0000-000000000003', current_setting('test.org')::uuid, 'Member deal', '33333333-3333-3333-3333-333333333333', current_setting('test.s2')::uuid, 5000, current_date + 10),
  ('bbbbbbbb-0000-0000-0000-000000000004', current_setting('test.org')::uuid, 'Quiet', '11111111-1111-1111-1111-111111111111', current_setting('test.s2')::uuid, 8000, current_date + 20),
  ('bbbbbbbb-0000-0000-0000-000000000005', current_setting('test.org')::uuid, 'Unowned', null, current_setting('test.s2')::uuid, 1000, null);
insert into public.activities (org_id, type, lead_id, body, due_at, assigned_to, created_by) values
  (current_setting('test.org')::uuid, 'task', 'bbbbbbbb-0000-0000-0000-000000000001', 'Chase', now() + interval '2 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  (current_setting('test.org')::uuid, 'task', 'bbbbbbbb-0000-0000-0000-000000000002', 'Send contract', now() + interval '2 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  (current_setting('test.org')::uuid, 'task', 'bbbbbbbb-0000-0000-0000-000000000003', 'Owner wrote this', now() + interval '2 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  (current_setting('test.org')::uuid, 'task', 'bbbbbbbb-0000-0000-0000-000000000004', 'Ping them', now() + interval '2 days', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');
update public.leads set created_at = now() - interval '20 days' where id = 'bbbbbbbb-0000-0000-0000-000000000004';
update public.lead_stage_history set changed_at = now() - interval '20 days' where lead_id = 'bbbbbbbb-0000-0000-0000-000000000004';

-- Candidates
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select string_agg(title, ',') from public.review_candidates(%L, 'mine')$$, current_setting('test.org'))),
  'Late,Quiet,Fine', 'mine: my open deals, needing a look first, furthest stage first');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select reasons::text from public.review_candidates(%L, 'mine') where title = 'Late'$$, current_setting('test.org'))),
  '{close_passed}', 'a passed close date needs a look');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select reasons::text from public.review_candidates(%L, 'mine') where title = 'Quiet'$$, current_setting('test.org'))),
  '{quiet}', 'a quiet deal needs a look');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select needs_look::text from public.review_candidates(%L, 'mine') where title = 'Fine'$$, current_setting('test.org'))),
  'false', 'a recent deal with a next step and a future close date looks fine');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select reasons::text from public.review_candidates(%L, 'everyone') where title = 'Unowned'$$, current_setting('test.org'))),
  '{no_next_step,no_owner}', 'everyone: includes deals nobody owns');

-- Who may start what
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333', format($$select public.start_review(%L, 'everyone')::text$$, current_setting('test.org'))),
  '42501', null, 'members cannot review everyone''s deals');
select throws_ok(tests.as_user_sql('44444444-4444-4444-4444-444444444444', format($$select public.start_review(%L, 'mine')::text$$, current_setting('test.org'))),
  '42501', null, 'viewers cannot start a review');

-- The owner's review
select set_config('test.sess', tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select public.start_review(%L, 'mine')::text$$, current_setting('test.org'))), true);
select is((select lead_count from public.review_sessions where id = current_setting('test.sess')::uuid), 3, 'a session counts the deals it covers');
select is((select forecast_before from public.review_sessions where id = current_setting('test.sess')::uuid),
  (select sum(l.value * s.probability / 100.0)::numeric(14, 2) from public.leads l join public.pipeline_stages s on s.id = l.stage_id
   where l.owner_id = '11111111-1111-1111-1111-111111111111' and l.status = 'open'),
  'the weighted forecast is recorded at the start');

select tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select public.review_lead(%L, %L, 'bbbbbbbb-0000-0000-0000-000000000001', '{"answer": "pushed", "close_to": "2030-01-15", "next": {"body": "Call and ask straight out"}}')::text$$,
  current_setting('test.org'), current_setting('test.sess')));
select is((select expected_close_date from public.leads where id = 'bbbbbbbb-0000-0000-0000-000000000001'), '2030-01-15'::date, 'pushing moves the close date');
select is((select close_from::text || '→' || close_to::text from public.lead_reviews where lead_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  (current_date - 7)::text || '→2030-01-15', 'the review records the old and new date');
select is((select body from public.activities where lead_id = 'bbbbbbbb-0000-0000-0000-000000000001' and type = 'task'), 'Call and ask straight out', 'the new next step replaces the old one');

select tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select public.review_lead(%L, %L, 'bbbbbbbb-0000-0000-0000-000000000004', '{"answer": "lost", "lost_reason": "Timing"}')::text$$,
  current_setting('test.org'), current_setting('test.sess')));
select is((select status || '/' || lost_reason from public.leads where id = 'bbbbbbbb-0000-0000-0000-000000000004'), 'lost/Timing', 'marking lost closes the deal with the reason');

-- Somebody else's session can't be used.
select throws_ok(tests.as_user_sql('33333333-3333-3333-3333-333333333333', format($$select public.review_lead(%L, %L, 'bbbbbbbb-0000-0000-0000-000000000003', '{"answer": "kept"}')::text$$,
  current_setting('test.org'), current_setting('test.sess'))), 'P0001', null, 'you can only answer in your own review');

select tests.as_user_value('11111111-1111-1111-1111-111111111111', format($$select public.finish_review(%L, %L)::text$$, current_setting('test.org'), current_setting('test.sess')));
select is((select answer from public.lead_reviews where lead_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'kept', 'finishing confirms the deals that looked fine');
select ok((select completed_at is not null and forecast_after < forecast_before from public.review_sessions where id = current_setting('test.sess')::uuid), 'finishing records the forecast after (lower, one deal lost)');
select throws_ok(tests.as_user_sql('11111111-1111-1111-1111-111111111111', format($$select public.review_lead(%L, %L, 'bbbbbbbb-0000-0000-0000-000000000002', '{"answer": "kept"}')::text$$,
  current_setting('test.org'), current_setting('test.sess'))), 'P0001', null, 'a finished review takes no more answers');

-- A member rewrites a next step they can't edit: a new one is added instead.
select set_config('test.msess', tests.as_user_value('33333333-3333-3333-3333-333333333333', format($$select public.start_review(%L, 'mine')::text$$, current_setting('test.org'))), true);
select tests.as_user_value('33333333-3333-3333-3333-333333333333', format($$select public.review_lead(%L, %L, 'bbbbbbbb-0000-0000-0000-000000000003', '{"answer": "kept", "next": {"body": "Book the workshop"}}')::text$$,
  current_setting('test.org'), current_setting('test.msess')));
select is((select string_agg(body, ',' order by body) from public.activities where lead_id = 'bbbbbbbb-0000-0000-0000-000000000003' and type = 'task'),
  'Book the workshop,Owner wrote this', 'a next step you can''t edit gets a new one alongside');
select is((select assigned_to from public.activities where body = 'Book the workshop'), '33333333-3333-3333-3333-333333333333'::uuid, 'assigned to the deal''s owner');

-- Visibility
select is(tests.as_user_value('33333333-3333-3333-3333-333333333333', 'select count(*) from public.review_sessions'), '1', 'members see only their own review sessions');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111', 'select count(*) from public.review_sessions'), '2', 'admins see everyone''s sessions');
select is(tests.as_user_value('55555555-5555-5555-5555-555555555555', 'select count(*) from public.lead_reviews'), '0', 'outsiders see no reviews');

select * from finish();
rollback;
