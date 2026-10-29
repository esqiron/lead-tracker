-- Inbox folder rules (lead_threads view) and who can see which threads. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

-- Runs SQL as a given user (authenticated role + JWT sub), then switches back.
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

-- The folder (and reason) of one lead, read as the org owner.
create function tests.folder(p_lead uuid) returns text
language sql as $$
  select coalesce(folder, '-') || '/' || coalesce(reason, '-') from public.lead_threads where id = p_lead
$$;

-- Backdates a lead so it looks untouched for p_days (creation and stage history).
create function tests.age(p_lead uuid, p_days int) returns void
language sql as $$
  update public.leads set created_at = now() - make_interval(days => p_days) where id = p_lead;
  update public.lead_stage_history set changed_at = now() - make_interval(days => p_days) where lead_id = p_lead;
$$;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'member@test.local', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.open', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 0), true);
select set_config('test.won', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and is_won), true);
select set_config('test.lost', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and is_lost), true);
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member');

-- Leads, all owned by the owner unless noted. Inserted as postgres (trusted), so
-- created_at/closed_at can be set directly.
insert into public.leads (id, org_id, title, owner_id, stage_id, closed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Unowned', null, current_setting('test.open')::uuid, null),
  ('aaaaaaaa-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'They wrote', '11111111-1111-1111-1111-111111111111', current_setting('test.open')::uuid, null),
  ('aaaaaaaa-0000-0000-0000-000000000003', current_setting('test.org')::uuid, 'Overdue step', '11111111-1111-1111-1111-111111111111', current_setting('test.open')::uuid, null),
  ('aaaaaaaa-0000-0000-0000-000000000004', current_setting('test.org')::uuid, 'Quiet', '11111111-1111-1111-1111-111111111111', current_setting('test.open')::uuid, null),
  ('aaaaaaaa-0000-0000-0000-000000000005', current_setting('test.org')::uuid, 'No next step', '11111111-1111-1111-1111-111111111111', current_setting('test.open')::uuid, null),
  ('aaaaaaaa-0000-0000-0000-000000000006', current_setting('test.org')::uuid, 'Scheduled', '11111111-1111-1111-1111-111111111111', current_setting('test.open')::uuid, null),
  ('aaaaaaaa-0000-0000-0000-000000000007', current_setting('test.org')::uuid, 'Won lately', '11111111-1111-1111-1111-111111111111', current_setting('test.won')::uuid, now() - interval '3 days'),
  ('aaaaaaaa-0000-0000-0000-000000000008', current_setting('test.org')::uuid, 'Won long ago', '11111111-1111-1111-1111-111111111111', current_setting('test.won')::uuid, now() - interval '40 days'),
  ('aaaaaaaa-0000-0000-0000-000000000009', current_setting('test.org')::uuid, 'Lost', '11111111-1111-1111-1111-111111111111', current_setting('test.lost')::uuid, now() - interval '2 days'),
  ('aaaaaaaa-0000-0000-0000-000000000010', current_setting('test.org')::uuid, 'Member lead', '33333333-3333-3333-3333-333333333333', current_setting('test.open')::uuid, null);

-- 2: the latest entry came in through a form.
insert into public.activities (org_id, type, lead_id, body, source, created_by, created_at) values
  (current_setting('test.org')::uuid, 'note', 'aaaaaaaa-0000-0000-0000-000000000002', 'Can you quote this?', 'form: Contact us', null, now() - interval '1 hour');
-- 3: next step was due yesterday.
insert into public.activities (org_id, type, lead_id, body, due_at, created_by) values
  (current_setting('test.org')::uuid, 'task', 'aaaaaaaa-0000-0000-0000-000000000003', 'Send proposal', now() - interval '1 day', '11111111-1111-1111-1111-111111111111');
-- 4: a future next step, but nothing logged for 20 days.
select tests.age('aaaaaaaa-0000-0000-0000-000000000004', 20);
insert into public.activities (org_id, type, lead_id, body, due_at, created_by, created_at) values
  (current_setting('test.org')::uuid, 'call', 'aaaaaaaa-0000-0000-0000-000000000004', 'Intro call', null, '11111111-1111-1111-1111-111111111111', now() - interval '20 days'),
  (current_setting('test.org')::uuid, 'task', 'aaaaaaaa-0000-0000-0000-000000000004', 'Chase', now() + interval '5 days', '11111111-1111-1111-1111-111111111111', now() - interval '20 days');
-- 6: a future next step and a recent call.
insert into public.activities (org_id, type, lead_id, body, due_at, created_by) values
  (current_setting('test.org')::uuid, 'call', 'aaaaaaaa-0000-0000-0000-000000000006', 'Good call', null, '11111111-1111-1111-1111-111111111111'),
  (current_setting('test.org')::uuid, 'task', 'aaaaaaaa-0000-0000-0000-000000000006', 'Send contract', now() + interval '3 days', '11111111-1111-1111-1111-111111111111');

-- Folder rules
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000001'), 'needs_reply/unowned', 'a lead nobody owns needs a reply');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000002'), 'needs_reply/inbound', 'a lead whose latest entry came from outside needs a reply');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000003'), 'needs_reply/due', 'an overdue next step makes it your move');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000004'), 'going_cold/quiet', 'untouched for 14+ days goes cold, even with a future step');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000005'), 'needs_reply/no_next_step', 'a recent lead with no next step is your move');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000006'), 'waiting/scheduled', 'a recent touch and a future step means waiting on them');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000007'), 'won/won', 'won in the last 30 days shows in Won');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000008'), '-/-', 'won long ago drops out of the folders');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000009'), '-/-', 'lost leads are in no folder');

-- Thread facts
select is((select next_task_body from public.lead_threads where id = 'aaaaaaaa-0000-0000-0000-000000000006'), 'Send contract', 'next step is the earliest open task');
select is((select days_quiet from public.lead_threads where id = 'aaaaaaaa-0000-0000-0000-000000000004'), 20, 'an open task does not count as a touch');

-- Replying moves a thread on: log a call after the inbound note.
insert into public.activities (org_id, type, lead_id, body, created_by) values
  (current_setting('test.org')::uuid, 'call', 'aaaaaaaa-0000-0000-0000-000000000002', 'Called back', '11111111-1111-1111-1111-111111111111');
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000002'), 'needs_reply/no_next_step', 'logging a reply clears "they wrote"');

-- Finishing the overdue task is a touch and removes the due flag.
update public.activities set completed_at = now() where lead_id = 'aaaaaaaa-0000-0000-0000-000000000003';
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000003'), 'needs_reply/no_next_step', 'a completed task is a touch, and no longer due');

-- The cold threshold is per org.
update public.organizations set cold_after_days = 30 where id = current_setting('test.org')::uuid;
select is(tests.folder('aaaaaaaa-0000-0000-0000-000000000004'), 'waiting/scheduled', 'cold_after_days moves the going-cold line');

-- Trashed leads are not threads.
update public.leads set deleted_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000005';
select is((select count(*)::int from public.lead_threads where id = 'aaaaaaaa-0000-0000-0000-000000000005'), 0, 'trashed leads are not in the inbox');

-- Visibility follows lead RLS
select is(tests.as_user_value('55555555-5555-5555-5555-555555555555', 'select count(*) from public.lead_threads'), '0', 'outsider sees no threads');
update public.organizations set lead_visibility = 'own' where id = current_setting('test.org')::uuid;
select is(tests.as_user_value('33333333-3333-3333-3333-333333333333', 'select string_agg(title, '','') from public.lead_threads'), 'Member lead', 'member on own-visibility sees only their threads');
select ok(not has_table_privilege('anon', 'public.lead_threads', 'select'), 'anon cannot read threads');

select * from finish();
rollback;
