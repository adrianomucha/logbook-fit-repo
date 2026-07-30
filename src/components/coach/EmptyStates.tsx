import { Button } from '@/components/ui/button';

export function EmptyStateNoClients({ onInvite }: { onInvite?: () => void }) {
  return (
    <div className="text-center py-10 sm:py-12 space-y-3 sm:space-y-4 px-4">
      <div className="text-5xl sm:text-6xl select-none animate-bounce-once">👥</div>
      <h2 className="text-lg sm:text-xl font-bold tracking-tight antialiased">No clients yet</h2>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto antialiased">
        Invite your first client to get started.
      </p>
      <Button variant="default" size="sm" onClick={onInvite} className="active:scale-[0.96] transition-transform duration-150">
        + Invite Client
      </Button>
    </div>
  );
}
