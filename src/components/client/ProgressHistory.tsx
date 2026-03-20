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

const toneBlock: Record<VerdictTone, { filled: string; empty: string; text: string }> = {
  success: {
    filled: 'bg-emerald-500',
    empty: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    filled: 'bg-amber-500',
    empty: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
  },
  neutral: {
    filled: 'bg-foreground',
    empty: 'bg-muted-foreground/15',
    text: 'text-muted-foreground',
  },
};

export function ProgressHistory({
  completedWorkouts: _completedWorkouts,
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
        {/* Week progress tracker */}
        {weekProgress && (
          <div className="animate-fade-in-up bg-muted/40 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                This week
              </span>
              <p className={`text-[10px] uppercase tracking-[0.12em] font-bold ${toneBlock[weekProgress.tone].text}`}>
                {weekProgress.text}
              </p>
            </div>
            <div className="flex gap-2 mb-4">
              {Array.from({ length: weekProgress.target }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-sm transition-colors ${
                    i < weekProgress.completed
                      ? toneBlock[weekProgress.tone].filled
                      : toneBlock[weekProgress.tone].empty
                  }`}
                />
              ))}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums leading-none">
                {weekProgress.completed}
              </span>
              <span className="text-lg text-muted-foreground/50 font-bold tabular-nums leading-none">
                / {weekProgress.target}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ml-1">
                sessions
              </span>
            </div>
          </div>
        )}

        {/* Overall stats */}
        {progressStats && (
          <div className="animate-fade-in-up grid grid-cols-3 gap-2" style={{ animationDelay: '25ms' }}>
            <div className="bg-muted/40 rounded-lg px-3 py-4 text-center">
              <p className="text-2xl font-bold tabular-nums leading-none">
                {progressStats.totalWorkouts}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">
                Total
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-4 text-center">
              <p className="text-2xl font-bold tabular-nums leading-none">
                {progressStats.currentStreak}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">
                Streak
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-4 text-center">
              <p className="text-2xl font-bold tabular-nums leading-none">
                {Math.round(progressStats.avgCompletionPct)}%
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">
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
