-- Allow deducted employees to see requests where they are the affected party
create policy "requests_select_deducted"
  on public.writeoff_requests for select
  using (deducted_employee_id = auth.uid());

-- Camera EXIF presence flag for anti-fraud review
-- NULL = unknown (old rows / offline), TRUE = camera EXIF found, FALSE = no EXIF (suspicious)
alter table public.writeoff_requests
  add column if not exists has_camera_exif boolean;