/**
 * Generative brand-art panels for the landing page media slots.
 * All pieces derive from the logo mark's language: tally strokes,
 * the 28° volt slash, and the product's data voice (grids, set rows,
 * progress bars). They render on the dark token scope, so colors are
 * theme variables — no hardcoded hex.
 *
 * These stand in until real photography is shot; each slot keeps a
 * `src` escape hatch (see ImageSlot).
 */

export type BrandArtVariant = 'hero' | 'loop' | 'coach' | 'client';

const VOLT = 'hsl(var(--brand))';
const GHOST = 'hsl(var(--secondary))';
const LINE = 'hsl(var(--muted-foreground))';

function Dots({ id }: { id: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill={LINE} opacity="0.22" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </>
  );
}

function HeroArt() {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="hero-dots" />
      {/* Ghost tally strokes — the rep count in progress */}
      <g stroke={GHOST} strokeWidth="44" strokeLinecap="round">
        <path d="M330 120v280" />
        <path d="M490 120v280" />
        <path d="M650 120v280" />
        <path d="M810 120v280" />
      </g>
      {/* The volt slash completes the count */}
      <path
        d="M230 430 910 90"
        stroke={VOLT}
        strokeWidth="30"
        strokeLinecap="round"
      />
      <path
        d="M230 430 910 90"
        stroke={VOLT}
        strokeWidth="72"
        strokeLinecap="round"
        opacity="0.12"
      />
    </svg>
  );
}

function LoopArt() {
  // One arc segment (65° sweep on r=230 around 300,375), repeated with
  // rotational symmetry — four steps, the volt one carries the arrow.
  const ARC = 'M339.9 148.5 A230 230 0 0 1 522.2 315.5';
  return (
    <svg
      viewBox="0 0 600 750"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="loop-dots" />
      <defs>
        <marker
          id="loop-arrow"
          viewBox="0 0 10 10"
          refX="4"
          refY="5"
          markerWidth="3.2"
          markerHeight="3.2"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill={VOLT} />
        </marker>
      </defs>
      <g fill="none" strokeWidth="26" strokeLinecap="round">
        {[90, 180, 270].map((angle) => (
          <path
            key={angle}
            d={ARC}
            stroke={GHOST}
            transform={`rotate(${angle} 300 375)`}
          />
        ))}
        <path d={ARC} stroke={VOLT} markerEnd="url(#loop-arrow)" />
      </g>
      <circle cx="300" cy="375" r="30" fill={VOLT} />
    </svg>
  );
}

function CoachArt() {
  // Week/day plan grid; one training day lit volt.
  const cells: JSX.Element[] = [];
  const filled = new Set([1, 3, 8, 10, 12, 15, 17, 22, 24, 26]);
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 4; col++) {
      const i = row * 4 + col;
      const isVolt = i === 13;
      cells.push(
        <rect
          key={i}
          x={88 + col * 115}
          y={95 + row * 85}
          width="90"
          height="60"
          rx="14"
          fill={isVolt ? VOLT : filled.has(i) ? GHOST : 'none'}
          stroke={isVolt ? 'none' : GHOST}
          strokeWidth="3"
        />
      );
    }
  }
  return (
    <svg
      viewBox="0 0 600 750"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="coach-dots" />
      {cells}
    </svg>
  );
}

function ClientArt() {
  // Set rows: three slots each; completed sets carry the volt slash.
  const rows: JSX.Element[] = [];
  const done: Record<number, number> = { 0: 3, 1: 3, 2: 2, 3: 0, 4: 0 };
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 85 + col * 155;
      const y = 110 + row * 115;
      const isDone = col < done[row];
      rows.push(
        <g key={`${row}-${col}`}>
          <rect
            x={x}
            y={y}
            width="125"
            height="80"
            rx="16"
            fill={isDone ? GHOST : 'none'}
            stroke={GHOST}
            strokeWidth="3"
          />
          {isDone && (
            <path
              d={`M${x + 30} ${y + 55} L${x + 95} ${y + 25}`}
              stroke={VOLT}
              strokeWidth="12"
              strokeLinecap="round"
            />
          )}
        </g>
      );
    }
  }
  return (
    <svg
      viewBox="0 0 600 750"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="client-dots" />
      {rows}
    </svg>
  );
}

const ART: Record<BrandArtVariant, () => JSX.Element> = {
  hero: HeroArt,
  loop: LoopArt,
  coach: CoachArt,
  client: ClientArt,
};

export function BrandArt({ variant }: { variant: BrandArtVariant }) {
  const Art = ART[variant];
  return <Art />;
}
