import { useMemo } from 'react';
import { WorkoutPlan, WorkoutCompletion, Client } from '@/types';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@/lib/workout-helpers';
import { EnrichedWorkoutHistory } from './progress/EnrichedWorkoutHistory';
import { formatWeekStreak, getWeekVerdict, weeksTrainedStreak, type WeekVerdict } from '@logbook/shared/progress';
import { plausibleSessionSec } from '@logbook/shared/session-duration';
import {
  formatBestDelta,
  formatBestValue,
  formatBestWhen,
  summarizePersonalBests,
  type PersonalBest,
} from '@logbook/shared/personal-bests';
import { formatTrainingTime } from '@logbook/shared/plan-summary';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ProgressStats {
  totalWorkouts: number;
  avgCompletionPct: number;
  currentStreak: number;
  workoutsLast7Days: number;
  /** All-time seconds trained — pairs with totalWorkouts */
  totalDurationSec?: number;
}

interface ProgressHistoryProps {
  plans: WorkoutPlan[];
  client: Client;
  plan: WorkoutPlan;
  workoutCompletions: WorkoutCompletion[];
  progressStats?: ProgressStats;
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
  progressStats,
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
  const weekStreak = useMemo(() => weeksTrainedStreak(workoutCompletions), [workoutCompletions]);
  // All-time from the server, like the Workouts tile beside it; summing the
  // (one-year) history is only the fallback for an older server
  const trainedSec =
    progressStats?.totalDurationSec ??
    workoutCompletions.reduce(
      (sum, c) => sum + (c.status === 'COMPLETED' ? plausibleSessionSec(c.durationSec) ?? 0 : 0),
      0
    );
  const [trainedValue, trainedUnit] = formatTrainingTime(trainedSec);

  const tiles: [string, string][] = [
    [String(progressStats?.totalWorkouts ?? workoutCompletions.filter((c) => c.status === 'COMPLETED').length), 'Workouts'],
    [trainedSec >= 60 ? `${trainedValue}${trainedUnit === 'h' ? 'h' : 'm'}` : '—', 'Trained'],
    [formatWeekStreak(weekStreak), 'Streak'],
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Personal bests — the headline and the latest few in one card:
            the count up top, then one line per best */}
        <section
          aria-label="Personal bests"
          className="animate-fade-in-up rounded-2xl border border-border/70 bg-card"
        >
          <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3.5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Personal bests this block
              </p>
              {bests.count > 0 ? (
                <p className="mt-1.5 flex items-baseline gap-2 antialiased">
                  <span className="text-[32px] font-bold tracking-tight leading-none">{bests.count}</span>
                  <span className="text-sm text-muted-foreground">
                    across {bests.exercises} {bests.exercises === 1 ? 'lift' : 'lifts'}
                    {bests.thisWeek > 0 ? ` · ${bests.thisWeek} this week` : ''}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed antialiased">
                  None yet. Beat your last weight or reps on a lift and it shows up here.
                </p>
              )}
            </div>
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                bests.count > 0
                  ? 'bg-brand animate-[completionPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]'
                  : 'bg-muted'
              )}
              aria-hidden="true"
            >
              <Trophy className={cn('w-4 h-4', bests.count > 0 ? 'text-brand-foreground' : 'text-muted-foreground')} />
            </div>
          </div>
          {bests.latest.length > 0 && (
            <ul aria-label="Latest bests" className="border-t border-border/60 divide-y divide-border/40">
              {bests.latest.map((b) => (
                <li key={`${b.completionId}-${b.exerciseId}`} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold tracking-tight antialiased">
                    {b.exerciseName}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">{formatBestWhen(b.completedAt)}</span>
                  <span className="font-mono text-[13px] font-semibold tabular-nums shrink-0">{formatBestValue(b, weightUnit)}</span>
                  <span className="w-12 text-right font-mono text-xs tabular-nums text-success-text shrink-0">
                    {formatBestDelta(b, weightUnit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

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
              <span className="font-mono text-sm text-muted-foreground font-bold tabular-nums leading-none">
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
        <div className="animate-fade-in-up grid grid-cols-3 gap-2" style={{ animationDelay: '50ms' }}>
          {tiles.map(([value, label]) => (
            <div key={label} className="bg-muted/40 rounded-xl px-3 py-4 text-center">
              <p className="font-mono text-xl font-bold tabular-nums leading-none">{value}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">{label}</p>
            </div>
          ))}
        </div>

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
