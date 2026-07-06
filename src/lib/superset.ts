/**
 * Superset helpers. A workout exercise carries `supersetWithPrevious`: when
 * true it chains to the exercise directly above it (by orderIndex). A run of
 * consecutive chained exercises forms one superset group; groups of size 1 are
 * plain standalone exercises. The first exercise of a day can never chain.
 */

interface SupersetMember {
  supersetWithPrevious?: boolean | null;
}

/**
 * Split an ordered exercise list into display groups. Every exercise appears
 * in exactly one group, in the original order; a group with 2+ members is a
 * superset.
 */
export function groupBySuperset<T extends SupersetMember>(exercises: T[]): T[][] {
  const groups: T[][] = [];
  for (const [i, ex] of exercises.entries()) {
    if (i > 0 && ex.supersetWithPrevious) {
      groups[groups.length - 1].push(ex);
    } else {
      groups.push([ex]);
    }
  }
  return groups;
}

export function isSuperset<T extends SupersetMember>(group: T[]): boolean {
  return group.length > 1;
}

/**
 * Display label for an exercise within its group: standalone exercises keep
 * their plain number ("4"); superset members get a letter suffix ("4A", "4B")
 * so the shared number reads as one station.
 */
export function exerciseLabel(
  groupNumber: number,
  memberIndex: number,
  groupSize: number
): string {
  if (groupSize <= 1) return String(groupNumber);
  return `${groupNumber}${String.fromCharCode(65 + memberIndex)}`;
}
