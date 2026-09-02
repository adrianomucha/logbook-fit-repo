import useSWR from 'swr';
import type { CheckInDetail, ClientCheckIn, ClientProgress } from '@logbook/shared/types/api';
import { apiFetch } from '@/lib/api';

/**
 * GET /api/client/check-ins — polled like the rest of Today: this GET is
 * also what lazily creates the weekly scheduled check-in, so without it a
 * client who keeps the app open never sees (or even triggers) a new one.
 */
export function useClientCheckIns() {
  const { data, error, isLoading, mutate } = useSWR<ClientCheckIn[]>('/api/client/check-ins', {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  return { checkIns: data ?? [], error, isLoading, refresh: mutate };
}

/** GET /api/check-ins/[id] plus the client's answer. */
export function useCheckIn(checkInId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CheckInDetail>(checkInId ? `/api/check-ins/${checkInId}` : null);

  const submitClientResponse = async (response: { effortRating: string; clientFeeling: string; painBlockers?: string }) => {
    if (!checkInId) return;
    const updated = await apiFetch<CheckInDetail>(`/api/check-ins/${checkInId}/client-respond`, {
      method: 'PUT',
      body: JSON.stringify(response),
    });
    void mutate();
    return updated;
  };

  return { checkIn: data ?? null, error, isLoading, submitClientResponse, refresh: mutate };
}

/** GET /api/client/progress — every completion plus totals. */
export function useClientProgress() {
  const { data, error, isLoading, mutate } = useSWR<ClientProgress>('/api/client/progress', {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  return { progress: data ?? null, error, isLoading, refresh: mutate };
}
