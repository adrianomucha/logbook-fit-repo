import { cn } from '@/lib/utils';

interface LogoMarkProps {
  /** Rendered size in px (square) */
  size?: number;
  className?: string;
}

/**
 * Brand mark — a rep tally. Three strokes and the volt slash that
 * completes the count: the act of logging a set, reduced to a glyph.
 * Tile and strokes follow the theme (dark tile on light, light tile
 * on dark); the slash is always volt.
 */
export function LogoMark({ size = 24, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect width="64" height="64" rx="14.5" className="fill-foreground" />
      <path
        d="M21 20v24M32 20v24M43 20v24"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-background"
      />
      <path
        d="M14.5 41.5 49.5 22.5"
        strokeWidth="5.5"
        strokeLinecap="round"
        className="stroke-brand"
      />
    </svg>
  );
}

interface LogoProps {
  /** Mark size in px */
  markSize?: number;
  className?: string;
}

/** Horizontal lockup — mark plus the mono wordmark. */
export function Logo({ markSize = 20, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={markSize} />
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-foreground">
          Logbook
        </span>
        <span className="font-mono text-[10px] sm:text-[11px] font-normal uppercase tracking-[0.15em] text-muted-foreground/60">
          Fitness
        </span>
      </span>
    </span>
  );
}
