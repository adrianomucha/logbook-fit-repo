'use client';

import { useAppState } from '@/providers/AppStateProvider';
import { UnifiedClientProfile } from '@/views/UnifiedClientProfile';

export default function ClientProfilePage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return <UnifiedClientProfile appState={appState} onUpdateState={updateState} />;
}
