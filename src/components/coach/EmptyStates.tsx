import { Button } from '@/components/ui/button';

export function EmptyStateNoClients() {
  return (
    <div className="text-center py-10 sm:py-12 space-y-3 sm:space-y-4 px-4">
      <div className="text-5xl sm:text-6xl select-none animate-bounce-once">👥</div>
      <h2 className="text-lg sm:text-xl font-bold tracking-tight antialiased">No clients yet</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto antialiased">
        Invite your first client to get started.
      </p>
      <Button variant="default" size="sm" className="active:scale-[0.96] transition-transform duration-150">
        + Invite Client
      </Button>
    </div>
  );
}

export function EmptyStateNoneNeedAttention() {
  return (
    <div className="p-6 sm:p-8 text-center bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
      <div className="text-3xl select-none mb-2">🎯</div>
      <h3 className="text-base sm:text-lg font-bold antialiased">
        All clients are on track!
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs mx-auto antialiased">
        Great work staying connected with everyone.
      </p>
    </div>
  );
}

export function EmptyStateAllNeedAttention() {
  return (
    <div className="p-6 sm:p-8 text-center bg-warning/5 rounded-xl">
      <div className="text-3xl select-none mb-2">⚡</div>
      <h3 className="text-base sm:text-lg font-bold antialiased">
        All clients need attention
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs mx-auto antialiased">
        Review the list above to catch up with your clients.
      </p>
    </div>
  );
}
