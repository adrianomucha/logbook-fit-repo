import { Progress } from '@/components/ui/progress';

interface WeekProgressStripProps {
  completed: number;
  total: number;
  percentage: number;
}

export function WeekProgressStrip({
  completed,
  total,
  percentage,
}: WeekProgressStripProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">This week</span>
        <span className="font-medium">
          {completed} of {total} workouts
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
