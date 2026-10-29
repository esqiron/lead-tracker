-- Save a quarter's goals in one go (Settings › Goals): every goal for the
-- quarter is replaced by the ones given, so a cleared field removes its goal.
-- p_goals: [{user_id: uuid | null, amount: number}], null user_id = team.
create function public.set_goals(p_org uuid, p_period_start date, p_goals jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Only admins can set goals.' using errcode = '42501';
  end if;
  if p_period_start <> date_trunc('quarter', p_period_start)::date then
    raise exception 'Pick the first day of a quarter' using errcode = '22023';
  end if;
  delete from public.goals where org_id = p_org and period_start = p_period_start;
  insert into public.goals (org_id, user_id, period_start, amount)
  select p_org, nullif(g ->> 'user_id', '')::uuid, p_period_start, (g ->> 'amount')::numeric
  from jsonb_array_elements(p_goals) g
  where g ->> 'amount' is not null;
end;
$$;
revoke execute on function public.set_goals(uuid, date, jsonb) from public, anon;
grant execute on function public.set_goals(uuid, date, jsonb) to authenticated;
