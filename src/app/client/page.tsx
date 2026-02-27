'use client';

import { Suspense } from 'react';
import { ClientDashboard } from '@/views/ClientDashboard';

export default function ClientPage() {
  return (
    <Suspense>
      <ClientDashboard />
    </Suspense>
  );
}
