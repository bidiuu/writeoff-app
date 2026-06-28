-- Migration 007: add category column to writeoff_requests
-- Nullable intentionally: existing rows and offline-queued requests before this migration keep NULL.
-- Values: food | equipment | supplies | other

alter table public.writeoff_requests
  add column if not exists category text
  constraint writeoff_requests_category_check
    check (category in ('food', 'equipment', 'supplies', 'other'));