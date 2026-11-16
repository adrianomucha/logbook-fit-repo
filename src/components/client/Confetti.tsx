'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CONFETTI, confettiPieces } from '@logbook/shared/week-complete';

/**
 * A burst of ink and white confetti falling once over the volt screen, the
 * native app's Confetti. For the week-complete moment only. It sits above
 * the content but takes no clicks, removes itself when the last piece has
 * left, and is hidden under reduced motion (see .confetti-piece in
 * globals.css).
 */
export function Confetti({ delay = 0 }: { delay?: number }) {
  const pieces = useMemo(() => confettiPieces(), []);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), delay + CONFETTI.totalMs);
    return () => clearTimeout(id);
  }, [delay]);
  if (done) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className={`confetti-piece ${piece.color === 'ink' ? 'bg-[#0a0a0a]' : 'bg-white'}`}
          style={
            {
              left: `${piece.x * 100}%`,
              width: piece.size,
              height: piece.size * CONFETTI.aspect[piece.shape],
              animationDelay: `${delay + piece.delay}ms`,
              animationDuration: `${piece.duration}ms`,
              '--confetti-drift': `${piece.drift * 100}vw`,
              '--confetti-spin': `${piece.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
