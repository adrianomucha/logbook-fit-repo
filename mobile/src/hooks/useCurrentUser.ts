import useSWR from 'swr';
import { normalizeWeightUnit, type WeightUnit } from '@logbook/shared/weight-units';
import { useAuth } from '@/lib/auth';

/** GET /api/me — same payload the web's useCurrentUser reads. */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'COACH' | 'CLIENT';
  avatarUrl: string | null;
  timezone: string;
  weightUnit: WeightUnit;
  createdAt: string;
  coachProfile: { id: string; bio: string | null } | null;
  clientProfile: {
    id: string;
    activePlanId: string | null;
    planStartDate: string | null;
    coachRelationship?: {
      status: string;
      coach: { id: string; user: { id: string; name: string | null; avatarUrl: string | null } };
    } | null;
  } | null;
  isAdmin: boolean;
}

export function useCurrentUser() {
  const { status } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    status === 'signed-in' ? '/api/me' : null
  );
  return {
    user: data ?? null,
    coach: data?.clientProfile?.coachRelationship?.coach ?? null,
    clientProfileId: data?.clientProfile?.id ?? null,
    /** kg or lb — how this person reads and types weights (stored as lb) */
    weightUnit: normalizeWeightUnit(data?.weightUnit),
    error,
    isLoading,
    refresh: mutate,
  };
}
