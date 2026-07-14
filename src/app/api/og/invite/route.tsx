import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const VOLT = '#c3f910';
const INK = '#0a0a0a';

/**
 * GET /api/og/invite?token=…
 * Branded unfurl card for invite links — rendered into message threads by
 * iMessage/WhatsApp/Slack link previews. Exposes only what the public
 * token-validation endpoint already returns (coach name).
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');

  let coachName: string | null = null;
  if (token) {
    const invite = await prisma.clientInvite
      .findUnique({
        where: { token },
        include: { coach: { include: { user: { select: { name: true } } } } },
      })
      .catch(() => null);
    if (invite && invite.status === 'PENDING' && invite.expiresAt >= new Date()) {
      coachName = invite.coach.user.name ?? 'Your coach';
    }
  }

  const headline = coachName ? `${coachName} is expecting you` : 'Train with your coach';

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
          {(coachName ? 'YOUR COACH' : 'PERSONAL COACHING') + ' · LOGBOOK.FIT'}
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
              fontSize: 76,
              fontWeight: 700,
              color: '#fafafa',
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            {headline}
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
    { width: 1200, height: 630 }
  );
}
