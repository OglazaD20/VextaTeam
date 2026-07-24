-- The partial unique index (source, external_id) WHERE external_id IS NOT
-- NULL cannot serve as an ON CONFLICT arbiter for a plain
-- "ON CONFLICT (source, external_id)" upsert — Postgres requires the same
-- partial predicate to be repeated in the ON CONFLICT clause, which
-- supabase-js's .upsert({ onConflict }) doesn't support. That mismatch is
-- exactly the "no unique or exclusion constraint matching the ON CONFLICT
-- specification" error hit when caching USDA food search results.
--
-- Swapping to a full (non-partial) unique constraint fixes this without
-- changing behavior: Postgres already treats NULL <> NULL in unique
-- indexes, so unlimited custom/recipe rows with external_id = null still
-- coexist fine.
drop index if exists public.foods_source_external_id_idx;
alter table public.foods add constraint foods_source_external_id_key unique (source, external_id);
