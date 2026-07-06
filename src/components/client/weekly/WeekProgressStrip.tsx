interface WeekProgressStripProps {
  completed: number;
  total: number;
  remaining: number;
  percentage: number;
}

export function WeekProgressStrip({
  completed,
  total,
  remaining,
}: WeekProgressStripProps) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tabular-nums leading-none">
            {completed}
          </span>
          <span className="font-mono text-sm text-muted-foreground/60 font-bold tabular-nums leading-none">
            / {total}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground ml-1">
            done
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
          {remaining} to go
        </span>
      </div>
      <div className="flex gap-1.5" role="img" aria-label={`${completed} of ${total} workouts completed`}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-full transition-colors ${
              i < completed ? 'bg-brand' : 'bg-muted-foreground/15'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
