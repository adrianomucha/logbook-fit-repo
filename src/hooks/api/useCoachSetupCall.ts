import useSWR from 'swr';
import type { CoachSetupCall } from '@/types/api';

/**
 * The coach's setup call, for the getting-started screen. Pass `enabled`
 * false to skip the request (no booking link configured).
 */
export function useCoachSetupCall(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<CoachSetupCall>(
    enabled ? '/api/coach/setup-call' : null
  );

  return {
    call: data?.call ?? null,
    loaded: data !== undefined || error !== undefined,
    isLoading,
    mutate,
  };
}
