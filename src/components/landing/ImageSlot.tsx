import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageSlotProps {
  /** Mono caption describing the photo that belongs here */
  label: string;
  /** Aspect ratio / sizing classes, e.g. "aspect-[4/5]" */
  className?: string;
}

/**
 * Reserved space for real photography. Swap each instance for a
 * next/image once art direction is locked — the label describes the
 * shot it's holding room for. The volt slash echoes the logo mark.
 */
export function ImageSlot({ label, className }: ImageSlotProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-secondary',
        className
      )}
    >
      {/* Faint diagonal grain so the block reads as intentional, not broken */}
      <div
        className="absolute inset-0 bg-[repeating-linear-gradient(-60deg,transparent,transparent_46px,hsl(var(--border)/0.55)_46px,hsl(var(--border)/0.55)_47px)]"
        aria-hidden="true"
      />
      {/* Volt slash — same angle as the logo mark */}
      <div
        className="absolute -top-[20%] right-[12%] h-[140%] w-2.5 rotate-[28deg] rounded-full bg-brand"
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon
          className="h-8 w-8 text-muted-foreground/40"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <p className="absolute inset-x-0 bottom-0 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
        {label}
      </p>
    </div>
  );
}
