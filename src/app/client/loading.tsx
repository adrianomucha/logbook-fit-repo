/**
 * Skeleton shown while the client dashboard JS bundle loads.
 * Mirrors the ClientDashboard layout: greeting, today's workout card, progress.
 */
export default function ClientLoading() {
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4 animate-pulse">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Greeting */}
        <div className="space-y-1">
          <div className="h-7 w-40 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </div>

        {/* Today's workout card */}
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-11 w-full rounded-lg bg-muted" />
        </div>

        {/* Progress section */}
        <div className="space-y-3">
          <div className="h-5 w-28 rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
