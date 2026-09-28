import type { CSSProperties } from 'react';
import type { WorkoutCompletion, WorkoutPlan } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Flag, MessageCircle } from 'lucide-react';

interface PlanCompleteCardProps {
  plan: WorkoutPlan;
  /** Every completion on the client's account — filtered to this plan here */
  completions: WorkoutCompletion[];
  coachName?: string;
  onMessageCoach: () => void;
  onViewProgress: () => void;
}

function formatTrainingTime(totalSec: number): string {
  const minutes = Math.round(totalSec / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} h`;
}

/**
 * Shown in place of the Today view once the plan has run its course. Same
 * anatomy as SessionCompleteCard (mono eyebrow, big title, volt mark, stat
 * band) scaled up to the whole block: one bar per week so the client sees
 * the shape of what they just did, then the one next step, their coach.
 */
export function PlanCompleteCard({
  plan,
  completions,
  coachName,
  onMessageCoach,
  onViewProgress,
}: PlanCompleteCardProps) {
  const coachFirst = coachName?.split(' ')[0];
  const weekCount = plan.durationWeeks || plan.weeks.length;

  // Scoped to this plan: the progress stats are all-time, so a returning
  // client's earlier blocks would inflate "workouts logged" here
  const done = completions.filter(
    (c) => c.planId === plan.id && c.status === 'COMPLETED'
  );
  const doneDayIds = new Set(done.map((c) => c.dayId));

  const weeks = [...plan.weeks]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((week) => {
      const trainingDays = week.days.filter((d) => d.exercises.length > 0);
      const completed = trainingDays.filter((d) => doneDayIds.has(d.id)).length;
      return {
        id: week.id,
        weekNumber: week.weekNumber,
        planned: trainingDays.length,
        completed,
        ratio: trainingDays.length > 0 ? completed / trainingDays.length : 0,
      };
    });

  const planned = weeks.reduce((sum, w) => sum + w.planned, 0);
  const completed = weeks.reduce((sum, w) => sum + w.completed, 0);
  const trainedSec = done.reduce((sum, c) => sum + (c.durationSec ?? 0), 0);

  const stats: [string | number, string][] = [];
  if (planned > 0) {
    stats.push([
      completed < planned ? `${completed}/${planned}` : planned,
      planned === 1 ? 'workout' : 'workouts',
    ]);
  }
  if (trainedSec >= 60) {
    const [value, unit] = formatTrainingTime(trainedSec).split(' ');
    stats.push([value, `${unit} trained`]);
  }
  stats.push([weekCount, weekCount === 1 ? 'week' : 'weeks']);

  // Long blocks get too narrow for a label under every bar
  const labelEvery = weeks.length > 12 ? 4 : 1;

  return (
    <section
      aria-label="Plan complete"
      className="rounded-2xl bg-card border border-border/70 p-5 sm:p-6 animate-enter"
    >
      {/* Header — eyebrow + plan name, volt flag as the celebration mark */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            Plan complete
          </p>
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-[1.15] mt-2.5 text-balance antialiased">
            {plan.name}
          </h1>
          <p className="text-[15px] text-muted-foreground mt-1.5 antialiased">
            Every week of the block, behind you.
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-full bg-brand flex items-center justify-center shrink-0 animate-[completionPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-hidden="true"
        >
          <Flag className="w-5 h-5 text-brand-foreground stroke-[2.75]" />
        </div>
      </div>

      {/* The block at a glance — one bar per week, filled by workouts done */}
      {weeks.length > 0 && planned > 0 && (
        <div className="mt-5">
          <div
            className="flex items-end gap-1 sm:gap-1.5 h-16"
            role="img"
            aria-label={`${completed} of ${planned} workouts completed across ${weeks.length} weeks`}
          >
            {weeks.map((w, i) => (
              <div
                key={w.id}
                className="relative flex-1 h-full rounded-[5px] bg-muted overflow-hidden"
              >
                {w.ratio > 0 && (
                  <div
                    className={cn(
                      'absolute inset-x-0 bottom-0 rounded-[5px] origin-bottom',
                      'animate-[weekBarGrow_0.5s_cubic-bezier(0.22,1,0.36,1)_both]',
                      w.ratio >= 1 ? 'bg-brand' : 'bg-brand/60'
                    )}
                    style={
                      {
                        height: `${Math.max(w.ratio * 100, 8)}%`,
                        animationDelay: `${120 + i * 40}ms`,
                      } as CSSProperties
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1 sm:gap-1.5 mt-1.5" aria-hidden="true">
            {weeks.map((w, i) => (
              <span
                key={w.id}
                className="flex-1 text-center font-mono text-[10px] tabular-nums text-muted-foreground"
              >
                {i % labelEvery === 0 || i === weeks.length - 1 ? `W${w.weekNumber}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stat band — numbers carry the weight, units stay quiet */}
      <p className="font-mono text-[13px] tabular-nums mt-4 pt-4 border-t border-border/50">
        {stats.map(([value, unit], i) => (
          <span key={unit}>
            {i > 0 && <span className="text-muted-foreground/40">&ensp;·&ensp;</span>}
            <span className="font-semibold text-foreground">{value}</span>
            <span className="text-muted-foreground"> {unit}</span>
          </span>
        ))}
      </p>

      {/* What's next — the coach builds the next block */}
      <div className="mt-5 pt-5 border-t border-border/50">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
          What&apos;s next
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed antialiased">
          {coachFirst ?? 'Your coach'} will line up your next block. Tell them how
          this one went and what you want to chase next.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            onClick={onMessageCoach}
            className="flex-1 h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150"
          >
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            Message {coachFirst ?? 'coach'}
          </Button>
          <Button
            variant="outline"
            onClick={onViewProgress}
            className="h-11 sm:px-5 text-sm font-semibold active:scale-[0.97] transition-transform duration-150"
          >
            See your progress
          </Button>
        </div>
      </div>
    </section>
  );
}
