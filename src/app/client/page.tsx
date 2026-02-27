'use client';

import { Suspense } from 'react';
import { useAppState } from '@/providers/AppStateProvider';
import { ClientDashboard } from '@/views/ClientDashboard';

export default function ClientPage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return (
    <Suspense>
      <ClientDashboard appState={appState} onUpdateState={updateState} />
    </Suspense>
  );
}
