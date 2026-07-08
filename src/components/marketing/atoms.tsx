import { cn } from '@/lib/utils';

/** Mono uppercase eyebrow — the brand's "data voice" label. */
export function Eyebrow({
  children,
  accent = false,
  dot = false,
  className,
}: {
  children: React.ReactNode;
  accent?: boolean;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]',
        accent ? 'text-brand' : 'text-muted-foreground',
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', accent ? 'bg-brand' : 'bg-muted-foreground/60')}
        />
      )}
      {children}
    </span>
  );
}

export type StatusKey = 'at-risk' | 'due' | 'ready' | 'on-track';

const STATUS: Record<StatusKey, { dot: string; text: string; label: string }> = {
  'at-risk': { dot: 'bg-red-500', text: 'text-red-400', label: 'AT RISK' },
  due: { dot: 'bg-amber-400', text: 'text-amber-300', label: 'CHECK-IN DUE' },
  ready: { dot: 'bg-sky-400', text: 'text-sky-300', label: 'CHECK-IN READY' },
  'on-track': { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'ON TRACK' },
};

/** Status = never color alone: a colored dot always paired with a text label. */
export function StatusPill({
  status,
  label,
  className,
}: {
  status: StatusKey;
  label?: string;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', s.dot)} />
      <span className={cn('font-mono text-[10px] uppercase tracking-[0.14em]', s.text)}>
        {label ?? s.label}
      </span>
    </span>
  );
}

const AVATAR_TINTS = [
  'bg-sky-500/20 text-sky-200',
  'bg-violet-500/20 text-violet-200',
  'bg-amber-500/20 text-amber-200',
  'bg-emerald-500/20 text-emerald-200',
  'bg-rose-500/20 text-rose-200',
  'bg-teal-500/20 text-teal-200',
];

export function Avatar({
  initials,
  tint = 0,
  size = 32,
  className,
}: {
  initials: string;
  tint?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium tracking-wider',
        AVATAR_TINTS[tint % AVATAR_TINTS.length],
        className
      )}
    >
      {initials}
    </span>
  );
}

/** Small mono chip / tag. */
export function MonoTag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}
