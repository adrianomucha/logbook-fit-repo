/**
 * Skeleton shown while the client profile JS bundle loads.
 * Mirrors the UnifiedClientProfile layout: back nav, header, tabs, content.
 */
export default function ClientProfileLoading() {
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <div className="h-8 w-20 rounded bg-muted" />

        {/* Client header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-4 w-56 rounded bg-muted" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <div className="h-9 w-24 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
        </div>

        {/* Tab content area */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
