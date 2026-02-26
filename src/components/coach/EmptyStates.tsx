import { Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyStateNoClients() {
  return (
    <div className="text-center py-10 sm:py-12 space-y-3 sm:space-y-4 px-4">
      <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground" />
      <h2 className="text-lg sm:text-xl font-semibold">No clients yet</h2>
      <p className="text-sm sm:text-base text-muted-foreground max-w-xs mx-auto">
        Invite your first client to get started
      </p>
      <Button variant="default" size="sm" className="sm:size-default">
        + Invite Client
      </Button>
    </div>
  );
}

export function EmptyStateNoneNeedAttention() {
  return (
    <div className="p-6 sm:p-8 text-center bg-success/5 border border-success/20 rounded-xl">
      <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-success mb-2" />
      <h3 className="text-base sm:text-lg font-semibold">
        All clients are on track!
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Great work staying connected with everyone.
      </p>
    </div>
  );
}

export function EmptyStateAllNeedAttention() {
  return (
    <div className="p-6 sm:p-8 text-center bg-warning/5 border border-warning/20 rounded-xl">
      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-warning mb-2" />
      <h3 className="text-base sm:text-lg font-semibold">
        All clients need attention
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Review the list above to catch up with your clients.
      </p>
    </div>
  );
}
