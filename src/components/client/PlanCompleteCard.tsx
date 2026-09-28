'use client';

import { useState } from 'react';
import type { WorkoutCompletion, WorkoutPlan } from '@/types';
import { parseSessionName } from '@/lib/parse-session-name';
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

interface Session {
  id: string;
  weekNumber: number;
  title: string;
  durationSec?: number;
  done: boolean;
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
 * The block is drawn as one cell per planned workout — weeks are columns,
 * sessions stack in plan order — rather than a bar per week. Sessions are
 * discrete: a 6-of-7 week as a bar is a sliver shorter than a full one and
 * hides which day was missed; as cells it's six volt squares and one gray.
 */
export function PlanCompleteCard({
  plan,
  completions,
  coachName,
  onMessageCoach,
  onViewProgress,
}: PlanCompleteCardProps) {
  const [active, setActive] = useState<Session | null>(null);
  const coachFirst = coachName?.split(' ')[0];
  const weekCount = plan.durationWeeks || plan.weeks.length;

  // Scoped to this plan: the progress stats are all-time, so a returning
  // client's earlier blocks would inflate the numbers here
  const byDay = new Map(
    completions
      .filter((c) => c.planId === plan.id && c.status === 'COMPLETED')
      .map((c) => [c.dayId, c])
  );

  const sortedWeeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const weeks = sortedWeeks.map((week) =>
    [...week.days]
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .filter((d) => d.exercises.length > 0)
      .map<Session>((d) => {
        const completion = byDay.get(d.id);
        return {
          id: d.id,
          weekNumber: week.weekNumber,
          title: parseSessionName(d.name).title,
          durationSec: completion?.durationSec,
          done: !!completion,
        };
      })
  );

  const sessions = weeks.flat();
  const planned = sessions.length;
  const completed = sessions.filter((s) => s.done).length;
  const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
  const maxPerWeek = Math.max(0, ...weeks.map((w) => w.length));

  const timed = sessions.filter((s) => s.done && s.durationSec);
  const trainedSec = timed.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);

  const stats: [string | number, string][] = [];
  if (trainedSec >= 60) {
    const [value, unit] = formatTrainingTime(trainedSec);
    stats.push([value, `${unit} trained`]);
    stats.push([Math.round(trainedSec / timed.length / 60), 'min avg session']);
  }

  const missed = sessions.filter((s) => !s.done);
  const gridLabel =
    `${completed} of ${planned} workouts done across ${weeks.length} weeks.` +
    (missed.length > 0
      ? ` Missed: ${missed.map((s) => `week ${s.weekNumber} ${s.title}`).join(', ')}.`
      : '');

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

      {planned > 0 && (
        <div className="mt-6 flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          {/* Headline — the one number the block comes down to */}
          <div className="shrink-0">
            <p className="text-[44px] font-bold tracking-tight leading-none antialiased">
              {pct}%
            </p>
            <p className="text-sm text-muted-foreground mt-1.5 antialiased">
              {completed} of {planned} workouts done
            </p>
          </div>

          {/* The block, one cell per planned workout */}
          <figure className="min-w-0 max-w-full w-max m-0">
            <div>
              <div
                role="img"
                aria-label={gridLabel}
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 18px))`,
                  gridTemplateRows: `repeat(${maxPerWeek}, auto)`,
                }}
                onPointerLeave={() => setActive(null)}
              >
                {weeks.map((week, col) =>
                  week.map((s, row) => (
                    <div
                      key={s.id}
                      onPointerEnter={() => setActive(s)}
                      onClick={() => setActive(s)}
                      className={cn(
                        'aspect-square rounded-[4px] animate-[completionPop_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]',
                        s.done ? 'bg-brand' : 'bg-muted ring-1 ring-inset ring-border',
                        active?.id === s.id && 'ring-2 ring-inset ring-foreground'
                      )}
                      style={{
                        gridColumn: col + 1,
                        gridRow: row + 1,
                        animationDelay: `${150 + col * 45}ms`,
                      }}
                    />
                  ))
                )}
              </div>
              <div
                className="flex justify-between mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground"
                aria-hidden="true"
              >
                <span>W{sortedWeeks[0].weekNumber}</span>
                {sortedWeeks.length > 1 && <span>W{sortedWeeks[sortedWeeks.length - 1].weekNumber}</span>}
              </div>
            </div>

            {/* Readout — the hovered/tapped session, else the key. Held to
                the grid's width (w-0 min-w-full) so a long session name wraps
                instead of widening the figure and shifting the grid on hover */}
            <figcaption
              className="w-0 min-w-full h-7 mt-2 font-mono text-[10px] leading-[14px] uppercase tracking-[0.12em] text-muted-foreground line-clamp-2"
              aria-live="polite"
            >
              {active ? (
                <>
                  <span className="text-foreground">Wk {active.weekNumber}</span>
                  {' · '}
                  {active.title}
                  {' · '}
                  {active.done
                    ? active.durationSec
                      ? `${Math.max(1, Math.round(active.durationSec / 60))} min`
                      : 'done'
                    : 'missed'}
                </>
              ) : (
                <span className="flex items-center gap-3" aria-hidden="true">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-[2px] bg-brand" />
                    Done
                  </span>
                  {missed.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-[2px] bg-muted ring-1 ring-inset ring-border" />
                      Missed
                    </span>
                  )}
                </span>
              )}
            </figcaption>
          </figure>

        </div>
      )}

      {/* Stat band — numbers carry the weight, units stay quiet */}
      {stats.length > 0 && (
        <p className="font-mono text-[13px] tabular-nums mt-4 pt-4 border-t border-border/50">
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
