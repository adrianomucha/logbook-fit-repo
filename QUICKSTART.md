# Quick Start Guide

## Installation

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## What You'll See

1. **Role Selector Screen**: Choose to login as a coach or client
2. **Pre-loaded Demo Data**: 1 coach (Sarah Johnson) and 3 clients with workout plans
3. **Switch Role Button**: Top-right corner to switch between views anytime

## Testing the Demo

### As Coach (Sarah Johnson):

1. Click "Login as Sarah Johnson"
2. View the **Clients** tab to see all 3 clients with adherence rates
3. Click on a client, then switch to **Plans** tab to:
   - View and edit their workout plan
   - Add new exercises
   - Modify sets, reps, weights
4. Switch to **Chat** tab to message the client

### As Client (Mike Chen):

1. Return to role selector and click "Login as Mike Chen"
2. View today's workout in the **Workout** tab:
   - See all exercises with sets/reps/weights
   - Tap the circle icon to mark exercises complete
   - Add custom weights before completing
3. Switch to **Chat** tab to message your coach
4. Switch to **Progress** tab to see workout history

## Key Features to Showcase

### Coach Experience
- Clean client list with status indicators (green/yellow/red adherence)
- Intuitive plan builder with day tabs
- Inline exercise editing
- Real-time chat

### Client Experience
- Today-focused workout view
- Progress bar showing completion
- Simple tap-to-complete interaction
- Exercise details (sets, reps, weight, notes)
- Workout history

## Data Persistence

- All changes are saved to localStorage automatically
- Refresh the page - your data persists
- To reset: Clear browser localStorage in DevTools

## File Structure

```
logbook-fit/
├── src/
│   ├── components/
│   │   ├── ui/           - shadcn components (button, card, input, etc.)
│   │   ├── coach/        - Coach views (ClientList, PlanBuilder, ChatView)
│   │   └── client/       - Client views (WorkoutView, ClientChat, ProgressHistory)
│   ├── pages/
│   │   ├── CoachDashboard.tsx
│   │   └── ClientDashboard.tsx
│   ├── lib/
│   │   ├── storage.ts    - localStorage helpers
│   │   ├── sample-data.ts - Demo data
│   │   └── utils.ts      - Utility functions
│   ├── types/
│   │   └── index.ts      - TypeScript definitions
│   └── App.tsx           - Main app with role switcher
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Next Steps

After user testing, priority features to add:

1. **Authentication** - Real login system
2. **Backend API** - Replace localStorage with database
3. **Exercise Library** - Pre-built exercise templates
4. **Notifications** - Push notifications for workouts
5. **Analytics** - Progress charts and insights

## Customization

### Adding New Exercises
Login as coach → Select client → Plans tab → Click "Add Exercise"

### Creating New Clients
Currently demo only - edit `src/lib/sample-data.ts` to add more

### Modifying Plans
All plans are editable in real-time through the coach interface
