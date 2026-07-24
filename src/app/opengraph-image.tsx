import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const alt = 'Logbook.fit — plan, train, check in. Coaching software for personal trainers.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VOLT = '#c3f910';
const INK = '#0a0a0a';

/**
 * Unfurl card for the landing page — what Twitter/X, LinkedIn, Slack, iMessage
 * and WhatsApp render when someone shares the waitlist link. Mirrors the hero's
 * dark canvas and display type so the preview and the page read as one thing.
 *
 * Deliberately no photo: at 1200×630 the screenshots in the page body turn to
 * mush, and the wordmark + volt slash survive the thumbnail crops these
 * platforms apply.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: INK,
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#a3a3a3' }}>
          PRIVATE BETA · JOIN THE WAITLIST
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 118,
              fontWeight: 700,
              color: '#fafafa',
              lineHeight: 1.0,
              letterSpacing: -3,
            }}
          >
            PLAN. TRAIN.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 118,
              fontWeight: 700,
              color: VOLT,
              lineHeight: 1.0,
              letterSpacing: -3,
            }}
          >
            CHECK IN.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: 30,
              color: '#a3a3a3',
              maxWidth: 860,
            }}
          >
            Coaching software for personal trainers and their clients.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Rep-tally brand mark — three strokes and the volt slash */}
          <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="14.5" fill="#fafafa" />
            <path
              d="M21 20v24M32 20v24M43 20v24"
              stroke={INK}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M14.5 41.5 49.5 22.5"
              stroke={VOLT}
              strokeWidth="5.5"
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              display: 'flex',
              marginLeft: 20,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 5,
              color: '#fafafa',
            }}
          >
            LOGBOOK
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: 14,
              fontSize: 24,
              letterSpacing: 5,
              color: '#a3a3a3',
            }}
          >
            FITNESS
          </div>
        </div>
      </div>
    ),
    size
  );
}
