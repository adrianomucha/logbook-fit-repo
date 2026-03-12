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
    <div className="flex gap-3">
      <div className="flex-1 bg-muted/60 rounded-lg px-3 py-6 text-center">
        <p className="text-2xl font-bold tabular-nums leading-none">{completed}</p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Done</p>
      </div>
      <div className="flex-1 bg-muted/60 rounded-lg px-3 py-6 text-center">
        <p className="text-2xl font-bold tabular-nums leading-none">{remaining}</p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Remaining</p>
      </div>
      <div className="flex-1 bg-muted/60 rounded-lg px-3 py-6 text-center">
        <p className="text-2xl font-bold tabular-nums leading-none">{total}</p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Total</p>
      </div>
    </div>
  );
}
