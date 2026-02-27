'use client';

import { useAppState } from '@/providers/AppStateProvider';
import { AllClientsPage } from '@/views/AllClientsPage';

export default function ClientsPage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return <AllClientsPage appState={appState} onUpdateState={updateState} />;
}
