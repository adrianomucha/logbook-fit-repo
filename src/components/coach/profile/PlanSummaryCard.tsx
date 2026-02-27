import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dumbbell,
  MoreHorizontal,
  Eye,
  ArrowRightLeft,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Client, WorkoutPlan, WorkoutDay } from '@/types';
import { getCurrentWeekNumber } from '@/lib/workout-week-helpers';

interface PlanSummaryCardProps {
  client: Client;
  plan?: WorkoutPlan;
  planStartDate?: string;
  todaysWorkout?: WorkoutDay | null;
  onViewPlan: () => void;
  onChangePlan: () => void;
  onCreatePlan: () => void;
  onUnassignPlan: () => void;
}

export function PlanSummaryCard({
  client,
  plan,
  planStartDate,
  todaysWorkout,
  onViewPlan,
  onChangePlan,
  onCreatePlan,
  onUnassignPlan,
}: PlanSummaryCardProps) {
  // Empty state - no plan assigned
  if (!plan) {
    return (
      <Card className="shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Workout Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              No plan assigned to {client.name}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={onChangePlan}>
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Assign Existing
              </Button>
              <Button size="sm" onClick={onCreatePlan}>
                <Plus className="w-4 h-4 mr-1" />
                Create New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentWeek = planStartDate
    ? getCurrentWeekNumber(planStartDate, plan.weeks.length)
    : 1;
  const totalWeeks = plan.weeks.length;
  const workoutsPerWeek =
    plan.workoutsPerWeek ||
    plan.weeks[0]?.days.filter((d) => !d.isRestDay).length ||
    0;

  return (
    <Card className="shrink-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Workout Plan
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewPlan}>
                <Eye className="w-4 h-4 mr-2" />
                View & Edit Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onChangePlan}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Switch Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreatePlan}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onUnassignPlan}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Plan info */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plan.emoji || '💪'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{plan.name}</div>
            <div className="text-sm text-muted-foreground">
              Week {currentWeek} of {totalWeeks} · {workoutsPerWeek} workouts/week
            </div>
          </div>
        </div>

        {/* Today's workout preview */}
        {todaysWorkout && !todaysWorkout.isRestDay && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              Today's Workout
            </div>
            <p className="text-sm font-medium">{todaysWorkout.name}</p>
            {todaysWorkout.exercises && todaysWorkout.exercises.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {todaysWorkout.exercises.length} exercise
                {todaysWorkout.exercises.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {todaysWorkout?.isRestDay && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              Today
            </div>
            <p className="text-sm text-muted-foreground">Rest day</p>
          </div>
        )}

        {/* View plan button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewPlan}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Full Plan
        </Button>
      </CardContent>
    </Card>
  );
}
