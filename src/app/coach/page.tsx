'use client';

import { Suspense } from 'react';
import { CoachDashboard } from '@/views/CoachDashboard';

export default function CoachPage() {
  return (
    <Suspense>
      <CoachDashboard />
    </Suspense>
  );
}
