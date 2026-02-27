# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Your Database

Create a free PostgreSQL database on [Supabase](https://supabase.com):

1. Sign up at supabase.com and create a new project
2. Go to **Settings > Database** and copy the connection strings
3. Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].supabase.co:5432/postgres"
NEXTAUTH_SECRET="paste-a-random-string-here"
NEXTAUTH_URL="http://localhost:3000"
```

To generate NEXTAUTH_SECRET, run:
```bash
openssl rand -base64 32
```

## 3. Run Database Migration

```bash
npx prisma migrate dev --name init
```

This creates all 16 tables. Then apply the extra SQL:

```bash
npx prisma db execute --file prisma/sql/post_001_partial_unique_indexes.sql
npx prisma db execute --file prisma/sql/post_002_workout_completion_trigger.sql
npx prisma db execute --file prisma/sql/post_003_check_constraints.sql
```

## 4. Seed Demo Data

```bash
npx prisma db seed
```

Creates: 1 coach, 1 client, 25 exercises, and a sample 4-week plan.

## 5. Start the App

```bash
npm run dev
```

Open http://localhost:3000

## 6. Verify Everything Works

Open the database GUI to see your data:
```bash
npx prisma studio
```

This opens a browser at http://localhost:5555 where you can browse all tables.

## Demo Accounts

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| Coach  | coach@logbook.fit   | demo1234  |
| Client | client@logbook.fit  | demo1234  |

## Current State

The app currently has two layers:

1. **Demo mode (active):** localStorage-based UI that works without a database. Switch between Coach/Client views using the button in the top-right corner.

2. **API layer (built, not wired to frontend):** 33 API endpoints backed by Prisma/PostgreSQL. These will replace the demo mode page-by-page in the next phase.

## Troubleshooting

### "Can't reach database server"
- Double-check your `DATABASE_URL` and `DIRECT_URL` in `.env`
- Make sure the Supabase project is running (not paused)

### "prisma migrate dev fails"
- Ensure you have the `DIRECT_URL` set (not the pooler URL) — Prisma migrations need a direct connection

### "Module not found: generated/prisma"
- Run `npx prisma generate` to regenerate the Prisma client

### Reset everything
```bash
npx prisma migrate reset    # Drops all tables and re-migrates
npx prisma db seed           # Re-seeds demo data
```
