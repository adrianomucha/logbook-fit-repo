'use client';

import { useAppState } from '@/providers/AppStateProvider';
import { ClientCheckInForm } from '@/views/ClientCheckInForm';

export default function CheckInFormPage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return <ClientCheckInForm appState={appState} onUpdateState={updateState} />;
}
