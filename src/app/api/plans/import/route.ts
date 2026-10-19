import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { z } from "zod";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { createPlanSchema } from "@/lib/validations/schemas";
import {
  collectImportExercises,
  IMPORT_COLUMNS,
  IMPORT_LIMITS,
  importErrorBody,
  parseImportRows,
} from "@/lib/plan-import";

const cellSchema = z.string().max(2000).nullable().optional();

/** A RawImportRow as the preview returned it; parseImportRows does the real checking. */
const importRowSchema = z.object({
  rowNumber: z.number().int().min(0),
  sheet: z.string().max(200).optional(),
  ...Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, cellSchema])),
});

// Plan metadata comes from the dialog, not the sheet — same rules as a
// manually created plan. Duration and schedule are derived from the rows.
const importPlanSchema = createPlanSchema
  .pick({ name: true, description: true })
  .extend({
    // Headroom over maxRows so an oversized plan gets parseImportRows' message
    rows: z.array(importRowSchema).max(IMPORT_LIMITS.maxRows * 2),
  });

/**
 * POST /api/plans/import
 * Creates a plan template from the rows POST /api/plans/import/preview read
 * out of the coach's spreadsheet, once they've reviewed them (JSON body:
 * `name`, `description`, `rows`). The rows are parsed and bounds-checked
 * again here — the client is not trusted to send back what the preview
 * returned. All-or-nothing: any bad row fails the import with per-row
 * errors (`rowErrors: [{ row, sheet?, message }]`).
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    session: Session,
    coachProfileId: string
  ) => {
    const body = await req.json().catch(() => null);
    const input = importPlanSchema.safeParse(body);
    if (!input.success) {
      const issue = input.error.issues[0];
      return NextResponse.json(
        { error: issue?.path[0] === "name" ? issue.message : "Invalid import — upload the file again" },
        { status: 400 }
      );
    }
    const { name, description, rows } = input.data;

    // Unlabelled weight cells are in the coach's own unit (Settings)
    const coachUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { weightUnit: true },
    });
    const { plan: parsed, errors } = parseImportRows(rows, coachUser?.weightUnit);
    if (!parsed) {
      return NextResponse.json(importErrorBody(errors), { status: 400 });
    }

    // Same duplicate-name rule as POST /api/plans (scoped to templates)
    const existingPlan = await prisma.plan.findFirst({
      where: { ...coachScope(coachProfileId), sourceTemplateId: null, name },
    });
    if (existingPlan) {
      return NextResponse.json(
        { error: "A plan with this name already exists" },
        { status: 409 }
      );
    }

    // Resolve sheet exercise names against the coach's library up front
    // (case-insensitive); names the library doesn't have yet are created
    // inside the transaction below.
    const wanted = collectImportExercises(parsed);
    const existingExercises = await prisma.exercise.findMany({
      where: {
        ...coachScope(coachProfileId),
        name: { in: wanted.map((w) => w.name), mode: "insensitive" },
      },
      select: { id: true, name: true },
    });

    const plan = await prisma.$transaction(
      async (tx) => {
        const idByName = new Map(
          existingExercises.map((e) => [e.name.toLowerCase(), e.id])
        );
        for (const exercise of wanted) {
          const key = exercise.name.toLowerCase();
          if (idByName.has(key)) continue;
          const created = await tx.exercise.create({
            data: {
              coachId: coachProfileId,
              name: exercise.name,
              trackingType: exercise.trackingType,
            },
          });
          idByName.set(key, created.id);
        }

        // Same nested-create shape as plan cloning (see plan-clone.ts)
        return tx.plan.create({
          data: {
            coachId: coachProfileId,
            name,
            description,
            durationWeeks: parsed.durationWeeks,
            workoutsPerWeek: parsed.workoutsPerWeek,
            weeks: {
              create: parsed.weeks.map((week) => ({
                weekNumber: week.weekNumber,
                days: {
                  create: week.days.map((day) => ({
                    orderIndex: day.orderIndex,
                    name: day.name,
                    exercises: {
                      create: day.exercises.map((e, index) => ({
                        exerciseId: idByName.get(e.name.toLowerCase())!,
                        orderIndex: index + 1,
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
          },
          include: {
            weeks: {
              orderBy: { weekNumber: "asc" },
              select: { id: true, weekNumber: true },
            },
          },
        });
      },
      { timeout: 20000 }
    );

    return NextResponse.json(plan, { status: 201 });
  }
);
