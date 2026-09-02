'use client';

import { Suspense } from 'react';
import { CoachSettingsPage } from '@/views/CoachSettingsPage';

export default function CoachSettingsRoute() {
  // Suspense boundary for useSearchParams (?section=) — same pattern as /coach
  return (
    <Suspense>
      <CoachSettingsPage />
    </Suspense>
  );
}
