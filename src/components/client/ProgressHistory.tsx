import { useMemo } from 'react';
import { WorkoutPlan, WorkoutCompletion, Client } from '@/types';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@/lib/workout-helpers';
import { EnrichedWorkoutHistory } from './progress/EnrichedWorkoutHistory';
import { formatStreakLine, getWeekVerdict, weeksTrainedStreak, type WeekVerdict } from '@logbook/shared/progress';
import { formatBestValue, summarizePersonalBests, type PersonalBest } from '@logbook/shared/personal-bests';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ProgressHistoryProps {
  plans: WorkoutPlan[];
  client: Client;
  plan: WorkoutPlan;
  workoutCompletions: WorkoutCompletion[];
  /** Every personal best in the history, newest first (from the progress API) */
  personalBests?: PersonalBest[];
}

// The verdict lives in @logbook/shared/progress so the app shares it.
type VerdictTone = WeekVerdict['tone'];

// Verdict text uses semantic tokens; the segment fill is always volt so the
// strip reads the same as the dashboard's weekly progress strip.
const toneText: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
};

export function ProgressHistory({
  plans,
  plan,
  workoutCompletions,
  personalBests,
}: ProgressHistoryProps) {
  const target = plan.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const { weightUnit } = useCurrentUser();
  const weekProgress = useMemo(
    () => getWeekVerdict(workoutCompletions, target),
    [target, workoutCompletions]
  );

  // Bests set on this plan — the block's story. The shared helpers keep the
  // numbers and wording identical to the app.
  const bests = useMemo(
    () => summarizePersonalBests(personalBests ?? [], plan.id),
    [personalBests, plan.id]
  );

  // Weeks in a row with a session — consistency the client can keep, where
  // "weeks on target" read 0 all block for anyone training under the plan's count
  const streakLine = useMemo(
    () => formatStreakLine(weeksTrainedStreak(workoutCompletions)),
    [workoutCompletions]
  );

  // Kept quiet on purpose: a short list of bests, one number for the week, then the log
  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Personal bests — the lift and what was lifted, nothing else */}
        <section
          aria-label="Personal bests"
          className="animate-fade-in-up rounded-2xl border border-border/70 bg-card"
        >
          <p className="flex items-center gap-1.5 px-4 pt-3.5 pb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Trophy
              className={cn('w-3 h-3', bests.count > 0 ? 'text-success-text' : 'text-muted-foreground')}
              aria-hidden="true"
            />
            Personal bests this block
          </p>
          {bests.count === 0 ? (
            <p className="px-4 pb-4 -mt-1 text-sm text-muted-foreground leading-relaxed antialiased">
              None yet. Beat your last weight or reps on a lift and it shows up here.
            </p>
          ) : (
            <ul aria-label="Latest bests" className="border-t border-border/60 divide-y divide-border/40">
              {bests.latest.map((b) => (
                <li key={`${b.completionId}-${b.exerciseId}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 min-w-0 line-clamp-2 sm:line-clamp-none sm:truncate text-[15px] font-semibold tracking-tight antialiased">
                    {b.exerciseName}
                  </span>
                  <span className="font-mono text-[13px] font-semibold tabular-nums shrink-0">{formatBestValue(b, weightUnit)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Week progress tracker — same vocabulary as the dashboard's weekly strip */}
        {weekProgress && (
          <div className="animate-fade-in-up rounded-2xl bg-muted/40 p-4" style={{ animationDelay: '50ms' }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              This week
            </p>
            <p className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-bold tabular-nums leading-9">
                {weekProgress.completed}
              </span>
              <span className="text-base text-muted-foreground">of {weekProgress.target} sessions</span>
            </p>
            <p className={`mt-1 mb-3 text-sm font-medium ${toneText[weekProgress.tone]}`}>
              {weekProgress.text}
            </p>
            <div
              className="flex gap-1.5"
              role="img"
              aria-label={`${weekProgress.completed} of ${weekProgress.target} sessions completed this week`}
            >
              {Array.from({ length: weekProgress.target }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < weekProgress.completed ? 'bg-brand' : 'bg-muted-foreground/15'
                  }`}
                />
              ))}
            </div>
            {streakLine && <p className="mt-3 text-[13px] text-muted-foreground">{streakLine}</p>}
          </div>
        )}

      {/* Workout History — the full log */}
      <div className="animate-fade-in-up" style={{ animationDelay: '75ms' }}>
        <EnrichedWorkoutHistory
          completions={workoutCompletions}
          plans={plans}
          personalBests={personalBests}
        />
      </div>
    </div>
  );
}
