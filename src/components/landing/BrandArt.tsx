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

export type BrandArtVariant =
  | 'hero'
  | 'loop'
  | 'coach'
  | 'client'
  | 'log'
  | 'checkin'
  | 'progress';

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

function LogArt() {
  // The logo mark blown up past the frame — tally + volt slash.
  return (
    <svg
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="log-dots" />
      <g stroke={GHOST} strokeWidth="52" strokeLinecap="round">
        <path d="M155 200v400" />
        <path d="M300 200v400" />
        <path d="M445 200v400" />
      </g>
      <path
        d="M60 560 540 240"
        stroke={VOLT}
        strokeWidth="56"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckinArt() {
  // Speech bubble with an effort scale inside.
  return (
    <svg
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="checkin-dots" />
      <path
        d="M120 230 h360 a40 40 0 0 1 40 40 v220 a40 40 0 0 1 -40 40 H300 l-90 90 v-90 h-90 a40 40 0 0 1 -40 -40 V270 a40 40 0 0 1 40 -40 Z"
        fill="none"
        stroke={GHOST}
        strokeWidth="14"
        strokeLinejoin="round"
      />
      <g strokeWidth="18" strokeLinecap="round">
        <path d="M185 330 h230" stroke={GHOST} />
        <path d="M185 390 h130" stroke={GHOST} />
        <path d="M185 450 h180" stroke={VOLT} />
      </g>
      <circle cx="470" cy="450" r="22" fill={VOLT} />
    </svg>
  );
}

function ProgressArt() {
  const heights = [130, 200, 170, 260, 310, 400];
  return (
    <svg
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <Dots id="progress-dots" />
      {heights.map((h, i) => (
        <rect
          key={i}
          x={80 + i * 78}
          y={620 - h}
          width="52"
          height={h}
          rx="16"
          fill={i === heights.length - 1 ? VOLT : GHOST}
        />
      ))}
    </svg>
  );
}

const ART: Record<BrandArtVariant, () => JSX.Element> = {
  hero: HeroArt,
  loop: LoopArt,
  coach: CoachArt,
  client: ClientArt,
  log: LogArt,
  checkin: CheckinArt,
  progress: ProgressArt,
};

export function BrandArt({ variant }: { variant: BrandArtVariant }) {
  const Art = ART[variant];
  return <Art />;
}
