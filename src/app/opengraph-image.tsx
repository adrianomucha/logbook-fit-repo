import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Logbook.fit · Your quietest client is your next cancellation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Same literals as the invite card (src/app/api/og/invite): ImageResponse
// renders outside the app's CSS, so the HSL tokens in globals.css aren't
// available here.
const VOLT = '#c3f910';
const INK = '#0a0a0a';

/**
 * The share card behind every link to the landing page. Nearly all waitlist
 * traffic arrives through a shared link, so this is the page's real first
 * impression. Generated rather than committed as a PNG so the headline can't
 * drift out of sync with the hero, and so there's no binary to re-export when
 * the copy changes.
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
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 6,
            color: '#a3a3a3',
          }}
        >
          FOR INDEPENDENT COACHES · LOGBOOK.FIT
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <div
            style={{
              width: 14,
              borderRadius: 7,
              backgroundColor: VOLT,
              marginRight: 40,
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 72,
              fontWeight: 700,
              color: '#fafafa',
              lineHeight: 1.15,
              maxWidth: 940,
            }}
          >
            <div style={{ display: 'flex' }}>Your quietest client</div>
            <div style={{ display: 'flex' }}>is your next</div>
            <div style={{ display: 'flex', color: VOLT }}>cancellation.</div>
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
