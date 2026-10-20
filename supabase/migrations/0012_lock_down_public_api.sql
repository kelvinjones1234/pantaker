-- Pantaker no longer uses the Supabase Data API. Remove every public policy and
-- revoke browser-facing roles. RLS stays enabled with no policies as a
-- defense-in-depth default-deny layer; the Prisma owner connection bypasses it.

do $$
declare
  policy record;
begin
  for policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy.policyname,
      policy.schemaname,
      policy.tablename
    );
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke usage on schema public from anon, authenticated;

-- Keep RLS enabled everywhere. Without policies, non-owner roles are denied.
do $$
declare
  table_name text;
begin
  for table_name in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;
