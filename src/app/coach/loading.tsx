/**
 * Skeleton shown while the coach dashboard JS bundle loads.
 * Mirrors the CoachDashboard layout: header, stats strip, client list.
 */
export default function CoachLoading() {
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Nav placeholder */}
        <div className="flex gap-4">
          <div className="h-10 w-24 rounded-lg bg-muted" />
          <div className="h-10 w-24 rounded-lg bg-muted" />
          <div className="h-10 w-24 rounded-lg bg-muted" />
        </div>

        {/* Title */}
        <div className="h-8 w-48 rounded bg-muted" />

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>

        {/* Client list section */}
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 px-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
