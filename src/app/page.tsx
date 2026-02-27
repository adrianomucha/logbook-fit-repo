'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    const role = (session?.user as { role?: string })?.role;
    if (role === 'COACH') {
      router.replace('/coach');
    } else if (role === 'CLIENT') {
      router.replace('/client');
    } else {
      router.replace('/login');
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
