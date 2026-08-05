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
