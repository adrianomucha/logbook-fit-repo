/**
 * Skeleton shown while the workout execution JS bundle loads.
 * Mirrors the workout page: header, exercise list with set rows.
 */
export default function WorkoutLoading() {
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4 animate-pulse">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back button + day title */}
        <div className="space-y-2">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>

        {/* Exercise cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-4">
            {/* Exercise name */}
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
            {/* Set rows */}
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted" />
                  <div className="flex-1 h-10 rounded bg-muted" />
                  <div className="w-16 h-10 rounded bg-muted" />
                  <div className="w-10 h-10 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Complete workout button */}
        <div className="h-12 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}
