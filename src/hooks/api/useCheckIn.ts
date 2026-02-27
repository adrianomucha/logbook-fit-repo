import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import type { CheckInDetail } from '@/types/api';

export function useCheckIn(checkInId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CheckInDetail>(
    checkInId ? `/api/check-ins/${checkInId}` : null
  );

  const submitClientResponse = async (response: {
    effortRating?: string;
    painBlockers?: string;
    clientFeeling?: string;
  }) => {
    if (!checkInId) return;
    const updated = await apiFetch<CheckInDetail>(
      `/api/check-ins/${checkInId}/client-respond`,
      {
        method: 'PUT',
        body: JSON.stringify(response),
      }
    );
    mutate();
    return updated;
  };

  const submitCoachResponse = async (response: {
    coachFeedback?: string;
    planAdjustment?: boolean;
  }) => {
    if (!checkInId) return;
    const updated = await apiFetch<CheckInDetail>(
      `/api/check-ins/${checkInId}/coach-respond`,
      {
        method: 'PUT',
        body: JSON.stringify(response),
      }
    );
    mutate();
    return updated;
  };

  return {
    checkIn: data ?? null,
    error,
    isLoading,
    submitClientResponse,
    submitCoachResponse,
    refresh: mutate,
  };
}

/** Create a new check-in for a client. Returns the new check-in. */
export async function createCheckInForClient(clientProfileId: string) {
  return apiFetch<CheckInDetail>('/api/check-ins', {
    method: 'POST',
    body: JSON.stringify({ clientProfileId }),
  });
}
