'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'COACH' | 'CLIENT';
  createdAt: string;
  coachProfile: { id: string; bio: string } | null;
  clientProfile: {
    id: string;
    activePlanId: string | null;
    planStartDate: string | null;
    coachRelationship?: {
      status: string;
      coach: { id: string; user: { id: string; name: string | null } };
    } | null;
  } | null;
}

export function useCurrentUser() {
  const { data: session, status } = useSession();
  const { data: user, error, isLoading: isLoadingProfile } = useSWR<UserProfile>(
    status === 'authenticated' ? '/api/me' : null
  );

  return {
    isLoading: status === 'loading' || (status === 'authenticated' && isLoadingProfile),
    isAuthenticated: status === 'authenticated',
    session,
    user: user ?? null,
    role: (session?.user as { role?: string })?.role as 'COACH' | 'CLIENT' | undefined,
    coachProfileId: user?.coachProfile?.id ?? null,
    clientProfileId: user?.clientProfile?.id ?? null,
    /** The client's coach (only available for CLIENT role) */
    coach: user?.clientProfile?.coachRelationship?.coach ?? null,
    error,
  };
}
