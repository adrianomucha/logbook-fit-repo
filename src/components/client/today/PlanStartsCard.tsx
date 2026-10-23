import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkoutViewToggle } from '@/components/client/WorkoutViewToggle';
import { PLAN_STARTS_COPY } from '@logbook/shared/plan-start';
import { StatusHeader } from './StatusHeader';

interface PlanStartsCardProps {
  clientName: string;
  /** The plan's first day, "2026-10-26" */
  startsOn: string;
  coachName?: string;
  /** Workouts in week 1 */
  workoutCount: number;
  onPreviewWeek: () => void;
}

/**
 * Today before a plan the coach set to start next Monday: when it begins,
 * and a way to look through week 1 in the meantime.
 */
export function PlanStartsCard({ clientName, startsOn, coachName, workoutCount, onPreviewWeek }: PlanStartsCardProps) {
  return (
    <div className="space-y-6">
      {/* Same date and greeting as the Today tab */}
      <StatusHeader showNewPlan clientName={clientName} />
      <WorkoutViewToggle value="today" onChange={(m) => m === 'weekly' && onPreviewWeek()} />
      <section
        aria-label="Plan starts soon"
        className="rounded-2xl border border-border/70 bg-card px-6 py-10 text-center"
      >
        <CalendarDays className="mx-auto mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {PLAN_STARTS_COPY.eyebrow}
        </p>
        <h2 className="mb-1.5 text-lg font-bold tracking-tight antialiased">{PLAN_STARTS_COPY.title(startsOn)}</h2>
        <p className="mb-5 text-pretty text-sm text-muted-foreground antialiased">
          {PLAN_STARTS_COPY.body(coachName, workoutCount)}
        </p>
        <Button onClick={onPreviewWeek} className="transition-transform duration-150 active:scale-[0.96]">
          {PLAN_STARTS_COPY.action}
        </Button>
      </section>
    </div>
  );
}
