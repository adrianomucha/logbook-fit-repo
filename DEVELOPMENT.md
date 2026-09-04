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

## Native app

The iOS app lives in `mobile/` (Expo / React Native) and is its own npm
project with its own lockfile — `cd mobile && npm install && npx expo start`.
It consumes `packages/shared` as source and talks to the API with a bearer
token (next section). `mobile/README.md` has the layout and the no-Xcode
checks (`npm run typecheck`, `npm run export:ios`); `IOS_APP_PLAN.md` has the
roadmap and status.

The app mirrors the client web screens one to one, so a change to a
client-facing web screen should ship with its `mobile/` counterpart where
practical. Logic that both need lives in `packages/shared` (the web keeps a
one-line re-export at the old `src/lib` path); only the render layer is
written twice. Profile photos upload as raw bytes to `PUT /api/account/avatar`
with the bearer token (`mobile/src/lib/avatar.ts`), the one request that
bypasses the shared JSON client.

## Native app auth (bearer tokens)

Browsers hold the NextAuth session in a cookie. The iOS app has no cookie
jar worth trusting, so it carries the same kind of JWT in an
`Authorization: Bearer <token>` header instead. Every API route reads the
session through `getSession()` (`src/lib/session.ts`), which accepts either;
route code never learns which.

- `POST /api/auth/mobile/login` `{email, password}` → `{token, expiresAt, user}`.
  Same checks as the web sign-in (`src/lib/credentials.ts`): demo lock (403,
  `code: "demo_locked"`), rate limit by IP + email (429, `code: "rate_limited"`),
  and a generic 401 for a wrong email or password.
- `POST /api/auth/mobile/refresh` with a still-valid bearer → a fresh 30-day
  token, after re-checking the account exists and isn't a locked demo. A 401
  here means "sign in again".
- Tokens are encrypted with `NEXTAUTH_SECRET`, live 30 days like the cookie,
  and are stateless — `getSession()` does one primary-key lookup per request
  so a deleted user (`deletedAt`) is turned away on every device at once.
- `DELETE /api/me` `{password}` retires the signed-in account
  (`src/lib/account-deletion.ts`): ends every coaching relationship the way
  the coach/client termination does, revokes open invites, drops push
  devices, and scrubs name/email/password on the row (kept so the other
  party's history stays intact). Demo accounts refuse. The web offers it
  from the account menu; the app must too (App Store guideline 5.1.1(v)).

Try it against a running dev server:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/mobile/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"client@logbook.fit","password":"demo1234"}' | jq -r .token)
curl -s localhost:3000/api/me -H "Authorization: Bearer $TOKEN"
```

## App Review accounts

App Store reviewers sign in against production, where the seeded demo logins
are locked. `prisma/seed_reviewer.ts` creates a real coach + client pair with
an assigned plan, a pending check-in, one answered check-in and an unread
chat thread — enough to walk every client screen. Credentials come from the
environment and belong in App Store Connect's review notes only:

```bash
REVIEWER_COACH_EMAIL=... REVIEWER_CLIENT_EMAIL=... REVIEWER_PASSWORD='...' \
  npx tsx prisma/seed_reviewer.ts
```

Re-running reuses the accounts and resets their password (that is how you
rotate it); the plan, check-ins and messages are only created when missing.

## Demo account for coach calls

For a setup or sales call with a coach, `prisma/seed_demo_call.ts` builds a
real, unlocked coach account ("Jamie Porter") with a roster that puts a client
in every dashboard bucket, a check-in waiting for review, a flagged exercise,
unread chat and a client account the coach can switch into. The scenario,
credentials handling and a suggested run of show are in
[DEMO_CALL.md](DEMO_CALL.md).

```bash
DEMO_CALL_PASSWORD='...' npm run seed:demo-call
```

Re-running rebuilds the scenario from scratch with the timeline anchored to
today, so run it the morning of a call and again afterwards to reset whatever
was done live.

## Scheduled work

One cron, declared in `vercel.json`: `/api/cron/check-ins` runs nightly at
09:00 UTC, authenticated with `Authorization: Bearer $CRON_SECRET`. It expires
check-ins the client never answered and sends the ones that are due, for every
active relationship with `checkInScheduleEnabled`. The cadence is per
relationship (`checkInIntervalDays`, default 7, with an optional
`checkInDayOfWeek` anchor evaluated in the client's timezone), set by the
coach from the client workspace's check-in tab. Timezones are IANA
identifiers on `User.timezone`, captured silently from the browser on app
load (`TimezoneSync` → `PUT /api/account/timezone`); the scheduler falls
back to UTC when one is missing or invalid.

This is what makes "auto-sends on the configured cadence" true. Scheduling is also
materialized opportunistically when either party loads check-in data, so a due
check-in shows up immediately rather than at the next sweep — but the sweep is
the authority, because it reaches clients who aren't opening the app, which is
exactly the fade the product exists to catch.

Run it by hand against a deployment with:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/check-ins
```

It answers `{ok, relationshipsScanned, checkInsCreated, failures}` and logs
`[CRON_ALERT]` if any client failed. Every invocation also writes a row to
`cron_runs` (start, finish, outcome, summary), which is what `/admin/health`
reads: a sweep with no run in 36 hours is shown as down, so a cron that
silently stops — rotated secret, schedule dropped — is visible without
digging through Vercel logs.

## Admin

`/admin` (allowlisted by `ADMIN_EMAILS`) is a single page with five tabs,
switched on the client and mirrored to `?tab=` (the old per-section URLs
redirect). Every panel is server-rendered and streamed in behind its own
fallback, so switching costs no request. **Overview** is
aggregate usage — people, activity, funnel, weekly signups and workouts —
with demo and sample accounts excluded and chat reported as counts only,
never message text. **Waitlist**, **Accounts** and **Feedback** are the
working inboxes. **Health** runs live probes on every visit (Postgres,
Upstash Redis, mailer config, the check-in sweep's last run, required env
vars) and lists the sweep's recent runs.

## Project Structure

```
mobile/               The iOS app (Expo / React Native) — own package.json
packages/shared/      @logbook/shared — types, zod schemas, adapters and pure
                      helpers used by both the web app and the native app
                      (see packages/shared/README.md)
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
│   ├── session.ts        # Cookie or bearer → Session, for every API route
│   ├── prisma.ts         # Prisma singleton
│   ├── scoping.ts        # RBAC scoping utilities
│   ├── middleware/        # withCoach / withClient guards
│   └── reps.ts, …        # One-line re-exports of the @logbook/shared modules
└── types/                # Re-exports of @logbook/shared/types
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

**Push (native app).** The same `notify*` entry points also reach the iOS app
through Expo's push service. `PushSubscription.provider` says which transport
a row uses: `WEB` rows are browser subscriptions, `EXPO` rows hold an Expo
push token in `endpoint` and no keys. The app registers with
`POST /api/push/subscription` `{provider: "EXPO", token, deviceName?}` and
leaves with `DELETE` and the same body. Nothing to configure server-side:
Expo delivers with the app's own APNs credentials (`EXPO_ACCESS_TOKEN` is
optional). Tokens Expo reports as `DeviceNotRegistered` are deleted on the
next send, like a 410 on the web. The payload's `url` and `tag` arrive in the
notification's `data`, and `tag` doubles as the APNs collapse id so a repeat
from the same person replaces the last notification instead of stacking.

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
