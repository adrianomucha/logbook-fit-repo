'use client';

import { Suspense } from 'react';
import { useAppState } from '@/providers/AppStateProvider';
import { CoachDashboard } from '@/views/CoachDashboard';

export default function CoachPage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return (
    <Suspense>
      <CoachDashboard appState={appState} onUpdateState={updateState} />
    </Suspense>
  );
}
