import type { WorkoutCompletion, WorkoutPlan } from "./types";

interface Session {
  weekNumber: number;
  durationSec?: number;
  done: boolean;
}

export interface PlanSummary {
  weekCount: number;
  /** Training days in the plan (days with no exercises are rest) */
  planned: number;
  completed: number;
  /** completed / planned, rounded; 0 for a plan with nothing planned */
  pct: number;
  /** Sum of durations across completed sessions that recorded one */
  trainedSec: number;
  /** Average over timed sessions only; null when none were timed */
  avgSessionMin: number | null;
  /** One plain sentence about what was missed (or that nothing was) */
  missNote: string;
}

function listWeeks(nums: number[]): string {
  if (nums.length === 1) return `week ${nums[0]}`;
  return `weeks ${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
}

export function describeMisses(missed: { weekNumber: number }[]): string {
  if (missed.length === 0) return "Didn’t miss a single session.";
  const n = missed.length;
  const noun = n === 1 ? "session" : "sessions";

  const perWeek = new Map<number, number>();
  for (const s of missed) perWeek.set(s.weekNumber, (perWeek.get(s.weekNumber) ?? 0) + 1);
  const weekNums = [...perWeek.keys()].sort((a, b) => a - b);

  if (weekNums.length === 1) {
    return n === 1
      ? `Missed 1 session, in week ${weekNums[0]}.`
      : `Missed ${n} sessions, ${n === 2 ? "both" : "all"} in week ${weekNums[0]}.`;
  }
  // One week holding most of the misses is the story worth telling
  const [worstWeek, worstCount] = [...perWeek.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (worstCount > 1 && worstCount * 2 > n) {
    return `Missed ${n} ${noun}, ${worstCount} of them in week ${worstWeek}.`;
  }
  if (weekNums.length <= 3) return `Missed ${n} ${noun} across ${listWeeks(weekNums)}.`;
  return `Missed ${n} ${noun} across ${weekNums.length} weeks.`;
}

/** "49.2 h" / "45 min" as [value, unit] so callers can style them apart */
export function formatTrainingTime(totalSec: number): [string, string] {
  const minutes = Math.round(totalSec / 60);
  if (minutes < 60) return [String(minutes), "min"];
  return [String(Math.round((minutes / 60) * 10) / 10), "h"];
}

/**
 * The numbers behind the plan-complete card, shared so the web and native
 * cards say exactly the same thing. Scoped to this plan: the progress
 * endpoint's stats are all-time, so a returning client's earlier blocks
 * would inflate them.
 */
export function summarizeCompletedPlan(
  plan: WorkoutPlan,
  completions: WorkoutCompletion[],
): PlanSummary {
  const byDay = new Map(
    completions
      .filter((c) => c.planId === plan.id && c.status === "COMPLETED")
      .map((c) => [c.dayId, c]),
  );

  const sessions: Session[] = plan.weeks.flatMap((week) =>
    week.days
      .filter((d) => d.exercises.length > 0)
      .map((d) => {
        const completion = byDay.get(d.id);
        return {
          weekNumber: week.weekNumber,
          durationSec: completion?.durationSec,
          done: !!completion,
        };
      }),
  );

  const planned = sessions.length;
  const completed = sessions.filter((s) => s.done).length;
  const timed = sessions.filter((s) => s.done && s.durationSec);
  const trainedSec = timed.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);

  return {
    weekCount: plan.durationWeeks || plan.weeks.length,
    planned,
    completed,
    pct: planned > 0 ? Math.round((completed / planned) * 100) : 0,
    trainedSec,
    avgSessionMin: timed.length > 0 ? Math.round(trainedSec / timed.length / 60) : null,
    missNote: describeMisses(sessions.filter((s) => !s.done)),
  };
}
