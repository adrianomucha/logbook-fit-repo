import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Caller =
  | { role: "client"; clientProfileId: string }
  | { role: "coach"; coachProfileId: string; targetClientId: string };

export class WorkoutNotFoundError extends Error {
  constructor(id: string) {
    super(`Workout completion not found: ${id}`);
    this.name = "WorkoutNotFoundError";
  }
}

export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type SetInput = {
  workoutExerciseId: string;
  setNumber: number;
  completed: boolean;
  actualWeight?: number;
  actualReps?: number;
};

type ProgressResult = {
  recentCompletions: {
    id: string;
    completedAt: Date | null;
    completionPct: number | null;
    exercisesDone: number | null;
    exercisesTotal: number | null;
    durationSec: number | null;
    effortRating: string | null;
    day: { name: string | null; dayNumber: number } | null;
  }[];
  allCompletions: {
    id: string;
    clientId: string;
    planId: string;
    weekId: string;
    dayId: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    completionPct: number;
    exercisesDone: number;
    exercisesTotal: number;
    durationSec?: number;
    effortRating?: string;
  }[];
  stats: {
    totalWorkouts: number;
    avgCompletionPct: number;
    currentStreak: number;
    workoutsLast7Days: number;
  };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class WorkoutServiceImpl {
  constructor(private readonly db: PrismaClient) {}

  // ---- Helpers (private) --------------------------------------------------

  private getClientId(caller: Caller): string {
    return caller.role === "client"
      ? caller.clientProfileId
      : caller.targetClientId;
  }

  private async verifyOwnership(
    clientId: string,
    completionId: string,
    include?: Record<string, unknown>,
  ) {
    const completion = await this.db.workoutCompletion.findFirst({
      where: { id: completionId, clientId },
      ...(include ? { include } : {}),
    });
    if (!completion) throw new WorkoutNotFoundError(completionId);
    return completion;
  }

  private buildSetCompletionData(
    completionId: string,
    exercises: { id: string; sets: number }[],
  ) {
    return exercises.flatMap((we) =>
      Array.from({ length: we.sets }, (_, i) => ({
        workoutCompletionId: completionId,
        workoutExerciseId: we.id,
        setNumber: i + 1,
        completed: false,
      })),
    );
  }

  // ---- Lifecycle methods --------------------------------------------------

  async start(caller: Caller, params: { dayId: string }) {
    const clientId = this.getClientId(caller);

    const client = await this.db.clientProfile.findUnique({
      where: { id: clientId },
      select: { activePlanId: true },
    });
    if (!client?.activePlanId) {
      throw new ValidationError("No active plan assigned");
    }

    const day = await this.db.day.findUnique({
      where: { id: params.dayId },
      include: {
        week: { select: { planId: true } },
        exercises: { orderBy: { orderIndex: "asc" } },
      },
    });
    if (!day || day.week.planId !== client.activePlanId) {
      throw new ValidationError("Day not found");
    }

    // Idempotent — return existing if already started
    const existing = await this.db.workoutCompletion.findFirst({
      where: { clientId, planId: client.activePlanId, dayId: params.dayId },
    });
    if (existing) {
      return { completion: existing, created: false };
    }

    const completion = await this.db.$transaction(async (tx) => {
      const wc = await tx.workoutCompletion.create({
        data: {
          clientId,
          planId: client.activePlanId!,
          dayId: params.dayId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          exercisesTotal: day.exercises.length,
          exercisesDone: 0,
          completionPct: 0,
        },
      });

      const setData = this.buildSetCompletionData(wc.id, day.exercises);
      if (setData.length > 0) {
        await tx.setCompletion.createMany({ data: setData });
      }

      return wc;
    });

    return { completion, created: true };
  }

  async restart(caller: Caller, params: { completionId: string }) {
    const clientId = this.getClientId(caller);
    const completion = await this.verifyOwnership(
      clientId,
      params.completionId,
      {
        day: {
          include: { exercises: { orderBy: { orderIndex: "asc" } } },
        },
      },
    ) as Awaited<ReturnType<typeof this.verifyOwnership>> & {
      day: { exercises: { id: string; sets: number }[] };
    };

    if (
      completion.status !== "IN_PROGRESS" &&
      completion.status !== "COMPLETED"
    ) {
      throw new InvalidStateError("Workout cannot be restarted");
    }

    const updated = await this.db.$transaction(async (tx) => {
      await tx.setCompletion.deleteMany({
        where: { workoutCompletionId: params.completionId },
      });
      await tx.exerciseFlag.deleteMany({
        where: { workoutCompletionId: params.completionId },
      });

      const wc = await tx.workoutCompletion.update({
        where: { id: params.completionId },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          completedAt: null,
          completionPct: 0,
          exercisesDone: 0,
          exercisesTotal: completion.day.exercises.length,
          durationSec: null,
          effortRating: null,
        },
      });

      const setData = this.buildSetCompletionData(
        params.completionId,
        completion.day.exercises,
      );
      if (setData.length > 0) {
        await tx.setCompletion.createMany({ data: setData });
      }

      return wc;
    });

    return updated;
  }

  async finish(
    caller: Caller,
    params: { completionId: string; effortRating?: string },
  ) {
    const clientId = this.getClientId(caller);
    const completion = await this.verifyOwnership(
      clientId,
      params.completionId,
      {
        day: {
          include: { exercises: { select: { id: true, sets: true } } },
        },
      },
    ) as Awaited<ReturnType<typeof this.verifyOwnership>> & {
      day: { exercises: { id: string; sets: number }[] };
    };

    // Allow updating effort rating on already-completed workouts
    if (completion.status === "COMPLETED") {
      if (params.effortRating) {
        return this.db.workoutCompletion.update({
          where: { id: params.completionId },
          data: { effortRating: params.effortRating as never },
        });
      }
      throw new InvalidStateError("Workout already completed");
    }

    const totalSets = completion.day.exercises.reduce(
      (sum, ex) => sum + ex.sets,
      0,
    );
    const completedSets = await this.db.setCompletion.count({
      where: { workoutCompletionId: params.completionId, completed: true },
    });
    const exercisesWithCompletedSets = await this.db.setCompletion.groupBy({
      by: ["workoutExerciseId"],
      where: { workoutCompletionId: params.completionId, completed: true },
    });

    const completionPct =
      totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    const now = new Date();
    const durationSec = completion.startedAt
      ? Math.floor(
          (now.getTime() - completion.startedAt.getTime()) / 1000,
        )
      : null;

    return this.db.workoutCompletion.update({
      where: { id: params.completionId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completionPct,
        exercisesDone: exercisesWithCompletedSets.length,
        exercisesTotal: completion.day.exercises.length,
        durationSec,
        ...(params.effortRating
          ? { effortRating: params.effortRating as never }
          : {}),
      },
    });
  }

  async updateSets(
    caller: Caller,
    params: { completionId: string; sets: SetInput[] },
  ) {
    const clientId = this.getClientId(caller);
    const completion = await this.verifyOwnership(
      clientId,
      params.completionId,
    );

    // Validate all workoutExerciseIds belong to the completion's day
    const uniqueWeIds = [...new Set(params.sets.map((s) => s.workoutExerciseId))];
    const validExercises = await this.db.workoutExercise.findMany({
      where: { id: { in: uniqueWeIds }, dayId: completion.dayId },
      select: { id: true },
    });
    const validIds = new Set(validExercises.map((e) => e.id));
    const invalidIds = uniqueWeIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new ValidationError(
        "workoutExerciseId(s) do not belong to this workout day",
      );
    }

    await this.db.$transaction(
      params.sets.map((s) =>
        this.db.setCompletion.upsert({
          where: {
            workoutCompletionId_workoutExerciseId_setNumber: {
              workoutCompletionId: params.completionId,
              workoutExerciseId: s.workoutExerciseId,
              setNumber: s.setNumber,
            },
          },
          create: {
            workoutCompletionId: params.completionId,
            workoutExerciseId: s.workoutExerciseId,
            setNumber: s.setNumber,
            completed: s.completed,
            actualWeight: s.actualWeight,
            actualReps: s.actualReps,
            completedAt: s.completed ? new Date() : null,
          },
          update: {
            completed: s.completed,
            actualWeight: s.actualWeight,
            actualReps: s.actualReps,
            completedAt: s.completed ? new Date() : null,
          },
        }),
      ),
    );
  }

  async flagExercise(
    caller: Caller,
    params: {
      completionId: string;
      workoutExerciseId: string;
      note?: string;
    },
  ) {
    const clientId = this.getClientId(caller);
    const completion = await this.verifyOwnership(
      clientId,
      params.completionId,
    );

    // Validate exercise belongs to the day
    const exerciseBelongsToDay = await this.db.workoutExercise.findFirst({
      where: { id: params.workoutExerciseId, dayId: completion.dayId },
      select: { id: true },
    });
    if (!exerciseBelongsToDay) {
      throw new ValidationError(
        "workoutExerciseId does not belong to this workout day",
      );
    }

    // Upsert: update if exists, create if not
    return this.db.exerciseFlag.upsert({
      where: {
        workoutCompletionId_workoutExerciseId: {
          workoutCompletionId: params.completionId,
          workoutExerciseId: params.workoutExerciseId,
        },
      },
      update: { note: params.note ?? null },
      create: {
        workoutCompletionId: params.completionId,
        workoutExerciseId: params.workoutExerciseId,
        note: params.note ?? null,
      },
    });
  }

  async getProgress(caller: Caller): Promise<ProgressResult> {
    const clientId = this.getClientId(caller);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCompletions = await this.db.workoutCompletion.findMany({
      where: {
        clientId,
        status: "COMPLETED",
        completedAt: { gte: sevenDaysAgo },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        completedAt: true,
        completionPct: true,
        exercisesDone: true,
        exercisesTotal: true,
        durationSec: true,
        effortRating: true,
        day: { select: { name: true, dayNumber: true } },
      },
    });

    const allRaw = await this.db.workoutCompletion.findMany({
      where: { clientId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        planId: true,
        dayId: true,
        status: true,
        completedAt: true,
        startedAt: true,
        completionPct: true,
        exercisesDone: true,
        exercisesTotal: true,
        durationSec: true,
        effortRating: true,
        day: { select: { name: true, dayNumber: true, weekId: true } },
      },
    });

    const totalWorkouts = allRaw.length;
    const avgCompletionPct =
      allRaw.length > 0
        ? allRaw.reduce((sum, c) => sum + (c.completionPct ?? 0), 0) /
          allRaw.length
        : 0;

    const streak = this.calculateStreak(
      allRaw
        .map((c) => c.completedAt)
        .filter((d): d is Date => d !== null),
    );

    const allCompletions = allRaw.map((c) => ({
      id: c.id,
      clientId,
      planId: c.planId,
      weekId: c.day?.weekId ?? "",
      dayId: c.dayId,
      status: c.status,
      startedAt: c.startedAt?.toISOString() ?? undefined,
      completedAt: c.completedAt?.toISOString() ?? undefined,
      completionPct: c.completionPct ?? 0,
      exercisesDone: c.exercisesDone ?? 0,
      exercisesTotal: c.exercisesTotal ?? 0,
      durationSec: c.durationSec ?? undefined,
      effortRating: c.effortRating ?? undefined,
    }));

    return {
      recentCompletions,
      allCompletions,
      stats: {
        totalWorkouts,
        avgCompletionPct: Math.round(avgCompletionPct * 100) / 100,
        currentStreak: streak,
        workoutsLast7Days: recentCompletions.length,
      },
    };
  }

  // ---- Pure helpers (could be tested directly) ----------------------------

  calculateStreak(completedDates: Date[]): number {
    if (completedDates.length === 0) return 0;

    const dateSet = new Set<string>();
    for (const d of completedDates) {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      dateSet.add(normalized.toISOString());
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      if (dateSet.has(checkDate.toISOString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const workoutService = new WorkoutServiceImpl(prisma);
