'use client';

import { Suspense } from 'react';
import { ClientDashboard } from '@/views/ClientDashboard';
import { InstallPrompt } from '@/components/InstallPrompt';

export default function ClientPage() {
  return (
    <>
      <Suspense>
        <ClientDashboard />
      </Suspense>
      {/* Home surface only — never over a live workout or a check-in form. */}
      <InstallPrompt />
    </>
  );
}
