'use client';

import { useLayoutEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Check } from 'lucide-react';
import type { EffortRating } from '@logbook/shared/client-copy';
import { medalRestAngle, WEEK_COMPLETE_COPY, WEEK_MOMENT, weekMinutes, type CompletedWeek } from '@logbook/shared/week-complete';
import { EffortPicker } from '@/components/client/EffortPicker';
import { Confetti } from '@/components/client/Confetti';

/** Where the medal's centre sits down the screen: the flood starts here */
const MEDAL_CENTER_Y = '24%';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The week's medal: an ink disc stamped with the week number. It spins in
 * and lands face up. After that it is the athlete's to play with: drag to
 * spin it, flick to send it round, click or press Enter to flip it. It
 * always settles on a face. The native app's WeekMedal.
 *
 * The transform is written straight to the element, not through React
 * state: a drag updates it on every pointer move.
 */
function WeekMedal({ week }: { week: CompletedWeek }) {
  const size = WEEK_MOMENT.medalSize;
  const medalRef = useRef<HTMLButtonElement>(null);
  // Degrees the medal is resting at, or heading for
  const rot = useRef(0);
  const drag = useRef<{ fromX: number; fromRot: number; lastX: number; lastT: number; velocity: number } | null>(null);

  const apply = (deg: number, transition: string) => {
    const el = medalRef.current;
    if (!el) return;
    rot.current = deg;
    el.style.transition = transition;
    el.style.transform = `rotateY(${deg}deg)`;
  };
  const settle = (angle: number, speed = 0) =>
    apply(medalRestAngle(angle, speed), prefersReducedMotion() ? 'none' : 'transform 600ms var(--ease-out)');

  // The way in: wound back and small, unwinding to face up. A layout effect,
  // so the medal is never painted at rest before it starts.
  useLayoutEffect(() => {
    const el = medalRef.current;
    if (!el || prefersReducedMotion()) return;
    el.style.transition = 'none';
    el.style.transform = `rotateY(${-WEEK_MOMENT.medalTurns * 360}deg) scale(${WEEK_MOMENT.medalFrom})`;
    const id = window.setTimeout(() => {
      el.style.transition = `transform ${WEEK_MOMENT.medalSpinMs}ms var(--ease-out)`;
      el.style.transform = 'rotateY(0deg) scale(1)';
    }, WEEK_MOMENT.medalDelay);
    return () => window.clearTimeout(id);
  }, []);

  /** The angle on screen right now, mid-transition included, so a grab never jumps */
  const currentAngle = (el: HTMLElement): number => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return (Math.atan2(-m.m13, m.m11) * 180) / Math.PI;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = medalRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const from = currentAngle(el);
    apply(from, 'none');
    drag.current = { fromX: e.clientX, fromRot: from, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    apply(d.fromRot + (e.clientX - d.fromX) * WEEK_MOMENT.dragDegPerPx, 'none');
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    // A click flips it; a flick carries on the way it was going
    if (Math.abs(e.clientX - d.fromX) < 4) settle(medalRestAngle(d.fromRot, 0) + 180);
    else settle(rot.current, d.velocity);
  };

  const face = 'absolute inset-0 flex flex-col items-center justify-center [backface-visibility:hidden]';
  return (
    <div className="flex flex-col items-center" style={{ perspective: 900 }}>
      <button
        ref={medalRef}
        type="button"
        aria-label={WEEK_COMPLETE_COPY.medalA11y(week.weekNumber, week.total)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          settle(rot.current);
        }}
        // Keyboard only (detail 0): a pointer click is already handled above
        onClick={(e) => {
          if (e.detail === 0) settle(rot.current + 180);
        }}
        className="relative rounded-full bg-[#0a0a0a] text-brand cursor-grab active:cursor-grabbing select-none touch-pan-y [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-brand"
        style={{ width: size, height: size }}
      >
        {/* The struck rim */}
        <span aria-hidden="true" className="absolute inset-[9px] rounded-full border-[1.5px] border-brand/40" />
        <span aria-hidden="true" className={face}>
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.28em]">{WEEK_COMPLETE_COPY.medalLabel}</span>
          <span className="font-mono text-[68px] font-bold leading-[72px] tabular-nums">
            {WEEK_COMPLETE_COPY.medalNumber(week.weekNumber)}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand/70">
            {WEEK_COMPLETE_COPY.medalTally(week.total)}
          </span>
        </span>
        <span aria-hidden="true" className={`${face} [transform:rotateY(180deg)]`}>
          <Check className="h-[72px] w-[72px]" strokeWidth={2.5} />
          <span className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.28em]">{WEEK_COMPLETE_COPY.medalBack}</span>
        </span>
      </button>
      {/* Its shadow on the floor */}
      <span aria-hidden="true" className="mt-3.5 h-2.5 rounded-full bg-brand-foreground/[0.18]" style={{ width: size * 0.62 }} />
    </div>
  );
}

interface WeekCompleteCelebrationProps {
  week: CompletedWeek;
  /** The workout just finished */
  workoutTitle: string;
  /** Its duration, added to the week's other workouts for the total */
  durationMin: number;
  onRate: (rating: EffortRating) => void;
  onSkip: () => void;
  isSavingRating: boolean;
}

/**
 * The workout-finished screen when that workout closed out the week, the
 * native app's WeekCompleteCelebration. Same job as the everyday one (name
 * what was done, ask how it felt), dressed for the occasion: see
 * @logbook/shared/week-complete for the show and its timings.
 */
export function WeekCompleteCelebration({ week, workoutTitle, durationMin, onRate, onSkip, isSavingRating }: WeekCompleteCelebrationProps) {
  const eyebrow = 'font-mono text-[10px] uppercase tracking-[0.16em] text-brand-foreground/70';
  const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
  return (
    <div className="fixed inset-0 z-50 bg-background text-brand-foreground flex flex-col items-center justify-center overflow-hidden p-6 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Volt spreading from the medal's centre until it covers the screen */}
      <div
        aria-hidden="true"
        className="week-flood absolute inset-0 bg-brand"
        style={
          {
            animationDuration: `${WEEK_MOMENT.floodMs}ms`,
            '--flood-from': `${WEEK_MOMENT.medalSize / 2}px`,
            '--flood-y': MEDAL_CENTER_Y,
          } as CSSProperties
        }
      />

      <div className="relative flex flex-col items-center mb-7">
        <WeekMedal week={week} />
        <div className="mt-5 text-center animate-fade-in-up" style={delay(WEEK_MOMENT.contentDelay)}>
          <p className={`${eyebrow} mb-1.5`}>{WEEK_COMPLETE_COPY.eyebrow(week.weekNumber)}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{workoutTitle}</h1>
        </div>
        {/* One ink tick per workout of the week, popping in left to right */}
        <div aria-hidden="true" className="mt-4 flex flex-wrap justify-center gap-2">
          {Array.from({ length: week.total }, (_, i) => (
            <span
              key={i}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0a] text-brand animate-completion-pop"
              style={delay(WEEK_MOMENT.ticksDelay + i * WEEK_MOMENT.tickStagger)}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex gap-2 sm:gap-3 mb-8 w-full max-w-xs animate-fade-in-up" style={delay(WEEK_MOMENT.contentDelay + 80)}>
        {(
          [
            [`${week.total}/${week.total}`, WEEK_COMPLETE_COPY.workoutsStat],
            [weekMinutes(week, durationMin), WEEK_COMPLETE_COPY.minutesStat],
          ] as const
        ).map(([value, label]) => (
          <div key={label} className="flex-1 rounded-xl bg-brand-foreground/10 px-3 py-5 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums leading-none">{value}</p>
            <p className={`${eyebrow} mt-2`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="relative text-center animate-fade-in-up" style={delay(WEEK_MOMENT.contentDelay + 140)}>
        <p id="week-effort-label" className={`${eyebrow} mb-4`}>
          How did that feel?
        </p>
        <EffortPicker onPick={onRate} disabled={isSavingRating} labelledBy="week-effort-label" />
      </div>

      <button
        type="button"
        onClick={onSkip}
        disabled={isSavingRating}
        className={`${eyebrow} relative hover:text-brand-foreground transition-colors mt-6 min-h-[44px] px-4 rounded-lg touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-brand`}
      >
        Skip for now
      </button>

      <Confetti delay={WEEK_MOMENT.confettiDelay} />
    </div>
  );
}
