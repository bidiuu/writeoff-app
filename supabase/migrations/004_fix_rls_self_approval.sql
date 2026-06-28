-- Fix: prevent reviewer from approving their own write-off requests at DB layer
-- Without this, anyone with reviewer/admin JWT can call Supabase REST API directly
-- to approve their own pending request, bypassing the API-route check.

drop policy if exists "requests_update_reviewer" on public.writeoff_requests;

create policy "requests_update_reviewer"
  on public.writeoff_requests for update
  using (
    status = 'pending'
    and reviewed_by is null
    and author_id != auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('reviewer', 'admin')
    )
  );