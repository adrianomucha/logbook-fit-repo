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
    <div className="p-6 sm:p-8 text-center bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl">
      <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-green-600 dark:text-green-500 mb-2" />
      <h3 className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100">
        All clients are on track!
      </h3>
      <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 mt-1 max-w-xs mx-auto">
        Great work staying connected with everyone.
      </p>
    </div>
  );
}

export function EmptyStateAllNeedAttention() {
  return (
    <div className="p-6 sm:p-8 text-center bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-xl">
      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-yellow-600 dark:text-yellow-500 mb-2" />
      <h3 className="text-base sm:text-lg font-semibold text-yellow-900 dark:text-yellow-100">
        All clients need attention
      </h3>
      <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 mt-1 max-w-xs mx-auto">
        Review the list above to catch up with your clients.
      </p>
    </div>
  );
}
