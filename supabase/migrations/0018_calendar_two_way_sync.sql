-- Two-way Google Calendar sync: push notification channel tracking (for
-- real-time updates instead of manual/polled sync) and a conflict-resolution
-- timestamp on schedule_items. sync_cursor (already on calendar_connections)
-- is reused as Google's incremental-sync syncToken.

alter table public.calendar_connections
  add column channel_id text,
  add column channel_resource_id text,
  add column channel_expiration timestamptz;

alter table public.schedule_items
  add column external_updated_at timestamptz;
