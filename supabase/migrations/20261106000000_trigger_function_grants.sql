-- Trigger functions only ever run as triggers, so nobody needs to call them
-- through the API. Postgres checks EXECUTE when a trigger is created, not when
-- it fires, so the triggers keep working. Calling one directly already failed;
-- this just takes them off /rest/v1/rpc and out of Supabase's security advisor.
--
-- Left as they are, on purpose:
-- - report_leads, report_reply_hours, report_open_age have no SET search_path
--   so the planner can inline them (see 20261028030000_review_fixes.sql). They
--   are SECURITY INVOKER and use schema-qualified names.
-- - get_invitation and instance_initialized stay callable by anon: the invite
--   page and /setup need them before anyone signs in.
-- - The SECURITY DEFINER functions signed-in users call each check the
--   caller's active role in the organization themselves.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.record_lead_stage_change() from public, anon, authenticated;
revoke execute on function public.organization_terms_from_creator() from public, anon, authenticated;
