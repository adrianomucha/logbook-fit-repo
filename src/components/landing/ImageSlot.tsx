import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageSlotProps {
  /** Mono caption shown at the bottom edge of the slot */
  label: string;
  /**
   * Art direction for the shot this slot is holding room for. Shown only in
   * placeholder mode, so the brief travels with the layout instead of living
   * in a doc nobody opens when it's time to shoot.
   */
  description?: string;
  /** Aspect ratio / sizing classes, e.g. "aspect-[4/5]" */
  className?: string;
  /** Real photo — drop a file in /public and pass its path to replace the placeholder */
  src?: string;
  alt?: string;
  /** object-position for the photo crop, e.g. "center 30%" (default: center) */
  objectPosition?: string;
  /** Hide the mono caption overlay (e.g. when the photo speaks for itself) */
  hideCaption?: boolean;
  /** Priority-load the image (use for the above-the-fold hero) */
  priority?: boolean;
}

/**
 * Media slot for the landing page. Renders a real photo when `src` is
 * provided; otherwise a labeled placeholder that reserves the space —
 * the label describes the shot it's holding room for. The volt slash
 * echoes the logo mark.
 */
export function ImageSlot({
  label,
  description,
  className,
  src,
  alt,
  objectPosition,
  hideCaption,
  priority,
}: ImageSlotProps) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image
          src={src}
          alt={alt ?? label}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          style={objectPosition ? { objectPosition } : undefined}
        />
        {!hideCaption && (
          <>
            <div
              className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent"
              aria-hidden="true"
            />
            <p className="absolute inset-x-0 bottom-0 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 antialiased">
              {label}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-secondary', className)}>
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 pb-14 text-center">
        <ImageIcon
          className="h-8 w-8 shrink-0 text-muted-foreground/40"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        {description && (
          <p className="max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground antialiased">
            {description}
          </p>
        )}
      </div>
      <p className="absolute inset-x-0 bottom-0 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
        {label}
      </p>
    </div>
  );
}
