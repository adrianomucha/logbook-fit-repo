'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

interface WorkoutCelebrationProps {
  workoutName: string;
  exercisesDone: number;
  exercisesTotal: number;
  durationMin: number;
  isSavingRating: boolean;
  onEffortRating: (rating: EffortRating) => void;
  onDismiss: () => void;
}

// One confetti burst, generated after mount (never during SSR/hydration, so
// the random values can't mismatch) and kept in state so re-renders (rating
// selection, saving state) don't reshuffle pieces mid-fall.
type ConfettiPiece = {
  id: number;
  // Back pieces fall behind the content, front pieces fall over it —
  // two planes give the burst depth and let it wash over the screen.
  layer: 'back' | 'front';
  left: number;
  delay: number;
  duration: number;
  width: number;
  height: number;
  drift: number;
  rotate: number;
  round: boolean;
  color: string;
};

function makeConfetti(): ConfettiPiece[] {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  return Array.from({ length: 72 }, (_, i) => {
    // Front plane: bigger, faster pieces over the content (1 in 3);
    // back plane: smaller, slower pieces behind it. The size/speed split
    // reads as parallax.
    const front = i % 3 === 0;
    return {
      id: i,
      layer: front ? ('front' as const) : ('back' as const),
      left: rand(2, 98),
      delay: front ? rand(0, 0.6) : rand(0, 1),
      duration: front ? rand(2.1, 3.1) : rand(2.6, 3.9),
      width: front ? rand(8, 13) : rand(5, 9),
      height: front ? rand(12, 18) : rand(8, 14),
      drift: rand(-110, 110),
      rotate: rand(360, 900) * (Math.random() < 0.5 ? -1 : 1),
      round: Math.random() < 0.3,
      // Volt-dominant with foreground accents; theme vars keep the
      // burst visible in both light and dark mode.
      color:
        i % 4 === 3
          ? 'hsl(var(--foreground) / 0.75)'
          : i % 4 === 2
            ? 'hsl(74 80% 40%)'
            : 'hsl(var(--brand))',
    };
  });
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Counts up to `target` with an ease-out curve. Reduced motion (and re-runs
// with the same target) land on the final value immediately.
function useCountUp(target: number, durationMs = 900, delayMs = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion() || target === 0) {
      setValue(target);
      return;
    }
    let raf: number;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const progress = Math.min(Math.max(t - start - delayMs, 0) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);

  return value;
}

const EFFORT_OPTIONS: { value: EffortRating; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

export function WorkoutCelebration({
  workoutName,
  exercisesDone,
  exercisesTotal,
  durationMin,
  isSavingRating,
  onEffortRating,
  onDismiss,
}: WorkoutCelebrationProps) {
  const [selectedRating, setSelectedRating] = useState<EffortRating | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const allDone = exercisesDone === exercisesTotal;

  useEffect(() => {
    setConfetti(makeConfetti());
  }, []);

  const animatedDone = useCountUp(exercisesDone, 700, 500);
  const animatedMinutes = useCountUp(durationMin, 900, 500);

  const handleRating = (rating: EffortRating) => {
    if (isSavingRating) return;
    setSelectedRating(rating);
    onEffortRating(rating);
  };

  // Decorative, one-shot. Pieces start at opacity-0 so reduced motion
  // (animation: none) leaves nothing frozen on screen.
  const renderConfettiLayer = (layer: ConfettiPiece['layer']) => (
    <div
      aria-hidden="true"
      className={cn(
        'absolute inset-0 pointer-events-none',
        layer === 'front' && 'z-10'
      )}
    >
      {confetti
        .filter((piece) => piece.layer === layer)
        .map((piece) => (
          <span
            key={piece.id}
            className={cn('confetti-piece opacity-0', piece.round && 'rounded-full')}
            style={{
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.round ? piece.width : piece.height,
              backgroundColor: piece.color,
              '--confetti-delay': `${piece.delay}s`,
              '--confetti-duration': `${piece.duration}s`,
              '--confetti-drift': `${piece.drift}px`,
              '--confetti-rotate': `${piece.rotate}deg`,
            } as CSSProperties}
          />
        ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center overflow-hidden p-6 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Confetti behind the content */}
      {renderConfettiLayer('back')}

      {/* Celebration header — volt burst with ring pulses and a drawn check */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Soft volt bloom behind the badge */}
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-full bg-brand/25 blur-2xl"
          />
          {/* Expanding ring pulses — opacity-0 base keeps them invisible
              when reduced motion disables the animation */}
          <div aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-brand opacity-0 animate-celebration-ring" />
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-brand opacity-0 animate-celebration-ring"
            style={{ animationDelay: '0.25s' }}
          />
          <div className="relative w-24 h-24 rounded-full bg-brand flex items-center justify-center animate-bounce-once shadow-[0_0_40px_hsl(var(--brand)/0.45)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-12 h-12 text-brand-foreground"
              aria-hidden="true"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-celebration-check"
              />
            </svg>
          </div>
        </div>
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text mb-2 animate-fade-in-up"
          style={{ animationDelay: '0.25s' }}
        >
          Session complete
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground animate-fade-in-up"
          style={{ animationDelay: '0.35s' }}
        >
          {workoutName}
        </h1>
        <p
          className="text-sm text-muted-foreground mt-2 animate-fade-in-up"
          style={{ animationDelay: '0.45s' }}
        >
          {allDone ? 'Clean sweep — every exercise done.' : 'Banked. Showing up counts.'}
        </p>
      </div>

      {/* Workout summary — mono data voice, numbers count up as they land */}
      <div className="flex gap-2 sm:gap-3 mb-8 sm:mb-10 w-full max-w-xs">
        <div
          className="flex-1 bg-muted/60 rounded-xl px-3 py-5 sm:py-6 text-center border-t-2 border-brand animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <p className="font-mono text-3xl font-bold tabular-nums leading-none">
            {animatedDone}
            <span className="text-muted-foreground/70 text-xl">/{exercisesTotal}</span>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
            Exercises
          </p>
        </div>
        <div
          className="flex-1 bg-muted/60 rounded-xl px-3 py-5 sm:py-6 text-center border-t-2 border-brand animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          <p className="font-mono text-3xl font-bold tabular-nums leading-none">
            {animatedMinutes}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
            Minutes
          </p>
        </div>
      </div>

      {/* Effort rating — the picked button fills volt so the choice lands */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
        <p
          id="celebration-effort-label"
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-4"
        >
          How did that feel?
        </p>
        <div role="group" aria-labelledby="celebration-effort-label" className="flex gap-2 sm:gap-3">
          {EFFORT_OPTIONS.map(({ value, label }) => {
            const isSelected = selectedRating === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleRating(value)}
                disabled={isSavingRating}
                className={cn(
                  'px-5 sm:px-6 py-3.5 sm:py-3 rounded-full font-bold uppercase tracking-wider text-sm',
                  'active:scale-[0.95] transition-[background-color,color,transform,opacity] duration-150',
                  'touch-manipulation min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? 'bg-brand text-brand-foreground shadow-[0_0_24px_hsl(var(--brand)/0.4)]'
                    : 'bg-foreground text-background hover:bg-foreground/90',
                  isSavingRating && !isSelected && 'opacity-40',
                  isSavingRating && isSelected && 'opacity-100'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* A real control, not a whole-screen click target: the pointer-only
          "tap anywhere" left keyboard users with no way past this screen
          except submitting a rating. */}
      <button
        type="button"
        onClick={onDismiss}
        disabled={isSavingRating}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mt-8 min-h-[44px] px-4 rounded-lg touch-manipulation animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ animationDelay: '0.8s' }}
      >
        Skip for now
      </button>

      {/* Confetti over the content — pointer-events-none keeps every
          control clickable while pieces fall across them */}
      {renderConfettiLayer('front')}
    </div>
  );
}
