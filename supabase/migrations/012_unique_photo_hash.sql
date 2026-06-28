-- Replace the plain index with a UNIQUE constraint so the database physically
-- prevents duplicate photo hashes even under concurrent inserts (race condition).
-- NULL values are excluded from uniqueness checks in PostgreSQL, so rows without
-- a hash (offline submissions, old rows) are unaffected.
drop index if exists idx_writeoff_requests_photo_hash;

alter table writeoff_requests
  add constraint unique_photo_hash unique (photo_hash);
