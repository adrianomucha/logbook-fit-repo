import prisma from "@/lib/prisma";

/**
 * Clone-on-assign: every assignment gives the client their own copy of the
 * plan, so editing a template never mutates a plan someone is mid-workout
 * on, and per-client tailoring never leaks to other clients.
 *
 * Clients assigned before this model existed still point directly at a
 * template (legacy shared behavior) and migrate naturally on their next
 * assignment.
 */

export interface ClonablePlan {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  durationWeeks: number;
  workoutsPerWeek: number;
  sourceTemplateId: string | null;
  weeks: {
    weekNumber: number;
    days: {
      orderIndex: number;
      name: string | null;
      description: string | null;
      exercises: {
        exerciseId: string;
        orderIndex: number;
        trackingType: "REPS" | "TIME";
        sets: number;
        reps: number;
        repsMax: number | null;
        weight: number | null;
        restSeconds: number | null;
        coachNotes: string | null;
        supersetWithPrevious: boolean;
      }[];
    }[];
  }[];
}

/**
 * Build the nested create payload for a client's copy of a plan.
 * Cloning an instance links the copy back to the ROOT template, so
 * "already on this template" checks keep working across generations.
 */
export function buildPlanCloneData(template: ClonablePlan, coachProfileId: string) {
  return {
    coachId: coachProfileId,
    name: template.name,
    description: template.description,
    emoji: template.emoji,
    durationWeeks: template.durationWeeks,
    workoutsPerWeek: template.workoutsPerWeek,
    sourceTemplateId: template.sourceTemplateId ?? template.id,
    weeks: {
      create: template.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        days: {
          create: week.days.map((day) => ({
            orderIndex: day.orderIndex,
            name: day.name,
            description: day.description,
            exercises: {
              create: day.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
                trackingType: e.trackingType,
                sets: e.sets,
                reps: e.reps,
                repsMax: e.repsMax,
                weight: e.weight,
                restSeconds: e.restSeconds,
                coachNotes: e.coachNotes,
                supersetWithPrevious: e.supersetWithPrevious,
              })),
            },
          })),
        },
      })),
    },
  };
}

/** Deep-copy a coach's plan into a client instance. Returns null if the
 * source plan doesn't exist (or isn't the coach's). */
export async function clonePlanForClient(planId: string, coachProfileId: string) {
  const template = await prisma.plan.findFirst({
    where: { id: planId, coachId: coachProfileId, deletedAt: null },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { orderIndex: "asc" },
            include: { exercises: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });
  if (!template) return null;

  return prisma.plan.create({
    data: buildPlanCloneData(template, coachProfileId),
  });
}
