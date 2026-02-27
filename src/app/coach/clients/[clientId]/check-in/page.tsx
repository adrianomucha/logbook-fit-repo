'use client';

import { useAppState } from '@/providers/AppStateProvider';
import { ClientCheckIn } from '@/views/ClientCheckIn';

export default function CheckInPage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return <ClientCheckIn appState={appState} onUpdateState={updateState} />;
}
