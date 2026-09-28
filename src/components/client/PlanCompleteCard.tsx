import type { WorkoutCompletion, WorkoutPlan } from '@/types';
import { Button } from '@/components/ui/button';
import { Flag, MessageCircle } from 'lucide-react';

interface PlanCompleteCardProps {
  plan: WorkoutPlan;
  /** Every completion on the client's account — filtered to this plan here */
  completions: WorkoutCompletion[];
  coachName?: string;
  onMessageCoach: () => void;
  onViewProgress: () => void;
}

interface Session {
  weekNumber: number;
  durationSec?: number;
  done: boolean;
}

function listWeeks(nums: number[]): string {
  if (nums.length === 1) return `week ${nums[0]}`;
  return `weeks ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;
}

/** One plain sentence about what was missed */
function describeMisses(missed: Session[]): string {
  if (missed.length === 0) return 'Didn’t miss a single session.';
  const n = missed.length;
  const noun = n === 1 ? 'session' : 'sessions';

  const perWeek = new Map<number, number>();
  for (const s of missed) perWeek.set(s.weekNumber, (perWeek.get(s.weekNumber) ?? 0) + 1);
  const weekNums = [...perWeek.keys()].sort((a, b) => a - b);

  if (weekNums.length === 1) {
    return n === 1
      ? `Missed 1 session, in week ${weekNums[0]}.`
      : `Missed ${n} sessions, ${n === 2 ? 'both' : 'all'} in week ${weekNums[0]}.`;
  }
  // One week holding most of the misses is the story worth telling
  const [worstWeek, worstCount] = [...perWeek.entries()].sort((a, b) => b[1] - a[1])[0];
  if (worstCount > 1 && worstCount * 2 > n) {
    return `Missed ${n} ${noun}, ${worstCount} of them in week ${worstWeek}.`;
  }
  if (weekNums.length <= 3) return `Missed ${n} ${noun} across ${listWeeks(weekNums)}.`;
  return `Missed ${n} ${noun} across ${weekNums.length} weeks.`;
}

function formatTrainingTime(totalSec: number): [string, string] {
  const minutes = Math.round(totalSec / 60);
  if (minutes < 60) return [String(minutes), 'min'];
  return [String(Math.round((minutes / 60) * 10) / 10), 'h'];
}

/**
 * Shown in place of the Today view once the plan has run its course. Same
 * anatomy as SessionCompleteCard (mono eyebrow, big title, volt mark, stat
 * band) scaled up to the whole block.
 *
 * No chart on purpose: a finished block is mostly "you did it", and every
 * per-week or per-session chart tried here read as a wall of volt. The
 * completion rate leads, one meter shows it, and a sentence names the
 * misses — which is the only detail a chart was adding.
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
  // client's earlier blocks would inflate the numbers here
  const byDay = new Map(
    completions
      .filter((c) => c.planId === plan.id && c.status === 'COMPLETED')
      .map((c) => [c.dayId, c])
  );

  const sessions = plan.weeks.flatMap((week) =>
    week.days
      .filter((d) => d.exercises.length > 0)
      .map<Session>((d) => {
        const completion = byDay.get(d.id);
        return {
          weekNumber: week.weekNumber,
          durationSec: completion?.durationSec,
          done: !!completion,
        };
      })
  );

  const planned = sessions.length;
  const completed = sessions.filter((s) => s.done).length;
  const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;

  const timed = sessions.filter((s) => s.done && s.durationSec);
  const trainedSec = timed.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);

  const stats: [string | number, string][] = [];
  if (trainedSec >= 60) {
    const [value, unit] = formatTrainingTime(trainedSec);
    stats.push([value, `${unit} trained`]);
    stats.push([Math.round(trainedSec / timed.length / 60), 'min avg session']);
  }

  const missNote = describeMisses(sessions.filter((s) => !s.done));

  return (
    <section
      aria-label="Plan complete"
      className="rounded-2xl bg-card border border-border/70 p-5 sm:p-6 animate-enter"
    >
      {/* Header — eyebrow + plan name, volt flag as the celebration mark */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            Plan complete · {weekCount} {weekCount === 1 ? 'week' : 'weeks'}
          </p>
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-[1.15] mt-2.5 text-balance antialiased">
            {plan.name}
          </h1>
        </div>
        <div
          className="w-11 h-11 rounded-full bg-brand flex items-center justify-center shrink-0 animate-[completionPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-hidden="true"
        >
          <Flag className="w-5 h-5 text-brand-foreground stroke-[2.75]" />
        </div>
      </div>

      {planned > 0 && (
        <>
          {/* Headline — the one number the block comes down to */}
          <div className="mt-6 flex items-baseline gap-3">
            <p className="text-[44px] font-bold tracking-tight leading-none antialiased">
              {pct}%
            </p>
            <p className="text-sm text-muted-foreground antialiased">
              {completed} of {planned} workouts done
            </p>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-brand origin-left animate-[meterFill_0.7s_cubic-bezier(0.22,1,0.36,1)_0.15s_both]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3 antialiased">{missNote}</p>
        </>
      )}

      {/* Stat band — numbers carry the weight, units stay quiet */}
      {stats.length > 0 && (
        <p className="font-mono text-[13px] tabular-nums mt-5 pt-4 border-t border-border/50">
          {stats.map(([value, unit], i) => (
            <span key={unit} className="whitespace-nowrap">
              {i > 0 && <span className="text-muted-foreground/40">&ensp;·&ensp;</span>}
              <span className="font-semibold text-foreground">{value}</span>
              <span className="text-muted-foreground"> {unit}</span>
            </span>
          ))}
        </p>
      )}

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
