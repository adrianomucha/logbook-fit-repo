# Development Guide

Technical reference for Logbook.fit. For step-by-step local setup, see [QUICKSTART.md](QUICKSTART.md).

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

## Demo Accounts

After seeding, log in with:

| Role | Email | Password |
|------|-------|----------|
| Coach | `coach@logbook.fit` | `demo1234` |
| Client | `client@logbook.fit` | `demo1234` |
