import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { isCoachSignupOpen } from '@/lib/waitlist';
import SignupClient from './SignupClient';

interface SignupPageProps {
  searchParams: Promise<{ invite?: string }>;
}

/**
 * The invite link's first impression happens in the message thread, before
 * the click — a shared link unfurls as "{Coach} invited you to train on
 * Logbook" with the coach's note as the description and a branded card
 * image, instead of a bare URL.
 */
export async function generateMetadata({ searchParams }: SignupPageProps): Promise<Metadata> {
  const { invite } = await searchParams;

  if (!invite) {
    return {
      title: 'Create your coach account · Logbook',
      description: 'Know who needs you today, before they go quiet.',
    };
  }

  const found = await prisma.clientInvite
    .findUnique({
      where: { token: invite },
      include: { coach: { include: { user: { select: { name: true } } } } },
    })
    .catch(() => null);

  // Invalid/expired/used links unfurl generically — no coach data leaks
  // beyond what the public token endpoint would already return
  if (!found || found.status !== 'PENDING' || found.expiresAt < new Date()) {
    return { title: 'Join Logbook', description: 'Train with your coach on Logbook.' };
  }

  const coachName = found.coach.user.name ?? 'Your coach';
  const title = `${coachName} invited you to train on Logbook`;
  const description = found.note ?? `${coachName} is expecting you. Signup takes 30 seconds.`;
  const ogImage = `/api/og/invite?token=${encodeURIComponent(invite)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function SignupPage() {
  // The gate is decided server-side (env never reaches the client bundle);
  // the API enforces it independently, so this only shapes which UI renders.
  return <SignupClient coachSignupOpen={isCoachSignupOpen()} />;
}
