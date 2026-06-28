-- Root cause: requests_update_reviewer had no explicit WITH CHECK.
-- PostgreSQL implicitly uses USING as WITH CHECK on the new row.
-- After UPDATE the new row has status='approved' and reviewed_by=uuid,
-- which violates "reviewed_by IS NULL" in the implicit WITH CHECK.
-- Fix: add explicit WITH CHECK that validates the new row state.

drop policy if exists "requests_update_reviewer" on public.writeoff_requests;

create policy "requests_update_reviewer"
  on public.writeoff_requests for update
  using (
    -- PRE-update: row must be reviewable
    status = 'pending'
    and reviewed_by is null
    and author_id != auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('reviewer', 'admin')
    )
  )
  with check (
    -- POST-update: new row must reflect a valid review decision
    status in ('approved', 'rejected')
    and reviewed_by = auth.uid()
  );

-- audit_log had no INSERT policy (comment said "service role only").
-- Since admin client (sb_secret_*) does not bypass RLS, all audit inserts silently failed.
-- Fix: allow reviewers/admins to insert their own audit records.
drop policy if exists "audit_insert_reviewer" on public.audit_log;

create policy "audit_insert_reviewer"
  on public.audit_log for insert
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('reviewer', 'admin')
    )
  );

-- profiles_select_own only allows reading own profile.
-- Admin client can't find reviewer IDs for push notifications.
-- Fix: allow any authenticated user to discover reviewer/admin profile IDs.
drop policy if exists "profiles_select_reviewers_pub" on public.profiles;

create policy "profiles_select_reviewers_pub"
  on public.profiles for select
  using (
    auth.uid() is not null
    and role in ('reviewer', 'admin')
  );