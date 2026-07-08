import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandArt, type BrandArtVariant } from './BrandArt';

interface ImageSlotProps {
  /** Mono caption shown at the bottom edge of the slot */
  label: string;
  /** Aspect ratio / sizing classes, e.g. "aspect-[4/5]" */
  className?: string;
  /** Brand-art panel to render until real photography exists */
  variant?: BrandArtVariant;
  /** Real photo — drop a file in /public and pass its path to replace the art */
  src?: string;
  alt?: string;
}

/**
 * Media slot for the landing page. Renders, in order of preference:
 * a real photo (`src`), a generative brand-art panel (`variant`), or
 * a labeled placeholder. Art panels use the dark token scope so the
 * volt/ghost palette matches the hero and CTA sections.
 */
export function ImageSlot({ label, className, variant, src, alt }: ImageSlotProps) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image
          src={src}
          alt={alt ?? label}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent"
          aria-hidden="true"
        />
        <p className="absolute inset-x-0 bottom-0 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 antialiased">
          {label}
        </p>
      </div>
    );
  }

  if (variant) {
    return (
      <div
        className={cn(
          'dark relative overflow-hidden border border-border bg-background text-foreground',
          className
        )}
      >
        <BrandArt variant={variant} />
        <p className="absolute inset-x-0 bottom-0 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          {label}
        </p>
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
