import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { createPlanSchema } from "@/lib/validations/schemas";
import { collectImportExercises, parseImportRows } from "@/lib/plan-import";
import { readWorkoutRows } from "@/lib/plan-import-xlsx";

/** Filled-in templates are tiny; anything bigger than this isn't one. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

// Plan metadata comes from the upload form, not the sheet — same rules as a
// manually created plan. Duration and schedule are derived from the rows.
const importPlanMetaSchema = createPlanSchema.pick({
  name: true,
  description: true,
  emoji: true,
});

/**
 * POST /api/plans/import
 * Creates a plan template from an uploaded .xlsx (multipart form: `file` plus
 * `name`/`description`/`emoji`). All-or-nothing: any bad row fails the whole
 * upload with per-row errors (`rowErrors: [{ row, message }]`) so the coach
 * fixes the sheet and retries, instead of ending up with half a plan.
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected a file upload" },
        { status: 400 }
      );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attach the filled-in template file" },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large — the filled-in template stays well under 2 MB" },
        { status: 413 }
      );
    }

    const meta = importPlanMetaSchema.safeParse({
      name: form.get("name"),
      description: form.get("description") ?? undefined,
      emoji: form.get("emoji") ?? undefined,
    });
    if (!meta.success) {
      const issue = meta.error.issues[0];
      return NextResponse.json(
        { error: issue ? issue.message : "Invalid plan details" },
        { status: 400 }
      );
    }
    const { name, description, emoji } = meta.data;

    const read = await readWorkoutRows(Buffer.from(await file.arrayBuffer()));
    if (!read.ok) {
      return NextResponse.json({ error: read.error }, { status: 400 });
    }

    const { plan: parsed, errors } = parseImportRows(read.rows);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            errors.length === 1 && errors[0].row === 0
              ? errors[0].message
              : `The file has ${errors.length} ${errors.length === 1 ? "problem" : "problems"} — fix the rows below and upload it again`,
          rowErrors: errors.filter((e) => e.row > 0),
        },
        { status: 400 }
      );
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
            emoji: emoji ?? "📋",
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
