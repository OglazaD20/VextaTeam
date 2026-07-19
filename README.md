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
