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

interface ProgressHistoryProps {
  // Legacy props (kept for backward compatibility)
  completedWorkouts: CompletedWorkout[];
  plans: WorkoutPlan[];
  // New props for enhanced progress view
  client?: Client;
  plan?: WorkoutPlan;
  workoutCompletions?: WorkoutCompletion[];
  measurements?: Measurement[];
}

/**
 * Generate a single-sentence verdict that connects the stats to how the client is doing.
 * This turns raw numbers into coaching-flavored encouragement.
 */
function getProgressVerdict(
  completions: WorkoutCompletion[],
  targetPerWeek: number,
): string {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekCompleted = completions.filter((c) => {
    if (!c.completedAt || c.status !== 'COMPLETED') return false;
    const date = parseISO(c.completedAt);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  }).length;

  const totalCompleted = completions.filter((c) => c.status === 'COMPLETED').length;

  // No history at all
  if (totalCompleted === 0) {
    return 'Your first workout will kick things off.';
  }

  // All done this week
  if (thisWeekCompleted >= targetPerWeek) {
    return 'You hit your target this week — consistency is building.';
  }

  // Ahead of pace
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const expectedByNow = Math.ceil((dayOfWeek / 7) * targetPerWeek);
  if (thisWeekCompleted >= expectedByNow) {
    const remaining = targetPerWeek - thisWeekCompleted;
    if (remaining === 1) return 'On pace — one more this week and you\'re set.';
    return `On pace — ${remaining} more this week to hit your target.`;
  }

  // Behind pace but some work done
  if (thisWeekCompleted > 0) {
    const remaining = targetPerWeek - thisWeekCompleted;
    if (remaining === 1) return 'Almost there — one more session to close out the week.';
    return `${remaining} sessions left to hit your weekly target.`;
  }

  // Week just started, nothing yet
  if (dayOfWeek <= 2) {
    return 'Week\'s just getting started — you\'ve got this.';
  }

  // Mid-week, nothing done
  return 'Still time to get some sessions in this week.';
}

export function ProgressHistory({
  completedWorkouts: _completedWorkouts,
  plans,
  client,
  plan,
  workoutCompletions,
  measurements,
}: ProgressHistoryProps) {
  // If we have the new props, render the enhanced view
  const hasEnhancedData = client && plan && workoutCompletions;

  const verdict = useMemo(() => {
    if (!hasEnhancedData) return null;
    const target = plan.workoutsPerWeek || 3;
    return getProgressVerdict(workoutCompletions, target);
  }, [hasEnhancedData, plan, workoutCompletions]);

  if (hasEnhancedData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Narrative verdict — connects the numbers to how the client is doing */}
        {verdict && (
          <div className="animate-fade-in-up">
            <p className="text-sm text-muted-foreground px-1">{verdict}</p>
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
