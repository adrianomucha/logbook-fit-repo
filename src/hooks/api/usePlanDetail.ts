import useSWR from 'swr';

/** Full plan detail from GET /api/plans/[id] */
export interface PlanDetail {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  weeks: {
    id: string;
    weekNumber: number;
    days: {
      id: string;
      dayNumber: number;
      name: string | null;
      isRestDay: boolean;
      exercises: {
        id: string;
        orderIndex: number;
        sets: number;
        reps: string | null;
        weight: string | null;
        restSeconds: number | null;
        coachNotes: string | null;
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
