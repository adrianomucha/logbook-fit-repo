# Development Guide

Technical reference for Logbook.fit. For step-by-step local setup, see [QUICKSTART.md](QUICKSTART.md).

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (Supabase recommended)

### Installation

```bash
git clone git@github.com:adrianomucha/logbook-fit-repo.git
cd logbook-fit-repo
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://...@...pooler.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@...supabase.co:5432/postgres"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

Run migrations, seed, and start:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploying

Checklist for a production or staging deploy. Several subsystems degrade
*silently* when their env is missing — the `/admin` banner and the
`_ALERT]`-tagged log lines (set a Vercel log alert on `_ALERT]`) are the
signals that something below was skipped.

Required env for a correct deploy:

| Var | Missing it means |
|-----|------------------|
| `DATABASE_URL` + `DIRECT_URL` | nothing works |
| `NEXTAUTH_SECRET` | NextAuth fails; password-reset tokens can't be minted |
| `NEXTAUTH_URL` | emailed links point at the per-deploy `*.vercel.app` host |
| `NEXT_PUBLIC_SITE_URL` | staging emits production canonicals/OG URLs |
| `RESEND_API_KEY` + `WAITLIST_FROM_EMAIL` | every email silently skipped |
| `ADMIN_EMAILS` | `/admin` 404s for everyone; no beta invites |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | rate limiting effectively off on serverless |
| `CRON_SECRET` | the nightly check-in sweep refuses every call — weekly check-ins never send on their own |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | push notifications no-op (optional) |

Gotchas:

- **`NEXT_PUBLIC_DEMO_MODE` is inlined at build time.** On any deployed build
  the seeded demo accounts are locked unless this was `"true"` when the build
  ran — flipping it on Vercel requires a redeploy, not a restart. Locked demo
  sign-ins now say so on the login page instead of "invalid password".
- **Migrations run on production deploys only** by default. A staging project
  with its own database should set `MIGRATE_ON_PREVIEW="true"`; previews
  sharing the production database must leave it unset, or they'd apply
  unreleased migrations.
- Client-side crashes are reported to `POST /api/client-errors` and logged as
  `[CLIENT_ERROR_ALERT]` — include that tag in your log alert too.

## Scheduled work

One cron, declared in `vercel.json`: `/api/cron/check-ins` runs nightly at
09:00 UTC, authenticated with `Authorization: Bearer $CRON_SECRET`. It expires
check-ins the client never answered and sends the ones that are due, for every
active relationship with `checkInScheduleEnabled`.

This is what makes "auto-sends every 7 days" true. Scheduling is also
materialized opportunistically when either party loads check-in data, so a due
check-in shows up immediately rather than at the next sweep — but the sweep is
the authority, because it reaches clients who aren't opening the app, which is
exactly the fade the product exists to catch.

Run it by hand against a deployment with:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/check-ins
```

It answers `{ok, relationshipsScanned, checkInsCreated, failures}` and logs
`[CRON_ALERT]` if any client failed.

## Project Structure

```
src/
├── app/
│   ├── api/              # 33 API route handlers
│   │   ├── auth/         # Signup, NextAuth
│   │   ├── coach/        # Dashboard, clients
│   │   ├── client/       # Week overview, workout execution
│   │   ├── plans/        # Plan CRUD
│   │   ├── exercises/    # Exercise library
│   │   ├── check-ins/    # Check-in flow
│   │   ├── messages/     # Messaging
│   │   └── me/           # Current user
│   ├── coach/            # Coach pages
│   └── client/           # Client pages
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── coach/            # Coach-specific components
│   └── client/           # Client-specific components
├── views/                # Page-level view components
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma singleton
│   ├── scoping.ts        # RBAC scoping utilities
│   └── middleware/        # withCoach / withClient guards
└── types/
prisma/
├── schema.prisma         # 16 models, 7 enums
├── seed.ts               # Demo data seeder
├── sql/                  # Post-migration hardening SQL
└── migrations/
```

## Database Schema

17 models across 5 domains:

- **Auth** — User, CoachProfile, ClientProfile
- **Relationships** — CoachClientRelationship, ClientInvite
- **Training** — Exercise, Plan, Week, Day, WorkoutExercise
- **Tracking** — WorkoutCompletion, SetCompletion, ExerciseFlag
- **Communication** — CheckIn, Message, PushSubscription

## Messaging & Notifications

**Delivery.** There is no socket between the server and an open page, so chat
threads poll: `useMessages` runs at 3s while a chat is on screen and 20s when
it isn't, and refetches on tab focus, network reconnect, and `visibilitychange`
(the last one is what a resumed PWA fires — without it, an installed app can
show a frozen thread until it's force-closed). Fetches go out `no-store` and
`GET /api/messages/[userId]` answers `Cache-Control: no-store`, so no browser
or proxy cache can serve a stale thread.

**In-app.** `GET /api/messages/unread` returns per-thread unread counts for the
signed-in user, scoped to live coaching relationships. It drives the nav
badges, the coach roster's "N new" chips, and the arrival toast rendered by
`MessageNotifications` in both app layouts.

**Push (app closed).** Web Push via `lib/push.ts` and `public/sw.js`. Set
`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`)
plus `VAPID_SUBJECT`; unset, the feature no-ops and the opt-in never appears.
Devices register through `POST /api/push/subscription`, and endpoints that
return 404/410 are deleted on the next send. iOS only delivers Web Push to
apps installed to the home screen (16.4+), which the toggle detects and says
so instead of offering a button that can't work.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open database GUI |
| `npx prisma db seed` | Seed demo data |

## Demo Accounts

After seeding, log in with:

| Role | Email | Password |
|------|-------|----------|
| Coach | `coach@logbook.fit` | `demo1234` |
| Client | `client@logbook.fit` | `demo1234` |
