# LogBook.fit

A simple coach-first platform to plan workouts, track progress, and stay connected with clients.

## Demo Version

This is a lightweight demo built to quickly test concepts with users. Features:

- No authentication required
- LocalStorage for data persistence
- Pre-populated sample data
- Switch between Coach and Client views

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **UI Components:** shadcn/ui (Neutral theme)
- **Styling:** Tailwind CSS
- **Font:** JetBrains Mono
- **Icons:** Lucide React
- **Storage:** LocalStorage (no database)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Features

### Coach View

- **Client Management:** View all clients with adherence rates and status
- **Workout Plan Builder:** Create and edit workout plans with weeks, days, and exercises
- **Chat:** Direct messaging with clients
- **Progress Tracking:** Monitor client completion rates

### Client View

- **Today's Workout:** Clean, focused view of the current day's exercises
- **Exercise Tracking:** Mark exercises as complete and log weights
- **Chat:** Message your coach directly
- **Progress History:** View past completed workouts

## Demo Users

### Coach Account
- Sarah Johnson (sarah@coach.com)

### Client Accounts
- Mike Chen (mike@example.com)
- Emma Wilson (emma@example.com)
- Alex Rodriguez (alex@example.com)

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── coach/           # Coach-specific components
│   └── client/          # Client-specific components
├── pages/
│   ├── CoachDashboard.tsx
│   └── ClientDashboard.tsx
├── lib/
│   ├── storage.ts       # LocalStorage utilities
│   ├── sample-data.ts   # Pre-populated demo data
│   └── utils.ts         # Helper functions
├── types/
│   └── index.ts         # TypeScript type definitions
├── App.tsx              # Main app with role switcher
└── main.tsx             # Entry point
```

## Data Models

### Core Types

- **Exercise:** Individual exercise with sets, reps, weight, and notes
- **WorkoutDay:** Collection of exercises for a specific day
- **WorkoutWeek:** Collection of workout days
- **WorkoutPlan:** Complete plan with multiple weeks
- **Client:** Client profile with assigned plan and progress
- **Coach:** Coach profile with list of clients
- **Message:** Chat messages between coach and client
- **CompletedWorkout:** Record of completed exercises

## Storage

All data is stored in localStorage under the key `logbook_fit_data`. The app automatically initializes with sample data on first load.

To reset data: Clear browser localStorage or open DevTools → Application → LocalStorage → Clear

## Next Steps (Post-MVP)

- Real authentication
- Backend API and database
- Exercise library and templates
- Push notifications
- Media support (videos, images)
- Advanced analytics
- Mobile apps

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Design System

- **Theme:** Neutral with small border radius
- **Font:** JetBrains Mono (monospace)
- **Colors:** Neutral palette with semantic color tokens
- **Components:** Built with shadcn/ui and Tailwind CSS

## License

Private - All rights reserved
