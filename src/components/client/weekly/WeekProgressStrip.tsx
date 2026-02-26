import { Progress } from '@/components/ui/progress';

interface WeekProgressStripProps {
  completed: number;
  total: number;
  remaining: number;
  percentage: number;
}

function getVerdict(completed: number, total: number, remaining: number): string {
  if (total === 0) return 'No workouts this week';
  if (completed === total) return 'All done — great week!';
  if (completed === 0 && remaining === total) return 'Fresh week ahead';
  if (completed === 0) return 'Time to get started';
  if (remaining === 0) return `${completed} of ${total} completed`;
  if (remaining === 1) return `${completed} down, 1 to go`;
  return `${completed} down, ${remaining} to go`;
}

export function WeekProgressStrip({
  completed,
  total,
  remaining,
  percentage,
}: WeekProgressStripProps) {
  const verdict = getVerdict(completed, total, remaining);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{verdict}</span>
        <span className="text-muted-foreground tabular-nums">
          {completed}/{total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
