import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutPlan } from '@/types';
import { WEEK_STEP_COPY, type WeekStep } from '@logbook/shared/workout-week-helpers';

interface WeekHeaderProps {
  plan: WorkoutPlan;
  /** Which week is on screen, and where the client can step from here */
  step: WeekStep;
  onStep: (weekNumber: number) => void;
}

const arrow =
  'flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted active:scale-[0.96] disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring tap-target';

export function WeekHeader({ plan, step, onStep }: WeekHeaderProps) {
  const totalWeeks = plan.durationWeeks || plan.weeks.length;

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1 tabular-nums" aria-live="polite">
          Week {step.viewed} of {totalWeeks}
          {step.isEarlier && <span className="text-foreground"> · {WEEK_STEP_COPY.earlier}</span>}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {plan.name}
        </h2>
      </div>

      {/* Only once there is somewhere to step to: week 1 has no earlier week */}
      {(step.canGoBack || step.canGoForward) && (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className={arrow}
            disabled={!step.canGoBack}
            onClick={() => onStep(step.viewed - 1)}
            aria-label={WEEK_STEP_COPY.previous}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={arrow}
            disabled={!step.canGoForward}
            onClick={() => onStep(step.viewed + 1)}
            aria-label={WEEK_STEP_COPY.next}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
