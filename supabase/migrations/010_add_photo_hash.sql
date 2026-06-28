alter table writeoff_requests
  add column if not exists photo_hash text,
  add column if not exists is_duplicate_photo boolean not null default false;

create index if not exists idx_writeoff_requests_photo_hash
  on writeoff_requests(photo_hash)
  where photo_hash is not null;
