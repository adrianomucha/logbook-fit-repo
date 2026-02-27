'use client';

import { useAppState } from '@/providers/AppStateProvider';
import { ClientWorkoutExecution } from '@/views/ClientWorkoutExecution';

export default function WorkoutPage() {
  const { appState, updateState } = useAppState();
  if (!appState) return null;
  return <ClientWorkoutExecution appState={appState} onUpdateState={updateState} />;
}
