import type { HealthLevel } from '@/lib/health';
import { cn } from '@/lib/utils';

const LEVEL_CLASS: Record<HealthLevel, string> = {
  ok: 'bg-brand',
  warn: 'bg-amber-500',
  down: 'bg-destructive',
};

const LEVEL_LABEL: Record<HealthLevel, string> = {
  ok: 'Healthy',
  warn: 'Needs attention',
  down: 'Down',
};

/** Status indicator shared by the overview badge and the health page rows. */
export function HealthDot({ level, className }: { level: HealthLevel; className?: string }) {
  return (
    <span
      role="img"
      aria-label={LEVEL_LABEL[level]}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', LEVEL_CLASS[level], className)}
    />
  );
}

export function healthLabel(level: HealthLevel): string {
  return LEVEL_LABEL[level];
}
