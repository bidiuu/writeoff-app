-- Security-definer function avoids infinite recursion when profiles RLS
-- references the profiles table itself.
create or replace function public.current_user_is_reviewer()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('reviewer', 'admin')
  )
$$;

-- Allow reviewers/admins to read all profiles (needed to show sender names in review queue).
drop policy if exists "profiles_select_all_for_reviewers" on public.profiles;

create policy "profiles_select_all_for_reviewers"
  on public.profiles for select
  using (public.current_user_is_reviewer());
