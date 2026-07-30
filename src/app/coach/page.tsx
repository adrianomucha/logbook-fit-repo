'use client';

import { Suspense } from 'react';
import { CoachDashboard } from '@/views/CoachDashboard';
import { InstallPrompt } from '@/components/InstallPrompt';

export default function CoachPage() {
  return (
    <>
      <Suspense>
        <CoachDashboard />
      </Suspense>
      {/* Home surface only — never over the plan editor or a check-in review. */}
      <InstallPrompt />
    </>
  );
}
