import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkoutCompletion, WorkoutPlan } from '@/types';
import { Trophy, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PRBoardProps {
  completions: WorkoutCompletion[];
  plan: WorkoutPlan;
}

interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  weightUnit: string;
  sets: number;
  reps: string;
  achievedAt: string;
  isRecent: boolean; // Within last 7 days
}

/**
 * Parse weight string like "145 lbs" or "225lbs" to number and unit
 */
function parseWeight(weightStr?: string): { weight: number; unit: string } {
  if (!weightStr) return { weight: 0, unit: 'lbs' };
  const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(lbs?|kg)?/i);
  if (match) {
    return {
      weight: parseFloat(match[1]),
      unit: match[2]?.toLowerCase().replace('lb', 'lbs') || 'lbs',
    };
  }
  return { weight: 0, unit: 'lbs' };
}

export function PRBoard({ completions, plan }: PRBoardProps) {
  const [showAll, setShowAll] = useState(false);

  const prs = useMemo(() => {
    const prMap = new Map<string, PersonalRecord>();
    const now = new Date();

    // Get all completed workouts
    const completedWorkouts = completions.filter(
      (c) => c.status === 'COMPLETED' && c.completedAt
    );

    for (const completion of completedWorkouts) {
      // Find the workout day in the plan
      const week = plan.weeks.find((w) => w.id === completion.weekId);
      const day = week?.days.find((d) => d.id === completion.dayId);

      if (!week || !day) continue;

      const completedDate = completion.completedAt!;
      const daysAgo = differenceInDays(now, parseISO(completedDate));
      const isRecent = daysAgo <= 7;

      // Check each exercise
      for (const exercise of day.exercises) {
        if (!exercise.weight) continue; // Skip exercises without weight

        const { weight, unit } = parseWeight(exercise.weight);
        if (weight === 0) continue;

        const existing = prMap.get(exercise.name);

        // Update PR if this is higher weight
        if (!existing || weight > existing.maxWeight) {
          prMap.set(exercise.name, {
            exerciseName: exercise.name,
            maxWeight: weight,
            weightUnit: unit,
            sets: exercise.sets,
            reps: exercise.reps || '—',
            achievedAt: completedDate,
            isRecent: isRecent,
          });
        }
      }
    }

    // Convert to array and sort by weight (descending)
    return Array.from(prMap.values()).sort((a, b) => b.maxWeight - a.maxWeight);
  }, [completions, plan]);

  const displayedPRs = showAll ? prs : prs.slice(0, 5);
  const hasMore = prs.length > 5;

  if (prs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No PRs recorded yet.</p>
            <p className="text-sm">Complete workouts to track your records!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            Personal Records
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {prs.length} {prs.length === 1 ? 'exercise' : 'exercises'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedPRs.map((pr, idx) => (
          <div
            key={pr.exerciseName}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg',
              idx === 0 ? 'bg-warning/5 border border-warning/20' : 'bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {idx === 0 && (
                <span className="text-lg shrink-0">🥇</span>
              )}
              {idx === 1 && (
                <span className="text-lg shrink-0">🥈</span>
              )}
              {idx === 2 && (
                <span className="text-lg shrink-0">🥉</span>
              )}
              {idx > 2 && (
                <span className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground shrink-0">
                  #{idx + 1}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{pr.exerciseName}</p>
                <p className="text-xs text-muted-foreground">
                  {pr.sets} × {pr.reps} • {format(parseISO(pr.achievedAt), 'MMM d')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {pr.isRecent && (
                <span className="flex items-center gap-0.5 text-xs text-success bg-success/10 px-1.5 py-0.5 rounded">
                  <Sparkles className="w-3 h-3" />
                  NEW
                </span>
              )}
              <span className="font-bold text-sm">
                {pr.maxWeight} {pr.weightUnit}
              </span>
            </div>
          </div>
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-muted-foreground"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show All ({prs.length - 5} more)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
