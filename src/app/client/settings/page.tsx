'use client';

import { Suspense } from 'react';
import { ClientSettingsPage } from '@/views/ClientSettingsPage';

export default function ClientSettingsRoute() {
  // Suspense boundary for useSearchParams (?section=) — same pattern as /coach
  return (
    <Suspense>
      <ClientSettingsPage />
    </Suspense>
  );
}
