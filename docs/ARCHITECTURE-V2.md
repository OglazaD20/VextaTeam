# LifeFlow — Architecture V2 (Expansion)

> Extends `docs/ARCHITECTURE.md` (still the source of truth for product vision, security, and performance principles). This document covers only what's new: schema, APIs, folder structure, and — critically — sequencing, since this expansion is roughly the size of the entire V1 build.

Status: **Planning — awaiting approval before implementation begins**, per your instruction to stop after every major feature.

---

## 0. Reality check before anything else

Eight feature areas were requested in one message: task management overhaul, habit tracker overhaul, calendar month/day views, AI Activity Discovery, a full nutrition tracker, a new dashboard, statistics/charts, and a design pass. Building all of that in one shot would violate the same principle that's guided this project from day one — no milestone starts until the previous one is confirmed working, and nothing ships without being genuinely tested. So this document:

1. Locks the schema and API shape for **all** of it up front (so later pieces don't require reworking earlier ones), then
2. Breaks implementation into **9 milestones (11–19)**, each shippable and testable on its own, each stopping for your sign-off before the next starts — exactly as you asked.

### Three features are blocked on external API keys I don't have

| Feature | Needs | Why |
|---|---|---|
| **AI Activity Discovery** ("What should I do?") | Google Maps/Places API key | Nearby places, travel time, distance |
| **AI Activity Discovery** | Weather API key | Same one flagged as missing for Smart Notifications earlier |
| **Calorie Tracker** | A nutrition database API key | Food search with accurate macros |

For the nutrition API specifically, I'm recommending **USDA FoodData Central** (api.data.gov) — it's free, self-serve (you get a key instantly, no approval wait, no credit card), and has solid branded + generic food coverage. Nutritionix or Edamam are the paid/richer alternatives if you want better UX later (barcode-ready, nicer branded data) — happy to switch. I'll build the nutrition tracker's schema and UI now regardless; the search endpoint just needs a key dropped in before Milestone 17 goes live, same pattern as OpenAI/Supabase/Google Calendar.

Everything else (task overhaul, habits overhaul, calendar views, dashboard, stats/charts, AI reschedule/habit-insights) needs **no new external services** — OpenAI is already wired up and covers all the AI in scope here.

---

## 1. Database Schema Additions

All new tables follow the existing conventions: `uuid` PKs, RLS scoped to `auth.uid()`, `created_at`/`updated_at` where relevant.

### 1.1 Task management overhaul (extends `schedule_items`)

```sql
alter table schedule_items
  add column category text,                    -- free text, curated presets in UI (like habit categories)
  add column notes text,                        -- long-form notes, separate from `description`
  add column recurrence_rule jsonb,              -- present only on recurrence "template" rows
  add column archived_at timestamptz,            -- distinct from deleted_at: hidden, not gone, resumable
  add column sort_order integer not null default 0;  -- manual drag-drop ordering within a day/list

alter table schedule_items
  drop constraint schedule_items_type_check,
  add constraint schedule_items_type_check
    check (type in ('meeting','task','deadline','habit','appointment','break','activity'));
    -- 'activity' = items created from AI Activity Discovery suggestions
```

**Recurrence model**: a template row (`recurrence_rule` set, `scheduled_start` null) generates concrete instance rows (normal schedule_items, `parent_item_id` → template) for a rolling window. Generation happens lazily — when the Calendar month/day view loads a range that isn't fully generated yet, `generateRecurringInstances(templateId, throughDate)` fills the gap. No cron job needed (same reasoning as the notifications system: the Hobby Vercel plan's cron limits make polling unreliable — on-demand generation sidesteps that entirely).

```ts
// recurrence_rule shape
{
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;          // every N days/weeks/months
  byWeekday?: number[];      // weekly only, 0=Sun..6=Sat
  until?: string | null;     // ISO date; open-ended if null and count is null
  count?: number | null;
}
```

**Tags** (many-to-many, not a text array — enables autocomplete, color, filtering, reuse across tasks):

```sql
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table schedule_item_tags (
  schedule_item_id uuid not null references schedule_items(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (schedule_item_id, tag_id)
);
```

**Attachments** (Supabase Storage, metadata in Postgres):

```sql
create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null references schedule_items(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null,   -- path within the 'task-attachments' bucket
  file_size_bytes integer not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);
```
Storage bucket `task-attachments`: private, RLS-gated, path convention `{user_id}/{schedule_item_id}/{filename}`, accessed via short-lived signed URLs (never public).

### 1.2 Habit tracker overhaul (extends `habits`)

```sql
alter table habits
  add column reminder_enabled boolean not null default false,
  add column paused_at timestamptz,              -- temporary pause, distinct from is_active (soft-delete)
  add column sort_order integer not null default 0;
```
`preferred_time` (already exists) doubles as the reminder time when `reminder_enabled` is true. Goal already maps to existing `target_value`/`target_unit`.

### 1.3 Nutrition tracker (all new)

```sql
create table foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  calories numeric not null,
  protein_g numeric not null default 0,
  fat_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fiber_g numeric not null default 0,
  serving_size numeric not null default 1,
  serving_unit text not null default 'serving',
  source text not null default 'usda' check (source in ('usda','custom')),
  external_id text,                              -- USDA fdcId, for cache lookups
  created_by uuid references profiles(id) on delete set null,  -- null for API-sourced entries
  created_at timestamptz not null default now()
);
-- Acts as a search cache: results from the USDA API get upserted here on first lookup,
-- so repeat searches and "log again" don't re-hit the external API every time.

create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','drink')),
  logged_at timestamptz not null default now(),
  quantity numeric not null default 1,            -- multiplier of the food's serving_size
  -- Snapshot the macros at log time (quantity-adjusted) so edits to `foods` cache
  -- entries don't silently rewrite historical logs:
  calories numeric not null,
  protein_g numeric not null,
  fat_g numeric not null,
  carbs_g numeric not null,
  fiber_g numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create table water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null
);

create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  logged_for_date date not null,
  weight_kg numeric,
  created_at timestamptz not null default now(),
  unique (user_id, logged_for_date)
);

create table nutrition_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  daily_calorie_goal numeric not null default 2000,
  protein_goal_g numeric not null default 120,
  carbs_goal_g numeric not null default 250,
  fat_goal_g numeric not null default 65,
  fiber_goal_g numeric not null default 30,
  water_goal_ml numeric not null default 2000,
  height_cm numeric,                              -- for BMI, alongside body_metrics weight
  updated_at timestamptz not null default now()
);
```
Barcode scanning and food-photo AI recognition are explicitly future scope per your own spec — the schema doesn't block adding them later (barcode → `foods.external_id` lookup; photo AI → a vision call that proposes a `foods` row for confirmation), but neither is built in Milestone 17.

### 1.4 AI Activity Discovery (new)

```sql
create table activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  categories text[] not null,
  filters jsonb not null,        -- {maxDistanceKm, budget, availableMinutes, indoorOutdoor, social}
  results jsonb not null,        -- array of generated suggestions (see §3.4 shape)
  created_at timestamptz not null default now()
);
```
Persisted so "recent suggestions" doesn't require re-calling three external APIs on every visit, and so a suggestion can be referenced when the user clicks "Add to today's schedule."

### 1.5 Mood

Explicitly marked "(future)" in your spec for the calendar month view. `mood_logs` already exists in the schema from Milestone 2 but nothing writes to it yet. Leaving it out of this pass, matching your own scoping — flag if you want it pulled forward.

---

## 2. Folder & Navigation Restructuring

Current nav: Today, Habits, Focus, Stats, Assistant, Settings. Adding Dashboard, Calendar, Discover, and Nutrition means the nav needs to grow deliberately, not get cluttered:

```
Dashboard   → app/(app)/dashboard/page.tsx            (new default landing page)
Calendar    → app/(app)/calendar/page.tsx              (month view)
              app/(app)/calendar/day/[date]/page.tsx    (day view — supersedes /today's role)
Habits      → app/(app)/habits/page.tsx                (existing, overhauled)
Focus       → app/(app)/focus/page.tsx                 (existing, unchanged)
Discover    → app/(app)/discover/page.tsx               ("What should I do?")
Nutrition   → app/(app)/nutrition/page.tsx               (calorie tracker)
Stats       → app/(app)/stats/page.tsx                  (existing, extended with charts)
Assistant   → app/(app)/chat/page.tsx                   (existing, unchanged)
Settings    → app/(app)/settings/page.tsx                (existing, unchanged)
```

`/today` becomes a redirect to `/calendar/day/today` — the Day View is the natural evolution of what Today already does (timeline, quick-add, AI planning), just generalized to any date with drag/resize added. No functionality is lost, it's absorbed and extended.

```
components/
  tasks/          # task form, tag picker, attachment upload, recurrence editor, archive/duplicate actions
  calendar/        # MonthGrid, DayCell, DayTimeline (drag/resize), TimelineCreateOverlay
  habits/          # (existing) + reorder, pause, reminder controls
  discover/        # CategorySelector, FilterSheet, SuggestionCard, MapPreview
  nutrition/        # MealSection, FoodSearchDialog, MacroRing, WeightChart
  dashboard/        # widget cards (TodaySummary, StreakCard, AIRecommendation, etc.)
  stats/            # (existing) + chart components (recharts)

lib/
  recurrence/       # generateRecurringInstances(), rule parsing
  activities/        # Places/Weather orchestration, suggestion ranking
  nutrition/          # USDA client, macro math, BMI calc
  dnd/                # shared @dnd-kit sensors/config for calendar + task lists
```

New libraries needed: **`@dnd-kit/core`** (+ `@dnd-kit/sortable`) for drag-and-drop/reordering — the modern, accessible standard, actively maintained (unlike `react-beautiful-dnd`). **`recharts`** for statistics charts, per the original architecture doc's plan to code-split it in (§12, performance). Timeline resize (dragging an event's edge to change duration) is hand-built on pointer events, since no DnD library ships resize primitives out of the box.

---

## 3. API Architecture Additions

### 3.1 Server Actions (colocated, extending the existing pattern)
```
app/(app)/calendar/actions.ts
  reorderTasks(dayKey, orderedIds)         # drag-drop reorder within a day
  moveTask(itemId, newStart, newEnd)       # drag to new time / resize / move to another day
  duplicateTask(itemId)
  archiveTask(itemId) / unarchiveTask(itemId)
  createRecurringTask(input)

app/(app)/habits/actions.ts   (extended)
  pauseHabit(id) / resumeHabit(id)
  reorderHabits(orderedIds)

app/(app)/nutrition/actions.ts
  logFood(input) / deleteFoodLog(id)
  logWater(amountMl)
  logWeight(date, kg)
  updateNutritionGoals(input)

app/(app)/discover/actions.ts
  addSuggestionToSchedule(suggestion, when)
```

### 3.2 Route Handlers
```
POST /api/ai/reschedule-unfinished     # carries over incomplete non-fixed tasks from a past day into today
POST /api/ai/habit-insights            # missing habits, broken streaks, easier-goal recommendations
POST /api/activities/discover          # the Activity Discovery orchestration (Places + Weather + OpenAI)
GET  /api/nutrition/search?q=          # USDA food search, results cached into `foods`
POST /api/ai/nutrition-suggestions     # meal recommendations vs. remaining daily macros
POST /api/tasks/attachments            # signed upload URL issuance for task-attachments bucket
```

### 3.3 AI reschedule / habit insights — same principle as before
Both reuse the existing deterministic solver rather than letting the model place times directly:
- **Reschedule unfinished**: find yesterday's (or any past day's) non-fixed, incomplete items → same `solveSchedule` call `replan_day` already uses, targeted at today's remaining window.
- **Habit insights**: pure computation (streak breaks, skip frequency, success-rate-below-threshold detection) + a single OpenAI call to phrase 2-3 short, specific recommendations from that computed data — the model explains patterns, it doesn't invent them.

### 3.4 Activity Discovery orchestration
```
1. Client posts: categories[], location {lat,lng}, maxDistanceKm, budget, availableMinutes, indoorOutdoor, social
2. Server, in parallel:
   - Google Places Nearby Search (per category, within maxDistanceKm)
   - Weather API current + next-hours forecast (informs indoor/outdoor viability)
   - Google Distance Matrix for travel time to top candidate places
3. OpenAI call: given the place candidates + weather + user filters, rank and write 4-6 short,
   specific suggestions (matching your examples — "Go for a sunset walk in Łazienki Park")
4. Response persisted to activity_suggestions, returned with per-suggestion:
   distance, travel time, estimated cost tier, duration estimate, map preview (static Maps image
   or embed), and an "Add to today's schedule" action → creates a schedule_items row (type='activity')
```
Same layered principle as planning: external APIs supply facts, the model writes the human-readable pitch, nothing about location/distance/hours is hallucinated.

---

## 4. Design System Updates

- **Glassmorphism pass**: extend the existing `.glass-surface` utility to Dashboard widget cards and Discover suggestion cards — currently only used in the chat rail and a couple of marketing spots.
- **Category/tag colors**: a small curated palette (matching the existing `--category-*` CSS variable pattern) rather than free-form color picking, to keep the UI cohesive.
- **Calendar month cell**: compact stat row (✓ done / ○ pending / habit %) sized to stay legible at 7-column grid width down to tablet size; perfect-day indicator as a subtle ring, not a badge that fights the date number for attention.
- **Timeline drag/resize**: motion via Framer Motion `layout` animations (already used elsewhere) so reflows read as intentional, not jumpy.
- All new screens follow existing light/dark theming — no new CSS variables needed beyond category/tag colors.

---

## 5. Implementation Roadmap (Milestones 11–19)

Each stops for your review before the next begins, per your instruction.

| # | Milestone | Depends on external key? |
|---|---|---|
| 11 | Task management overhaul — rich fields, tags, attachments, recurrence, duplicate/archive, drag-drop reorder | No |
| 12 | Habit tracker overhaul — reminders, pause, reorder, AI insights (missing habits / broken streaks / easier goals) | No |
| 13 | Calendar Month View | No |
| 14 | Calendar Day View — hourly timeline with drag/resize/create, AI auto-rearrange, absorbs `/today` | No |
| 15 | Dashboard | No |
| 16 | Statistics overhaul — weekly/monthly/yearly charts (recharts) | No |
| 17 | Nutrition / Calorie tracker | **Yes — nutrition API key** |
| 18 | AI Activity Discovery ("What should I do?") | **Yes — Google Maps/Places + Weather keys** |
| 19 | Cross-feature polish pass — micro-interactions, responsive audit, accessibility sweep across everything above | No |

This order front-loads everything unblocked so real progress starts immediately; 17 and 18 slot in whenever their keys arrive without reshuffling anything else, since their schemas are already locked above.

---

## Open questions for approval

1. **Nutrition API** — OK with USDA FoodData Central (free, instant self-serve key), or do you want to go straight for Nutritionix/Edamam (paid, richer branded-food data)?
2. **`/today` → `/calendar/day/today` redirect** — confirms Day View absorbs Today's role rather than living as a separate, parallel screen. Any objection?
3. **Milestone order above** — good as sequenced, or reprioritize (e.g., Dashboard before the calendar views, or Nutrition moved up even though it'll block on the API key)?

Once you confirm, I'll start on **Milestone 11** and stop for your review before moving to 12.
