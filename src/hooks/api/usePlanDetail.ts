import useSWR from 'swr';

/** Full plan detail from GET /api/plans/[id] */
export interface PlanDetail {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  emoji: string;
  durationWeeks: number;
  workoutsPerWeek: number;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  /** null = template; set = a client's copy, pointing at the root template */
  sourceTemplateId: string | null;
  weeks: {
    id: string;
    weekNumber: number;
    days: {
      id: string;
      orderIndex: number;
      name: string | null;
      description: string | null;
      exercises: {
        id: string;
        orderIndex: number;
        trackingType: 'REPS' | 'TIME';
        sets: number;
        reps: number;
        repsMax: number | null;
        weight: string | null;
        restSeconds: number | null;
        coachNotes: string | null;
        supersetWithPrevious: boolean;
        exercise: {
          id: string;
          name: string;
          category: string | null;
          instructions: string | null;
        };
      }[];
    }[];
  }[];
  assignedTo: {
    id: string;
    user: { name: string | null; email: string };
    planStartDate: string | null;
  }[];
}

export function usePlanDetail(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PlanDetail>(
    planId ? `/api/plans/${planId}` : null
  );

  return {
    plan: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
