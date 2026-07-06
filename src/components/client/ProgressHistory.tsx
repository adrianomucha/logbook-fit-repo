import { useMemo } from 'react';
import { CompletedWorkout, WorkoutPlan, WorkoutCompletion, Measurement, Client } from '@/types';
import { EnrichedWorkoutHistory } from './progress/EnrichedWorkoutHistory';
import { CollapsedBodyStats } from './progress/CollapsedBodyStats';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns';

interface ProgressStats {
  totalWorkouts: number;
  avgCompletionPct: number;
  currentStreak: number;
  workoutsLast7Days: number;
}

interface ProgressHistoryProps {
  // Legacy props (kept for backward compatibility)
  completedWorkouts: CompletedWorkout[];
  plans: WorkoutPlan[];
  // New props for enhanced progress view
  client?: Client;
  plan?: WorkoutPlan;
  workoutCompletions?: WorkoutCompletion[];
  measurements?: Measurement[];
  progressStats?: ProgressStats;
}

/**
 * Generate a single-sentence verdict that connects the stats to how the client is doing.
 * This turns raw numbers into coaching-flavored encouragement.
 */
type VerdictTone = 'success' | 'warning' | 'neutral';

interface WeekProgress {
  completed: number;
  target: number;
  text: string;
  tone: VerdictTone;
}

function getWeekProgress(
  completions: WorkoutCompletion[],
  targetPerWeek: number,
): WeekProgress {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekCompleted = completions.filter((c) => {
    if (!c.completedAt || c.status !== 'COMPLETED') return false;
    const date = parseISO(c.completedAt);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  }).length;

  const totalCompleted = completions.filter((c) => c.status === 'COMPLETED').length;
  const base = { completed: thisWeekCompleted, target: targetPerWeek };

  if (totalCompleted === 0) {
    return { ...base, text: 'Your first workout will kick things off.', tone: 'neutral' };
  }
  if (thisWeekCompleted >= targetPerWeek) {
    return { ...base, text: 'Target hit — consistency is building.', tone: 'success' };
  }

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const expectedByNow = Math.ceil((dayOfWeek / 7) * targetPerWeek);
  if (thisWeekCompleted >= expectedByNow) {
    const remaining = targetPerWeek - thisWeekCompleted;
    return { ...base, text: remaining === 1 ? 'On pace — one more to go.' : `On pace — ${remaining} more to go.`, tone: 'success' };
  }

  if (thisWeekCompleted > 0) {
    const remaining = targetPerWeek - thisWeekCompleted;
    return { ...base, text: remaining === 1 ? 'Almost there — one more session.' : `${remaining} sessions to go.`, tone: 'warning' };
  }

  if (dayOfWeek <= 2) {
    return { ...base, text: 'Week\'s just getting started.', tone: 'neutral' };
  }

  return { ...base, text: 'Still time to get sessions in.', tone: 'warning' };
}

// Verdict text uses semantic tokens; the segment fill is always volt so the
// strip reads the same as the dashboard's weekly progress strip.
const toneText: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
};

export function ProgressHistory({
  plans,
  client,
  plan,
  workoutCompletions,
  measurements,
  progressStats,
}: ProgressHistoryProps) {
  // If we have the new props, render the enhanced view
  const hasEnhancedData = client && plan && workoutCompletions;

  const weekProgress = useMemo(() => {
    if (!hasEnhancedData) return null;
    const target = plan.workoutsPerWeek || 3;
    return getWeekProgress(workoutCompletions, target);
  }, [hasEnhancedData, plan, workoutCompletions]);

  if (hasEnhancedData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Week progress tracker — same vocabulary as the dashboard's weekly strip */}
        {weekProgress && (
          <div className="animate-fade-in-up rounded-xl bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground shrink-0">
                This week
              </span>
              <p className={`text-[11px] font-semibold text-right ${toneText[weekProgress.tone]}`}>
                {weekProgress.text}
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="font-mono text-2xl font-bold tabular-nums leading-none">
                {weekProgress.completed}
              </span>
              <span className="font-mono text-sm text-muted-foreground/60 font-bold tabular-nums leading-none">
                / {weekProgress.target}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground ml-1">
                sessions
              </span>
            </div>
            <div
              className="flex gap-1.5"
              role="img"
              aria-label={`${weekProgress.completed} of ${weekProgress.target} sessions completed this week`}
            >
              {Array.from({ length: weekProgress.target }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-colors ${
                    i < weekProgress.completed ? 'bg-brand' : 'bg-muted-foreground/15'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Overall stats */}
        {progressStats && (
          <div className="animate-fade-in-up grid grid-cols-3 gap-2" style={{ animationDelay: '25ms' }}>
            <div className="bg-muted/40 rounded-xl px-3 py-4 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums leading-none">
                {progressStats.totalWorkouts}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
                Total
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl px-3 py-4 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums leading-none">
                {progressStats.currentStreak}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
                Streak
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl px-3 py-4 text-center">
              <p className="font-mono text-2xl font-bold tabular-nums leading-none">
                {Math.round(progressStats.avgCompletionPct)}%
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
                Avg
              </p>
            </div>
          </div>
        )}

        {/* Workout History — the full log */}
        <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <EnrichedWorkoutHistory
            completions={workoutCompletions}
            plans={plans}
            initialCount={10}
          />
        </div>

        {/* Collapsed Body Stats - at bottom, tappable to expand */}
        {measurements && measurements.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <CollapsedBodyStats
              measurements={measurements}
              clientId={client.id}
            />
          </div>
        )}
      </div>
    );
  }

  // Fallback: Legacy view (kept for backward compatibility)
  return (
    <div className="space-y-4">
      <EnrichedWorkoutHistory
        completions={[]}
        plans={plans}
        initialCount={10}
      />
    </div>
  );
}
