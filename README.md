# LifeFlow

An AI-powered daily planner that organizes your entire day automatically —
built with Next.js, Supabase, and OpenAI.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full product
vision, database schema, API design, and roadmap.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL/anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

The schema lives in [`supabase/migrations`](supabase/migrations), numbered in
the order they must run. Apply them to your Supabase project with either:

**Option A — SQL Editor (no CLI needed)**
Open your project's SQL Editor at
`https://supabase.com/dashboard/project/<project-ref>/sql/new`, paste each
file's contents in order (`0001_...` through `0008_...`), and run each one.

**Option B — Supabase CLI**
```bash
supabase link --project-ref <project-ref>
supabase db push
```

Row Level Security is enabled on every table — each user can only read/write
their own rows. A trigger auto-creates a `profiles` + `user_settings` row
whenever someone signs up.

## Stack

- **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **AI**: OpenAI API
- **Deployment**: Vercel

## Project status

This project is being built incrementally, one milestone at a time (see the
roadmap in `docs/ARCHITECTURE.md` §12). Current milestone: **project
scaffold** — auth, base layout, and design system are in place; the
scheduling engine, AI features, and calendar sync are not yet implemented.
