'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { EarlyAccessLanding } from '@/views/EarlyAccessLanding';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Signed-in users go straight to their dashboard; everyone else
  // (including visitors while the session check is in flight) sees
  // the early-access landing page.
  useEffect(() => {
    if (status !== 'authenticated') return;

    const role = (session?.user as { role?: string })?.role;
    if (role === 'COACH') {
      router.replace('/coach');
    } else if (role === 'CLIENT') {
      router.replace('/client');
    }
  }, [status, session, router]);

  return <EarlyAccessLanding />;
}
