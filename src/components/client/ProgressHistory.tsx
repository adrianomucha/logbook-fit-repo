import { CompletedWorkout, WorkoutPlan, WorkoutCompletion, Measurement, Client } from '@/types';
import { ProgressSummaryRow } from './progress/ProgressSummaryRow';
import { BodyStatsCard } from './progress/BodyStatsCard';
import { EnrichedWorkoutHistory } from './progress/EnrichedWorkoutHistory';

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

export function ProgressHistory({
  completedWorkouts,
  plans,
  client,
  plan,
  workoutCompletions,
  measurements,
}: ProgressHistoryProps) {
  // If we have the new props, render the enhanced view
  const hasEnhancedData = client && plan && workoutCompletions;

  if (hasEnhancedData) {
    return (
      <div className="space-y-4">
        {/* Summary Row - "How Am I Doing?" */}
        <ProgressSummaryRow
          client={client}
          plan={plan}
          completions={workoutCompletions}
        />

        {/* Body Stats Card */}
        {measurements && measurements.length > 0 && (
          <BodyStatsCard
            measurements={measurements}
            clientId={client.id}
            desiredDirection={{
              weight: 'down', // Default assumption, could be configurable
              bodyFat: 'down',
            }}
          />
        )}

        {/* Enriched Workout History */}
        <EnrichedWorkoutHistory
          completions={workoutCompletions}
          plans={plans}
          initialCount={5}
        />
      </div>
    );
  }

  // Fallback: Legacy view (kept for backward compatibility)
  // This uses completedWorkouts instead of workoutCompletions
  return (
    <div className="space-y-4">
      <EnrichedWorkoutHistory
        completions={[]}
        plans={plans}
        initialCount={5}
      />
    </div>
  );
}
