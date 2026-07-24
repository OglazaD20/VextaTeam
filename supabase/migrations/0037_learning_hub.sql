-- Learning Hub: courses (a course's `subject` field covers the "subjects"
-- requirement without a redundant parent table — a subject is just how a
-- course is categorized), lessons with notes, flashcards with SM-2 spaced
-- repetition, quizzes, and study sessions (their own lightweight timer log,
-- separate from focus_sessions since a study session tracks a lesson/course
-- link and correctness stats that a generic focus session doesn't need).

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null default 'general',
  description text,
  color text,
  icon text,
  exam_date date,
  daily_study_goal_minutes integer,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_user_idx on public.courses (user_id, status);

alter table public.courses enable row level security;
create policy "courses_all_own" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content text,
  is_bookmarked boolean not null default false,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index lessons_course_idx on public.lessons (course_id, sort_order);

alter table public.lessons enable row level security;
create policy "lessons_all_own" on public.lessons
  for all using (
    exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
  );

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  front text not null,
  back text not null,
  -- SM-2 spaced-repetition state.
  ease_factor numeric not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index flashcards_course_idx on public.flashcards (course_id);
create index flashcards_due_idx on public.flashcards (due_at);

alter table public.flashcards enable row level security;
create policy "flashcards_all_own" on public.flashcards
  for all using (
    exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
  );

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create index quizzes_course_idx on public.quizzes (course_id);

alter table public.quizzes enable row level security;
create policy "quizzes_all_own" on public.quizzes
  for all using (
    exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
  );

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_pct smallint not null check (score_pct between 0 and 100),
  answers jsonb not null,
  completed_at timestamptz not null default now()
);

create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id, completed_at desc);

alter table public.quiz_attempts enable row level security;
create policy "quiz_attempts_all_own" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  started_at timestamptz not null default now(),
  duration_minutes integer not null,
  logged_for_date date not null,
  created_at timestamptz not null default now()
);

create index study_sessions_user_date_idx on public.study_sessions (user_id, logged_for_date);

alter table public.study_sessions enable row level security;
create policy "study_sessions_all_own" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI Tutor reuses ai_conversations/ai_messages like nutrition chat does.
alter table public.ai_conversations drop constraint ai_conversations_kind_check;
alter table public.ai_conversations add constraint ai_conversations_kind_check
  check (kind in ('assistant', 'nutrition', 'tutor'));
