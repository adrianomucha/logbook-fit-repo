import { formatWeight, type WeightUnit } from "./weight-units";

/**
 * Personal bests for the Progress tab, shared by web and app so both say
 * exactly the same thing. Pure: the server feeds it every completed set it
 * logged and ships the result.
 *
 * A best is a session's top set for an exercise beating every earlier
 * session's top set for that exercise:
 *  - weighted: a heavier weight ("+2.5"), or the same top weight for more
 *    reps ("+1 rep")
 *  - bodyweight (no weight): more reps
 *  - timed holds: a longer hold
 * The first session of an exercise sets the baseline and is not a best.
 * At most one best per exercise per session.
 */

export interface LoggedSet {
  /** Library exercise id — the same lift across plans and weeks */
  exerciseId: string;
  exerciseName: string;
  trackingType: "REPS" | "TIME";
  /** What was lifted, stored lb (the client's override, else the prescription); null = bodyweight */
  weight: number | null;
  /** Reps done, or seconds held for TIME */
  reps: number;
  completionId: string;
  planId: string;
  completedAt: string;
}

export interface PersonalBest {
  exerciseId: string;
  exerciseName: string;
  completionId: string;
  planId: string;
  completedAt: string;
  /** Which way it beat the last best */
  kind: "weight" | "reps" | "time";
  weight: number | null;
  /** Reps, or seconds for a timed hold */
  reps: number;
  /** Improvement over the previous best, in the kind's own unit (stored lb for weight) */
  delta: number;
}

interface Top {
  weight: number;
  reps: number;
}

/** Heavier wins; at the same weight, more reps wins */
function beats(a: Top, b: Top): boolean {
  return a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);
}

/** Every personal best in the history, newest first */
export function findPersonalBests(sets: LoggedSet[]): PersonalBest[] {
  // Top set per (session, exercise)
  const sessionTops = new Map<string, { set: LoggedSet; top: Top }>();
  for (const s of sets) {
    if (!(s.reps > 0)) continue;
    const top: Top = {
      // Timed holds compare on duration alone
      weight: s.trackingType === "TIME" ? 0 : (s.weight ?? 0),
      reps: s.reps,
    };
    const key = `${s.completionId}|${s.exerciseId}`;
    const current = sessionTops.get(key);
    if (!current || beats(top, current.top)) sessionTops.set(key, { set: s, top });
  }

  const chronological = [...sessionTops.values()].sort(
    (a, b) =>
      a.set.completedAt.localeCompare(b.set.completedAt) ||
      a.set.completionId.localeCompare(b.set.completionId),
  );

  const bestSoFar = new Map<string, Top>();
  const bests: PersonalBest[] = [];
  for (const { set, top } of chronological) {
    const previous = bestSoFar.get(set.exerciseId);
    if (!previous) {
      bestSoFar.set(set.exerciseId, top);
      continue;
    }
    if (!beats(top, previous)) continue;
    bestSoFar.set(set.exerciseId, top);

    const heavier = top.weight > previous.weight;
    bests.push({
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName,
      completionId: set.completionId,
      planId: set.planId,
      completedAt: set.completedAt,
      kind: set.trackingType === "TIME" ? "time" : heavier ? "weight" : "reps",
      weight: set.trackingType === "TIME" ? null : set.weight,
      reps: top.reps,
      delta: heavier
        ? Math.round((top.weight - previous.weight) * 100) / 100
        : top.reps - previous.reps,
    });
  }

  return bests.reverse();
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}

/** "95 lb × 5" · "15 reps" · "1:30" — weight in the viewer's unit */
export function formatBestValue(
  best: Pick<PersonalBest, "kind" | "weight" | "reps">,
  unit: WeightUnit,
): string {
  if (best.kind === "time") return formatSeconds(best.reps);
  if (best.weight) return `${formatWeight(best.weight, unit)} × ${best.reps}`;
  return `${best.reps} reps`;
}

export interface PersonalBestSummary {
  /** Bests set on the active plan */
  count: number;
  /** Newest first, capped — the Progress tab lists only the latest few */
  latest: PersonalBest[];
}

/** The count and the latest bests for one plan */
export function summarizePersonalBests(
  bests: PersonalBest[],
  planId: string | null,
  { limit = 3 }: { limit?: number } = {},
): PersonalBestSummary {
  const inPlan = planId ? bests.filter((b) => b.planId === planId) : bests;
  return { count: inPlan.length, latest: inPlan.slice(0, limit) };
}
