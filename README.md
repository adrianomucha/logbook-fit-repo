# LogBook.fit

A coach-first platform to plan workouts, track progress, and stay connected with clients.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React + TypeScript
- **Database:** PostgreSQL (Supabase) via Prisma v6
- **Auth:** NextAuth.js with Credentials provider + JWT sessions
- **UI Components:** shadcn/ui (Neutral theme)
- **Styling:** Tailwind CSS
- **Fonts:** IBM Plex Mono
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (Supabase recommended)

### Installation

1. Clone the repo and install dependencies:

```bash
git clone git@github.com:adrianomucha/logbook-fit-repo.git
cd logbook-fit-repo
npm install
```

2. Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase database URLs and NextAuth secret:

```env
DATABASE_URL="postgresql://...@...pooler.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@...supabase.co:5432/postgres"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

3. Run database migrations (includes schema + DB hardening: indexes, triggers, constraints):

```bash
npx prisma migrate dev
```

> **Note:** The `20260227_db_hardening` migration applies partial unique indexes,
> the workout-completion trigger, and check constraints. All statements are
> idempotent and safe to re-run. The individual SQL files in `prisma/sql/`
> are kept for reference but no longer need to be applied manually.

4. Seed the database with demo data:

```bash
npx prisma db seed
```

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`

## Demo Accounts (after seeding)

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| Coach  | coach@logbook.fit   | demo1234  |
| Client | client@logbook.fit  | demo1234  |

## API Endpoints (33 total)

### Auth (3)
- `POST /api/auth/signup` - Create account
- `POST /api/auth/[...nextauth]` - NextAuth login/logout
- `GET /api/me` - Current user profile

### Coach (18)
- `GET /api/coach/dashboard` - Dashboard with urgency-sorted clients
- `GET /api/coach/clients` - All clients
- `GET /api/coach/clients/[id]` - Client detail
- `GET/POST /api/plans` - List/create plans
- `GET/PUT/DELETE /api/plans/[id]` - Plan CRUD
- `POST /api/plans/[id]/weeks` - Add week to plan
- `POST /api/plans/[id]/assign` - Assign plan to client
- `GET/POST /api/exercises` - Exercise library
- `PUT /api/exercises/[id]` - Update exercise
- `POST /api/days/[id]/exercises` - Add exercise to day
- `PUT/DELETE /api/workout-exercises/[id]` - Manage workout exercises
- `POST /api/invites` - Create client invite
- `POST /api/check-ins` - Initiate check-in

### Client (8)
- `GET /api/client/week-overview` - Current week
- `GET /api/client/workout/day/[id]` - Day's exercises
- `POST /api/client/workout/start` - Start workout
- `PUT /api/client/workout/[id]/sets` - Log sets (batch)
- `POST /api/client/workout/[id]/finish` - Complete workout
- `POST /api/client/workout/[id]/flag` - Flag exercise
- `GET /api/client/progress` - Progress stats
- `PUT /api/check-ins/[id]/client-respond` - Respond to check-in

### Shared (4)
- `GET /api/check-ins/[id]` - Check-in detail
- `PUT /api/check-ins/[id]/coach-respond` - Coach reviews check-in
- `GET /api/messages/[userId]` - Message thread
- `POST /api/messages` - Send message

## Project Structure

```
src/
├── app/
│   ├── api/                # 33 API route handlers
│   │   ├── auth/           # Signup, NextAuth
│   │   ├── coach/          # Dashboard, clients
│   │   ├── client/         # Week overview, workout execution
│   │   ├── plans/          # Plan CRUD
│   │   ├── exercises/      # Exercise library
│   │   ├── check-ins/      # Check-in flow
│   │   ├── messages/       # Messaging
│   │   └── me/             # Current user
│   ├── coach/              # Coach pages (App Router)
│   ├── client/             # Client pages (App Router)
│   └── globals.css         # Tailwind + design tokens
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── coach/              # Coach-specific components
│   └── client/             # Client-specific components
├── views/                  # Page-level view components
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma singleton
│   ├── scoping.ts          # RBAC scoping utilities
│   ├── middleware/          # withCoach / withClient RBAC
│   └── utils.ts            # Helpers
├── providers/
│   └── AppStateProvider.tsx # Demo mode (localStorage)
├── types/
│   └── next-auth.d.ts      # Session type augmentation
prisma/
├── schema.prisma           # 16 models, 7 enums
├── seed.ts                 # Demo data seeder
├── sql/                    # Post-migration SQL
│   ├── post_001_partial_unique_indexes.sql
│   ├── post_002_workout_completion_trigger.sql
│   └── post_003_check_constraints.sql
└── migrations/
    └── migration_lock.toml
```

## Database Schema

16 models across 4 domains:

- **Auth:** User, CoachProfile, ClientProfile
- **Relationships:** CoachClientRelationship, ClientInvite
- **Training:** Exercise, Plan, Week, Day, WorkoutExercise
- **Tracking:** WorkoutCompletion, SetCompletion, ExerciseFlag
- **Communication:** CheckIn, Message

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open database GUI |
| `npx prisma db seed` | Seed demo data |

## Design System

- **Theme:** Neutral with 0.625rem border radius
- **Font:** IBM Plex Mono (font-sans / font-heading)
- **Colors:** Neutral palette + semantic tokens (success, warning, info, destructive)
- **Components:** shadcn/ui + Tailwind CSS

## License

Private - All rights reserved
