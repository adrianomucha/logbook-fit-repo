'use client';

import { useEffect, useRef } from 'react';
import {
  ART_EASES,
  ART_STROKE,
  ART_VIEWBOX,
  artViewBox,
  framedOrigin,
  poseOf,
  type ArtKeyframe,
  type ArtTone,
} from '@logbook/shared/iso-art';
import { STATE_ART, type StateArtId } from '@logbook/shared/state-art';
import { cn } from '@/lib/utils';

/* Literal class names so Tailwind keeps them. Paints follow the theme, so
   the art inverts cleanly in dark mode; the accent is volt, or amber on
   error scenes. */
const FILL: Record<ArtTone, string> = {
  ink: 'fill-foreground',
  paper: 'fill-card',
  shade: 'fill-border',
  accent: '',
  none: 'fill-none',
};
const STROKE: Record<ArtTone, string> = {
  ink: 'stroke-foreground',
  paper: 'stroke-card',
  shade: 'stroke-border',
  accent: '',
  none: 'stroke-none',
};
const ACCENT = {
  brand: { fill: 'fill-brand', stroke: 'stroke-brand' },
  warning: { fill: 'fill-warning', stroke: 'stroke-warning' },
} as const;

const SIZES = { xs: 80, sm: 112, md: 160, lg: 208 } as const;

/** WAAPI eases the segment that starts at a keyframe; ours ease into one. */
function toWebKeyframes(motion: ArtKeyframe[]): Keyframe[] {
  return motion.map((k, i) => {
    const p = poseOf(k);
    const next = motion[i + 1];
    return {
      offset: k.at,
      opacity: p.opacity,
      transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) scale(${p.scale})`,
      easing: `cubic-bezier(${ART_EASES[next?.ease ?? 'inOut'].join(',')})`,
    };
  });
}

/**
 * One of the shared isometric state illustrations, looping its motion.
 * Decorative: the heading beside it carries the meaning. Renders its rest
 * pose on the server and under reduced motion.
 */
export function StateArt({
  art,
  size = 'md',
  className,
}: {
  art: StateArtId;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const def = STATE_ART[art];
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || typeof svg.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const running: Animation[] = [];
    for (const layer of def.layers) {
      if (!layer.motion) continue;
      const g = svg.querySelector<SVGGElement>(`[data-layer="${layer.id}"]`);
      if (!g) continue;
      running.push(g.animate(toWebKeyframes(layer.motion), { duration: def.duration, iterations: Infinity }));
    }
    return () => running.forEach((a) => a.cancel());
  }, [def]);

  const width = SIZES[size];
  const accent = ACCENT[def.accent];

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      width={width}
      height={(width * ART_VIEWBOX.height) / ART_VIEWBOX.width}
      viewBox={artViewBox(def)}
      className={cn('shrink-0 select-none overflow-visible', className)}
    >
      {def.layers.map((layer) => {
        const [ox, oy] = framedOrigin(def, layer);
        return (
          <g
            key={layer.id}
            data-layer={layer.id}
            style={{ transformBox: 'view-box', transformOrigin: `${ox}px ${oy}px` }}
          >
            {layer.shapes.map((s, i) => (
              <path
                key={i}
                d={s.d}
                strokeWidth={s.strokeWidth ?? ART_STROKE}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '2.5 2' : undefined}
                className={cn(
                  s.fill === 'accent' ? accent.fill : FILL[s.fill],
                  s.stroke === 'accent' ? accent.stroke : STROKE[s.stroke],
                )}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
