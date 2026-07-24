# LifeFlow — Product & Architecture Blueprint

> An AI-powered daily planner that plans your day *for* you, adapts when life doesn't cooperate, and feels like a calm personal assistant rather than another to-do app.

Status: **Planning — awaiting approval before implementation begins.**

---

## 1. Product Vision

### The one-sentence pitch
LifeFlow turns a messy list of meetings, deadlines, tasks, habits, and appointments into a single, realistic, continuously self-adjusting daily schedule — and lets you manage it by talking to it.

### Why this, why now
Calendars show what's *booked*. To-do apps show what's *pending*. Neither tells you what to actually **do right now**, and neither reacts when a meeting runs long or traffic gets bad. LifeFlow sits on top of both: it is the layer that decides *when*, re-decides when reality changes, and explains its reasoning in plain language.

### Differentiation

| Category | Existing tools | LifeFlow |
|---|---|---|
| Calendar apps (Google/Apple/Outlook) | Store events, no prioritization | Reads events, fills the gaps intelligently |
| To-do apps (Todoist, Things) | Track tasks, no scheduling | Assigns tasks real time slots automatically |
| Time-blocking apps (Motion, Reclaim) | Auto-schedule, weak conversational control, no habit/mood/wellbeing layer | Auto-schedule **+** conversational control **+** habits **+** focus tracking **+** proactive contextual nudges |
| Notion/Sunsama | Manual planning rituals, still requires user effort | AI does the planning; user approves/adjusts |

### Product principles
1. **Zero-effort input, high-effort output.** The user dumps information in; LifeFlow does the thinking.
2. **Always re-plannable.** A schedule is a hypothesis, not a contract. Delays are expected and handled gracefully.
3. **Conversation is a first-class UI.** Natural language is as valid an input method as drag-and-drop.
4. **Calm, not naggy.** Notifications are contextual and rare, never generic ("Task due!") noise.
5. **Trustworthy automation.** The AI explains *why* it rescheduled something; nothing silently disappears.
6. **Respect attention.** Focus Mode and mood/energy awareness are core, not add-ons — this is a wellbeing tool, not a productivity guilt machine.

### Brand feel
Apple-level restraint + Notion-level flexibility + ChatGPT-level intelligence. Neutral palette, generous whitespace, soft shadows/glass surfaces, one accent color, motion that clarifies state changes (task moving to a new slot animates, it doesn't just jump).

---

## 2. User Personas

### 1. Maya — The Overwhelmed Student (20, university, ADHD-diagnosed)
- **Goals:** Pass classes, keep a social life, not forget assignments.
- **Pains:** Underestimates how long things take; hyperfocuses and loses whole days; reminders get ignored because there are too many.
- **What she needs:** Automatic duration estimates, gentle re-planning after a missed block, habit streaks for meds/sleep, a chat she can vent a chaotic day into and get a plan back.

### 2. Daniel — The Overbooked Employee (34, mid-level manager)
- **Goals:** Get deep work done despite a calendar full of meetings.
- **Pains:** Back-to-back meetings, no time to plan, context-switching fatigue, works through lunch.
- **What he needs:** Two-way calendar sync, auto-inserted breaks/focus blocks in whatever gaps exist, "you've been in meetings for 3 hours, protect the next 30 minutes" nudges.

### 3. Priya — The Freelancer Juggling Clients (29, graphic designer)
- **Goals:** Bill accurately, hit deadlines for 4 concurrent clients, keep some work-life boundary.
- **Pains:** Deadlines from different sources (email, Slack, memory), no manager to prioritize for her, irregular hours.
- **What she needs:** Deadline-driven prioritization, "can I fit X today?" chat queries, weekly reports on billable/focused hours.

### 4. Alex — The Founder (38, early-stage startup)
- **Goals:** Ruthlessly prioritize the 2-3 things that matter each day among infinite possible tasks.
- **Pains:** Constant interruptions, decision fatigue, meetings eat strategic time.
- **What he needs:** AI that reprioritizes in real time ("move everything after 3PM"), a daily "what should I do next" answer, weekly focus-score trend to see if he's actually doing deep work or just reacting.

### 5. Sam — Anyone rebuilding a routine (any age, e.g. post-burnout, new parent, habit-rebuilding)
- **Goals:** Build/rebuild basic life structure — sleep, water, movement, reading.
- **Pains:** No external accountability, habits silently die.
- **What they need:** Habit tracking with skip detection, mood trend awareness, low-pressure encouragement, not another guilt-inducing streak app.

---

## 3. User Flows

### 3.1 Onboarding (target: < 2 minutes to first plan)
1. Sign up (email magic link / Google OAuth via Supabase Auth).
2. Quick preference quiz: wake/sleep window, working hours, focus-time preference (morning/evening lark), timezone (auto-detected).
3. Optional: connect Google/Outlook/Apple calendar (can skip → connect later).
4. Optional: pick starter habits from a curated list (sleep, water, gym, reading, meditation, walking) or skip.
5. "Tell me about today" — free-text or quick-add of today's tasks/meetings.
6. AI generates the first daily plan → shown on the Today timeline with a short "Here's your plan and why" summary.
7. Empty-state coach marks explain the chat bubble and Focus Mode toggle.

### 3.2 Daily planning (steady state)
1. User adds an item via quick-add (natural language: "dentist tomorrow 3pm", "finish deck ~2h before Friday") or structured form.
2. AI parses → classifies type (meeting/deadline-task/personal task/habit/appointment) → estimates duration if not given.
3. Scheduling engine re-runs incrementally, slots the new item into the best gap, respecting fixed events (meetings/appointments are immovable anchors).
4. Timeline updates with a subtle animation; a toast explains what moved, with one-tap Undo.

### 3.3 Real-time replanning (delay handling)
1. A meeting overruns / user marks a task "still working" past its slot / user marks something "missed."
2. Scheduler detects drift, shifts downstream flexible items, re-checks day still fits; if not, proposes: push to tomorrow, shorten a task, or drop a nice-to-have.
3. Push notification: *"Your 2pm ran long — I moved gym to 6pm and shortened your reading block. Look good?"* → Accept / Adjust in chat.

### 3.4 AI Assistant Chat
1. User opens chat (persistent side panel or full-screen on mobile).
2. Free-form ask: "What should I do next?", "Move everything after 3PM", "Can I fit a gym workout today?", "When am I free this week?"
3. Assistant calls scheduling tools (function calling) against the real schedule, returns a natural-language answer *and* applies any confirmed changes to the timeline live.
4. All destructive/bulk changes ("move everything after 3PM") show a diff-style confirmation before committing.

### 3.5 Calendar integration
1. Settings → Integrations → Connect (OAuth flow for Google/Microsoft; Apple via CalDAV credentials).
2. Initial backfill + ongoing two-way sync: external events become immovable anchors; LifeFlow-created blocks pushed back as external calendar events (tagged so we can identify/update/delete them).
3. Conflict resolution: external edits win for event time/title; LifeFlow reflows the rest of the day around them.

### 3.6 Habits
1. Add habit with cadence (daily/weekly/custom) and optional target (8 glasses, 30 min).
2. Scheduler proposes a default time slot; user can lock a preferred time.
3. Log completion inline from the timeline or via chat ("done with water").
4. Missed-habit detection: after a defined grace window, AI flags a skip, adjusts streak, and (softly) asks if the time slot still works or should move.

### 3.7 Focus Mode
1. Toggle from Today view or auto-suggested before a scheduled deep-work block.
2. Starts Pomodoro (configurable work/break length), mutes non-critical notifications, marks a `focus_sessions` row as started.
3. On completion (or early stop), logs actual duration, prompts a 1-tap mood/energy check, feeds Smart Statistics.

### 3.8 Smart Statistics (weekly report)
1. Generated every Sunday night (or on-demand) via scheduled job.
2. Shows productive hours, completed vs planned tasks, focus score, habit streaks, mood trend graph, 2-3 AI recommendations ("Your focus score drops after 3pm — consider moving deep work earlier").
3. Shareable/export as PDF (V2).

---

## 4. Database Schema (Supabase / PostgreSQL)

All tables use `uuid` PKs (`gen_random_uuid()`), `created_at`/`updated_at` timestamps, and Row Level Security scoped to `auth.uid()`. Soft-delete via `deleted_at` where user-recoverable.

```sql
-- ── Identity ─────────────────────────────────────────────
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  wake_time time not null default '07:00',
  sleep_time time not null default '23:00',
  working_hours jsonb not null default '{"mon":["09:00","17:00"], ...}',
  chronotype text check (chronotype in ('early_bird','night_owl','flexible')) default 'flexible',
  default_task_buffer_minutes int not null default 10,
  focus_block_minutes int not null default 50,
  break_minutes int not null default 10,
  theme text check (theme in ('light','dark','system')) default 'system',
  notification_prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
)

-- ── Core planning ────────────────────────────────────────
schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('meeting','task','deadline','habit','appointment','break')),
  title text not null,
  description text,
  status text not null check (status in ('planned','in_progress','completed','skipped','cancelled')) default 'planned',
  priority smallint not null default 3, -- 1 (urgent) .. 5 (someday)
  is_fixed boolean not null default false, -- true = immovable anchor (meeting/appointment/external)
  estimated_duration_minutes int,
  actual_duration_minutes int,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  due_at timestamptz, -- for deadline-type items
  location text,
  source text not null default 'lifeflow' check (source in ('lifeflow','google','outlook','apple','ai_suggested')),
  external_event_id text, -- id in the source calendar, for sync matching
  habit_id uuid references habits(id) on delete cascade,
  parent_item_id uuid references schedule_items(id), -- for AI-split subtasks
  ai_reasoning text, -- short explanation of why it was placed here
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
-- indexes: (user_id, scheduled_start), (user_id, status), (user_id, due_at)

reschedule_events ( -- audit trail for "what moved and why"
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  schedule_item_id uuid references schedule_items(id) on delete set null,
  reason text not null, -- 'delay','manual','conflict','ai_optimization'
  previous_start timestamptz,
  previous_end timestamptz,
  new_start timestamptz,
  new_end timestamptz,
  triggered_by text not null check (triggered_by in ('user','ai','system')),
  created_at timestamptz not null default now()
)

-- ── Habits ───────────────────────────────────────────────
habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  icon text,
  category text check (category in ('sleep','fitness','hydration','reading','mindfulness','movement','custom')),
  cadence text not null check (cadence in ('daily','weekly','custom')) default 'daily',
  target_value numeric, -- e.g. 8 (glasses), 30 (minutes)
  target_unit text, -- 'glasses','minutes','pages'
  preferred_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
)

habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  logged_for_date date not null,
  completed boolean not null default true,
  value numeric,
  created_at timestamptz not null default now(),
  unique (habit_id, logged_for_date)
)

-- ── Focus mode ───────────────────────────────────────────
focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  schedule_item_id uuid references schedule_items(id) on delete set null,
  planned_duration_minutes int not null,
  actual_duration_minutes int,
  pomodoro_cycles int default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  interrupted boolean not null default false,
  mood_after smallint check (mood_after between 1 and 5),
  energy_after smallint check (energy_after between 1 and 5)
)

-- ── Wellbeing ────────────────────────────────────────────
mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  logged_at timestamptz not null default now(),
  mood smallint not null check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  note text
)

-- ── Calendar integration ─────────────────────────────────
calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null check (provider in ('google','outlook','apple')),
  account_email text,
  access_token_encrypted text, -- encrypted at rest, see Security
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[],
  sync_status text not null default 'active' check (sync_status in ('active','paused','error','revoked')),
  last_synced_at timestamptz,
  sync_cursor text, -- provider delta-sync token
  created_at timestamptz not null default now(),
  unique (user_id, provider, account_email)
)

-- ── AI assistant ─────────────────────────────────────────
ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  tool_calls jsonb, -- function-calling payloads for auditability
  created_at timestamptz not null default now()
)

user_context_embeddings ( -- RAG store: routines, preferences, past decisions
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_type text not null check (source_type in ('schedule_item','habit','chat_summary','preference_note')),
  source_id uuid,
  content text not null,
  embedding vector(1536), -- pgvector
  created_at timestamptz not null default now()
)

-- ── Notifications ────────────────────────────────────────
notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('leave_now','break_reminder','weather','free_time','reschedule','habit_skip','weekly_report')),
  title text not null,
  body text not null,
  related_item_id uuid references schedule_items(id) on delete set null,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
)

-- ── Statistics ───────────────────────────────────────────
weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  productive_minutes int,
  tasks_completed int,
  tasks_planned int,
  focus_score smallint, -- 0-100 composite
  habit_streak_summary jsonb,
  mood_trend jsonb,
  ai_recommendations text[],
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
)
```

**RLS policy pattern** (applied to every table above):
```sql
alter table schedule_items enable row level security;
create policy "owns_row" on schedule_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 5. API Architecture

Next.js App Router: **Server Actions** for all user-initiated mutations (no hand-rolled REST needed for CRUD), **Route Handlers** for webhooks, OAuth callbacks, and anything external systems call, **Supabase Edge Functions** for scheduled/background jobs.

### 5.1 Server Actions (type-safe, colocated with features)
```
app/(app)/today/actions.ts
  createScheduleItem(input) -> ScheduleItem
  updateScheduleItem(id, patch) -> ScheduleItem
  deleteScheduleItem(id) -> void
  markComplete(id) -> ScheduleItem
  requestReplan(scope: 'today' | 'from_now') -> ScheduleItem[]

app/(app)/habits/actions.ts
  createHabit / updateHabit / archiveHabit
  logHabit(habitId, date, value?) -> HabitLog

app/(app)/focus/actions.ts
  startFocusSession(scheduleItemId?) -> FocusSession
  endFocusSession(id, { interrupted, mood, energy }) -> FocusSession

app/(app)/settings/actions.ts
  updateUserSettings(patch) -> UserSettings
  connectCalendar(provider) -> redirect to OAuth
  disconnectCalendar(connectionId) -> void
```
Every action: validates with **Zod**, checks auth session server-side, uses Supabase server client (RLS enforces ownership as defense in depth), returns typed results consumed by React Server Components / client hooks (React Query for optimistic updates on the timeline).

### 5.2 Route Handlers (`app/api/**`)
```
POST /api/ai/chat            -- streaming assistant response (SSE), tool-calling loop
POST /api/ai/plan            -- generate/regenerate full-day plan (used by onboarding + "replan my day")
POST /api/ai/parse-item      -- NL quick-add -> structured ScheduleItem draft

GET  /api/calendar/google/callback     -- OAuth callback
GET  /api/calendar/outlook/callback
POST /api/calendar/google/webhook      -- push notifications (Google Calendar watch channel)
POST /api/calendar/outlook/webhook     -- Microsoft Graph change notifications

POST /api/webhooks/weather            -- (or server-side fetch, no inbound webhook needed)
GET  /api/notifications/stream        -- Supabase Realtime channel bootstrap / SSE fallback
```

### 5.3 Background jobs (Supabase Edge Functions + `pg_cron`)
```
cron: every 5 min   -> check-delays          (detect overrunning items, trigger replan)
cron: every 15 min  -> smart-notifications   (leave-now, weather, break reminders, free-time nudges)
cron: hourly        -> calendar-sync-poll    (providers without webhook support / token refresh)
cron: daily 00:05   -> habit-skip-detection
cron: weekly Sun 22:00 -> generate-weekly-report
```

### 5.4 AI service layer (internal, not HTTP)
```
lib/ai/
  scheduler.ts        -- deterministic constraint-solver (see §10)
  planGenerator.ts     -- orchestrates OpenAI call + scheduler
  chatAgent.ts         -- tool-calling loop for assistant chat
  embeddings.ts        -- RAG indexing/retrieval
  prompts/*.ts         -- versioned prompt templates
```

### 5.5 Contract example (type-safe boundary)
```ts
// lib/ai/types.ts
export const ScheduleItemInput = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['meeting','task','deadline','habit','appointment']),
  dueAt: z.string().datetime().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  isFixed: z.boolean().default(false),
});
export type ScheduleItemInput = z.infer<typeof ScheduleItemInput>;
```

---

## 6. Folder Structure

```
lifeflow/
├─ app/
│  ├─ (marketing)/                 # public landing page
│  │  └─ page.tsx
│  ├─ (auth)/
│  │  ├─ sign-in/page.tsx
│  │  └─ sign-up/page.tsx
│  ├─ (onboarding)/
│  │  └─ onboarding/page.tsx
│  ├─ (app)/                       # authenticated shell (layout has sidebar + chat panel)
│  │  ├─ layout.tsx
│  │  ├─ today/
│  │  │  ├─ page.tsx
│  │  │  ├─ actions.ts
│  │  │  └─ components/
│  │  ├─ habits/
│  │  ├─ focus/
│  │  ├─ stats/
│  │  ├─ chat/
│  │  └─ settings/
│  │     ├─ integrations/
│  │     ├─ preferences/
│  │     └─ account/
│  └─ api/
│     ├─ ai/{chat,plan,parse-item}/route.ts
│     ├─ calendar/{google,outlook,apple}/{callback,webhook}/route.ts
│     └─ notifications/stream/route.ts
│
├─ components/
│  ├─ ui/                          # shadcn primitives (button, dialog, sheet, etc.)
│  ├─ timeline/                    # DayTimeline, ScheduleBlock, NowIndicator
│  ├─ chat/                        # ChatPanel, MessageBubble, ToolCallCard
│  ├─ habits/                      # HabitCard, StreakBadge
│  ├─ focus/                       # FocusTimer, PomodoroRing
│  ├─ stats/                       # WeeklyReportCard, TrendChart
│  └─ shared/                      # EmptyState, AnimatedNumber, ConfirmDialog
│
├─ lib/
│  ├─ ai/                          # (see §5.4)
│  ├─ supabase/
│  │  ├─ client.ts                 # browser client
│  │  ├─ server.ts                 # server client (RSC/Server Actions)
│  │  └─ middleware.ts             # session refresh
│  ├─ calendar/
│  │  ├─ google.ts
│  │  ├─ outlook.ts
│  │  └─ apple.ts (CalDAV)
│  ├─ scheduling/
│  │  ├─ constraints.ts
│  │  ├─ solver.ts
│  │  └─ duration-estimator.ts
│  ├─ notifications/
│  │  ├─ weather.ts
│  │  ├─ traffic.ts
│  │  └─ triggers.ts
│  └─ utils/
│
├─ hooks/                          # useSchedule, useChat, useFocusSession, useRealtime
├─ types/                          # generated Supabase types + domain types
├─ supabase/
│  ├─ migrations/
│  ├─ functions/                   # edge functions (cron jobs, webhooks)
│  └─ config.toml
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ styles/globals.css
```

---

## 7. UI Wireframes (textual)

### 7.1 Today (home) — the core screen
```
┌──────────────────────────────────────────────────────────────┐
│ ☰  LifeFlow            Tue, Jul 21          🌙  🔔³  👤       │
├───────────────┬────────────────────────────────┬─────────────┤
│  Sidebar       │        Timeline (scroll)        │ AI Chat     │
│  • Today       │  8:00 ─────────────────────     │ panel       │
│  • Habits      │  ┌──────────────────────────┐   │ (collapsible│
│  • Focus       │  │ 🏃 Morning walk   30m     │   │ on mobile:  │
│  • Stats       │  └──────────────────────────┘   │ bottom      │
│  • Settings    │  9:00 ━━ NOW ━━━━━━━━━━━━━━━     │ sheet)      │
│                │  ┌──────────────────────────┐   │             │
│  [+ Quick add] │  │ 🟦 Team standup  9:00-9:15│   │ "What       │
│                │  └──────────────────────────┘   │  should I   │
│                │  ┌──────────────────────────┐   │  do next?"  │
│                │  │ 🟩 Deep work: Deck  1.5h  │   │             │
│                │  │   ai: "moved earlier —    │   │ [Ask...]    │
│                │  │   you focus best AM"      │   │             │
│                │  └──────────────────────────┘   │             │
│                │  ┌──────────────────────────┐   │             │
│                │  │ ☕ Break            10m   │   │             │
│                │  └──────────────────────────┘   │             │
│                │  12:00 ┈┈ free 45m ┈┈           │             │
│                │  ┌──────────────────────────┐   │             │
│                │  │ 📅 Dentist  3:00-3:45     │   │             │
│                │  │   ⚠ leave in 18 min       │   │             │
│                │  └──────────────────────────┘   │             │
├───────────────┴────────────────────────────────┴─────────────┤
│  Focus Mode ⏵                          3/5 habits • 62% today  │
└──────────────────────────────────────────────────────────────┘
```
- Fixed items (meetings/appointments) render with a solid left border + lock icon; AI-placed flexible items show a subtle dashed border until confirmed.
- Drag to manually move a block → scheduler re-validates and animates any downstream shifts.
- Tapping a block expands an inline card: reschedule, mark done, split, delete, "why here?" (shows `ai_reasoning`).

### 7.2 Quick add (modal, keyboard-first)
```
┌───────────────────────────────────────────┐
│  Add anything…                             │
│  ┌───────────────────────────────────────┐ │
│  │ finish deck ~2h before friday          │ │
│  └───────────────────────────────────────┘ │
│  Parsed: 📝 Task · "Finish deck"            │
│          Est. 2h · Due Fri 5:00 PM          │
│  [ Adjust ]                    [ Add ✓ ]    │
└───────────────────────────────────────────┘
```

### 7.3 AI Chat (full screen on mobile, panel on desktop)
```
┌─────────────────────────────────────┐
│  ←  Assistant                        │
├─────────────────────────────────────┤
│  You: Can I fit a gym workout today? │
│                                       │
│  🤖 You have a 50-min gap at 5:30pm  │
│     after your last meeting. Want    │
│     me to book "Gym" there?          │
│     [ Yes, add it ]  [ Pick time ]   │
├─────────────────────────────────────┤
│  Type a message…              ➤      │
└─────────────────────────────────────┘
```

### 7.4 Habits
```
┌──────────────────────────────────────────┐
│  Habits                    [+ New habit] │
│  ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│  │ 💧 Water   │ │ 🏋️ Gym     │ │ 📖 Read │ │
│  │ 5/8 today  │ │ 🔥12-day   │ │ 4/7 wk  │ │
│  │ ●●●●●○○○  │ │ streak     │ │ streak  │ │
│  └───────────┘ └───────────┘ └─────────┘ │
│  "You usually read at 9pm — skipped      │
│   2 days. Want a reminder tonight?"      │
└──────────────────────────────────────────┘
```

### 7.5 Focus Mode
```
┌───────────────────────────────┐
│         Focus session          │
│                                 │
│         ⏱  23:41 left           │
│        ◔ (progress ring)        │
│                                 │
│   Working on: "Finish deck"    │
│   Pomodoro 1 of 3               │
│                                 │
│   [ Pause ]        [ End early ]│
│   Notifications muted 🔕        │
└───────────────────────────────┘
```

### 7.6 Weekly Stats
```
┌────────────────────────────────────────────┐
│  This week                                   │
│  Focus score: 78 ▲6      Productive: 24.5h   │
│  ┌──────── mood trend ─────────┐            │
│  │  ▂▃▅▆▅▇▆                     │            │
│  └──────────────────────────────┘           │
│  Habits: 💧85% 🏋️71% 📖57%                    │
│  Tasks completed: 32 / 38                     │
│  💡 "Your focus peaks 9-11am. Consider        │
│      moving your hardest task there."         │
└────────────────────────────────────────────┘
```

### 7.7 Settings → Integrations
```
┌─────────────────────────────────────┐
│  Calendars                            │
│  ● Google Calendar   Connected ✓      │
│  ○ Outlook           [ Connect ]      │
│  ○ Apple Calendar    [ Connect ]      │
│                                        │
│  Sync: two-way · Last synced 2m ago   │
└─────────────────────────────────────┘
```

---

## 8. Feature Roadmap

### MVP (v1) — "It plans a realistic day and adapts"
- Auth (Supabase, email + Google OAuth)
- Manual + NL quick-add for tasks/meetings/deadlines/appointments
- AI plan generation for the day (duration estimation, prioritization, breaks)
- Timeline UI with drag-to-reschedule
- Basic AI chat with function-calling over the schedule (query + mutate)
- Google Calendar two-way sync (highest-demand provider first)
- Habits: create, log, streaks (no AI skip-detection yet)
- Focus Mode: Pomodoro timer + session logging
- Basic notifications: break reminders, free-time nudges (in-app + push)
- Weekly stats: productive hours, completed tasks, habit streaks (no AI recommendations yet)
- Light/dark mode, responsive layout

### V2 — "It knows your context and reaches out proactively"
- Outlook + Apple Calendar (CalDAV) integration
- Real delay detection → automatic replanning with confirmation nudges
- Weather- and traffic-aware notifications ("leave in 18 minutes")
- Habit skip detection with AI-authored nudges
- Mood/energy logging integrated into stats + scheduling (don't schedule hard tasks during a detected low-energy window)
- RAG-backed chat memory (remembers stated preferences: "I hate morning meetings")
- Weekly AI recommendations engine
- Focus website/app blocking (companion browser extension or OS-level, platform-dependent)
- PDF export / shareable weekly report

### V3 — "It's a proactive life co-pilot"
- Multi-day / multi-week planning ("plan my whole week")
- Team/shared calendars (partner, family, team leads) with shared free/busy
- Voice input for quick-add and chat
- Native mobile apps (React Native/Expo) with widgets + live activities
- Location-aware suggestions (commute-based leave-time, nearby errands)
- Predictive duration estimation from personal history (ML model, not just heuristic/LLM)
- Third-party integrations: Slack status sync, Notion/Todoist import, email-to-task
- Team/manager rollup dashboards for productivity (enterprise tier)

---

## 9. Component Architecture

### Design system layer (shadcn/ui + Tailwind, thin wrapper)
`Button`, `Input`, `Dialog`, `Sheet`, `Popover`, `Command` (for quick-add), `Tabs`, `Badge`, `Avatar`, `Switch`, `Slider`, `Toast` — themed once in `components/ui`, never restyled ad hoc elsewhere.

### Feature component trees
```
<AppShell>                             // layout.tsx: sidebar + topbar + chat rail
 ├─ <Sidebar />
 ├─ <TopBar>  <ThemeToggle/> <NotificationBell/> <UserMenu/>
 ├─ <PageOutlet>                       // routed feature page
 └─ <ChatRail>  <ChatPanel/>            // persistent, collapsible

<TodayPage>
 ├─ <QuickAddTrigger/>  → <QuickAddModal/>
 ├─ <DayTimeline>
 │   ├─ <NowIndicator/>
 │   ├─ <ScheduleBlock/>  (per item; variants: meeting/task/habit/break/appointment)
 │   │   └─ <ScheduleBlockExpanded/>   (why-here, actions)
 │   └─ <FreeSlotMarker/>
 └─ <DayFooterBar>  <FocusModeToggle/> <ProgressSummary/>

<HabitsPage>
 ├─ <HabitGrid> → <HabitCard/> → <StreakBadge/> <ProgressRing/>
 └─ <AISkipNudgeBanner/>

<FocusPage>
 ├─ <PomodoroRing/>  <SessionControls/>  <AmbientBackground/>

<StatsPage>
 ├─ <StatSummaryRow/>  (focus score, productive hrs, tasks)
 ├─ <TrendChart/>  (mood, habit streaks — recharts)
 └─ <AIRecommendationCard/>

<ChatPanel>
 ├─ <MessageList> → <MessageBubble/> → <ToolCallCard/>  (renders schedule diffs inline)
 └─ <ChatComposer/>
```

### Shared/utility components
`EmptyState`, `ConfirmDialog` (used for bulk AI actions), `AnimatedNumber` (stat counters), `SkeletonBlock` (loading), `GlassCard` (glassmorphism surface primitive used sparingly: chat rail, modals), `AnimatePresence`-wrapped list transitions for timeline reflows (Framer Motion `layout` animations).

### State/data conventions
- Server state via React Query, hydrated from Server Components, mutated via Server Actions with optimistic updates on the timeline (block "ghosts" into new position before server confirms).
- Realtime: Supabase Realtime channel per user for `schedule_items` + `notifications`, so multi-device and background-job-driven changes (delay detection) appear live without polling.
- Global light client state (chat panel open/closed, focus mode active) via a small Zustand store — no Redux.

---

## 10. AI Architecture

### 10.1 Two-layer design: deterministic solver + LLM reasoning
LLMs are bad at exact arithmetic over time slots and bad at guaranteeing constraints are never violated. So:
- **Scheduling engine (`lib/scheduling/solver.ts`)** — deterministic, testable TypeScript. Given fixed anchors (meetings/appointments), flexible items (tasks/habits) with priority/duration/due dates, and user preferences (working hours, chronotype, break cadence), it produces a valid, non-overlapping timeline. Greedy + constraint-repair algorithm (priority-sorted placement into free gaps, backtrack on due-date violations) — not a full ILP solver for v1; revisit if the greedy approach proves insufficient.
- **LLM (OpenAI)** — handles everything fuzzy: parsing natural language into structured items, estimating duration for an ambiguous task ("finish deck" → historical data + heuristics + LLM judgment), generating the plain-English "why" explanations, and driving the conversational assistant.
- The LLM never directly writes times. It proposes *priorities, estimates, and constraints*; the solver computes the actual timeline. This keeps output deterministic, debuggable, and impossible to "hallucinate" into an overlapping schedule.

### 10.2 Plan generation flow
```
User items + preferences + calendar events
        │
        ▼
 [LLM: classify + estimate]  -- structured output (Zod-validated JSON via function calling)
        │  {type, priority, estimatedDuration, flexibility}
        ▼
 [Solver: constraint placement] -- deterministic TS
        │  timeline of ScheduleItems w/ start/end
        ▼
 [LLM: generate reasoning summary]  -- one short paragraph + per-item ai_reasoning
        │
        ▼
   Persisted to schedule_items, streamed to client
```

### 10.3 AI Assistant Chat (tool-calling agent)
- Implemented with OpenAI function calling (tools), not open-ended free text mutation.
- Tool surface: `getSchedule(range)`, `getFreeSlots(range)`, `proposeReschedule(itemIds, strategy)`, `createItem(...)`, `updateItem(...)`, `applyChanges(diff)` (requires explicit confirm for bulk/destructive diffs).
- Multi-turn loop: model calls read tools to gather context → drafts a natural-language answer + optional diff → UI renders diff as a confirm card → on confirm, `applyChanges` executes through the same Server Actions as manual edits (single source of truth, same validation/RLS path).
- Streamed via SSE/Vercel AI SDK `useChat` for token-by-token responses with inline tool-call cards.

### 10.4 RAG-ready context layer
- `user_context_embeddings` (pgvector) stores durable facts: stated preferences ("hates morning meetings"), recurring patterns, summarized past chat decisions — *not* raw transient schedule data (that's already queried live via tools).
- Retrieval: on each chat turn, embed the query, pull top-k relevant context rows, inject into the system prompt alongside live tool access. This is additive — the MVP ships with tool-calling only; embeddings layer turns on in V2 once there's enough interaction history to make retrieval useful.

### 10.5 Smart notification generation
- Deterministic triggers (cron jobs, §5.3) detect *when* to notify (delay found, weather API shows rain in next N minutes, habit skip window passed, gap of 45+ min free).
- LLM only used to phrase the message naturally and, where relevant, choose between 2-3 candidate remediations (compressed prompt, small/cheap model e.g. `gpt-4.1-mini` class) — never to decide whether to fire at all (that stays deterministic to avoid notification fatigue or missed alerts from model unreliability).

### 10.6 Duration estimation
Layered fallback: (1) user-provided estimate, (2) historical average for similar-titled/tagged tasks (`schedule_items` self-lookup by fuzzy title/category), (3) LLM estimate with reasoning, (4) category default (from `user_settings`). Each estimate is stored with its source so the UI can show confidence ("estimated" vs "your usual").

### 10.7 Prompt/version management
`lib/ai/prompts/*.ts` — versioned, testable prompt templates with typed inputs; snapshot-tested against expected structured outputs in `tests/unit` so prompt edits don't silently regress parsing quality.

---

## 11. Security Considerations

- **Auth**: Supabase Auth (JWT), enforced session refresh in middleware; every Server Action re-derives the user server-side — never trust a client-passed `user_id`.
- **Row Level Security everywhere**: every table policy-scoped to `auth.uid()`; RLS is the last line of defense even though app code also filters by user — defense in depth, not either/or.
- **OAuth token storage**: calendar access/refresh tokens encrypted at rest (Supabase Vault or `pgcrypto` with a server-only key, never exposed to client); tokens never sent to the browser — all calendar API calls happen server-side/edge-function-side.
- **Least-privilege OAuth scopes**: request only `calendar.events` (not full account) scopes from Google/Microsoft; document exact scopes in Settings → Integrations for user transparency.
- **Webhook verification**: Google/Microsoft calendar push notifications verified via their signature/token schemes before processing; reject unverified payloads.
- **AI tool-call guardrails**: the chat agent's mutating tools run through the *same* Zod-validated Server Actions as manual UI edits — the model cannot bypass validation, ownership checks, or RLS. Bulk/destructive actions always require an explicit user confirm step server-side records who (user vs AI) triggered a change (`reschedule_events.triggered_by`).
- **Prompt injection resilience**: content pulled from external calendar event titles/descriptions is treated as untrusted data, never as instructions — system prompts explicitly delineate "data" vs "instructions," and tool outputs are wrapped/labeled before being fed back to the model.
- **Rate limiting**: per-user rate limits on `/api/ai/*` routes (token bucket via Upstash/Redis or Supabase-based counter) to control OpenAI cost and abuse.
- **Secrets**: OpenAI key, calendar client secrets, encryption keys — server-only env vars, never in client bundles; Vercel environment variable encryption.
- **PII minimization**: mood logs, calendar content are sensitive — encrypt at rest where feasible, exclude from analytics/logging pipelines, support full account data export + deletion (GDPR-style right to erasure) from day one given the personal nature of the data.
- **Transport**: HTTPS everywhere (Vercel default), HSTS, secure/http-only cookies for session.
- **Dependency hygiene**: automated dependency scanning (Dependabot/Renovate) given the app touches multiple OAuth providers and an LLM API.

---

## 12. Performance Optimizations

- **Rendering**: Server Components for initial data (today's schedule, habits, stats) — no client-side loading spinner for the primary view; client components only where interactivity is required (timeline drag, chat).
- **Realtime over polling**: Supabase Realtime subscriptions for schedule/notification updates instead of interval polling — cheaper and instant.
- **Streaming AI responses**: chat and plan-generation responses stream token-by-token (Vercel AI SDK) so perceived latency is low even though full generation + solver pass may take a couple seconds.
- **Optimistic UI**: drag-to-reschedule and quick actions (mark complete, log habit) update the UI instantly, reconciled against server response; rollback with a toast on failure.
- **Caching**: calendar event reads cached (`calendar_events_cache` pattern or short-TTL edge cache) to avoid hammering Google/Microsoft APIs on every page load; weather/traffic lookups cached per-location for a few minutes.
- **Database**: composite indexes on `(user_id, scheduled_start)` and `(user_id, status)` for the hot timeline query; `pgvector` HNSW index on `user_context_embeddings` once RAG is enabled; partition/cleanup old `reschedule_events` and `notifications` on a retention job.
- **Edge/regional placement**: Vercel Edge Runtime for lightweight route handlers (webhooks, redirects); Node runtime for AI/solver routes that need full SDKs.
- **Cost control**: cheaper model tier for high-frequency, low-complexity tasks (notification phrasing, quick-add parsing) vs a stronger model for full plan generation and complex chat reasoning; response caching for repeated identical parse requests.
- **Bundle size**: shadcn components tree-shaken (copy-in, not a monolithic package); Framer Motion used selectively (route-level code splitting for stats/charting libraries so `recharts` isn't in the initial bundle).
- **Images/assets**: `next/image`, avatar storage via Supabase Storage with on-the-fly resizing/CDN caching.

---

## Open questions for approval

1. **Calendar provider order** — confirm Google first for MVP (highest user overlap), Outlook/Apple in V2, per the roadmap above.
2. **AI model choice** — plan to use OpenAI (per your spec) with a cheaper model for notification phrasing/parsing and a stronger model for plan generation + chat; confirm you're OK with a two-tier model strategy for cost control.
3. **Scheduling algorithm** — greedy constraint-repair solver for MVP (fast, deterministic, easy to test) rather than a full optimization solver; revisit only if real usage shows it's insufficient.
4. **Mobile** — MVP is responsive web (per your Next.js/Vercel stack); native apps are V3. Confirm that's acceptable, since "notifications" like leave-now nudges work better with native push.

---

## Next step

Once you approve this plan (as-is or with edits), implementation will proceed **in milestones**, each shipped and reviewed before the next:

1. Project scaffold (Next.js + TypeScript + Tailwind + shadcn + Supabase project wiring, auth, base layout, design tokens)
2. Database schema + RLS migrations
3. Today timeline (manual CRUD first, no AI yet) — prove the core UX
4. AI plan generation + duration estimation
5. AI chat assistant with tool-calling
6. Google Calendar two-way sync
7. Habits + Focus Mode
8. Smart notifications (cron jobs)
9. Weekly stats
10. Polish pass: animations, empty states, accessibility, dark mode

No milestone starts until the previous one is confirmed working.
