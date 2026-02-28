<div align="center">

# Logbook.fit

**The coaching platform that puts your clients first.**

Plan workouts. Track progress. Stay connected — all in one place.

[Get Started](#getting-started) &middot; [Features](#features) &middot; [Tech Stack](#tech-stack) &middot; [Demo](#demo-accounts)

</div>

---

## What is Logbook.fit?

Logbook.fit is a **coach-first fitness platform** built for personal trainers who want to stay deeply connected to their clients' progress. Unlike generic fitness trackers, Logbook.fit is designed around the coach-client relationship — coaches build plans, clients execute them, and a built-in check-in loop keeps both sides in sync.

No spreadsheets. No guessing who needs attention. Just a clean workspace that surfaces the right client at the right time.

## Features

### For Coaches

- **Urgency-Sorted Dashboard** — Clients are automatically ranked by who needs attention most: at-risk, check-in due, awaiting response, or on track. No manual triage needed.
- **Exercise Library** — Build a personal library with categories, default prescriptions, and coaching notes. Quick-start with 25 common exercises in one click.
- **Workout Plan Builder** — Create multi-week plans with a visual sidebar showing week/day status. Duplicate exercises, reorder them, and copy across days.
- **Unified Client Profile** — One workspace per client that adapts its layout based on what's urgent. Pending check-in? It becomes the hero card. Otherwise, the plan editor takes focus.
- **Invite-Based Onboarding** — Generate a link, send it to your client. They sign up and they're connected to you instantly. No manual pairing.

### For Clients

- **Today Focus View** — See exactly what's scheduled for today with your coach's notes front and center.
- **Live Workout Execution** — Tap through sets, override weight/reps on the fly, and flag exercises that don't feel right — with a direct message to your coach.
- **Check-In Responses** — Rate your effort, how your body feels, and leave notes. Your coach reviews everything and responds with plan adjustments.
- **Progress Tracking** — See your workout completion history and weekly progress at a glance.

### The Check-In Loop (North Star Feature)

The heart of Logbook.fit is a structured two-way check-in:

1. **Coach sends a check-in** to the client
2. **Client responds** with effort rating, body feeling, and notes
3. **Coach reviews** the response alongside flagged exercises from the past week
4. **Coach replies** with feedback and optionally marks "I'll adjust the plan"

This loop replaces scattered WhatsApp messages with a focused, contextual conversation that lives right inside the client workspace.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React + TypeScript |
| Database | PostgreSQL (Supabase) via Prisma v6 |
| Auth | NextAuth.js — Credentials provider, JWT sessions |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Data Fetching | SWR v2 |
| Font | IBM Plex Mono |
| Icons | Lucide React |
| Deployment | Vercel |

**Database extras:** PostgreSQL triggers for automatic workout completion stats, partial unique indexes for soft-delete support, and check constraints for data integrity.

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

## Demo Accounts

After seeding, log in with:

| Role | Email | Password |
|------|-------|----------|
| Coach | `coach@logbook.fit` | `demo1234` |
| Client | `client@logbook.fit` | `demo1234` |

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

16 models across 4 domains:

- **Auth** — User, CoachProfile, ClientProfile
- **Relationships** — CoachClientRelationship, ClientInvite
- **Training** — Exercise, Plan, Week, Day, WorkoutExercise
- **Tracking** — WorkoutCompletion, SetCompletion, ExerciseFlag
- **Communication** — CheckIn, Message

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open database GUI |
| `npx prisma db seed` | Seed demo data |

## License

Private — All rights reserved
