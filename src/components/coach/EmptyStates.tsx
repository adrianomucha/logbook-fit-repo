import { Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyStateNoClients() {
  return (
    <div className="text-center py-12 space-y-4">
      <Users className="w-16 h-16 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">No clients yet</h2>
      <p className="text-muted-foreground">Invite your first client to get started</p>
      <Button variant="default">
        + Invite Client
      </Button>
    </div>
  );
}

export function EmptyStateNoneNeedAttention() {
  return (
    <div className="p-8 text-center bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
      <h3 className="text-lg font-semibold text-green-900">All clients are on track!</h3>
      <p className="text-sm text-green-700 mt-1">Great work staying connected with everyone.</p>
    </div>
  );
}

export function EmptyStateAllNeedAttention() {
  return (
    <div className="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
      <AlertCircle className="w-12 h-12 mx-auto text-yellow-600 mb-2" />
      <h3 className="text-lg font-semibold text-yellow-900">All clients need attention</h3>
      <p className="text-sm text-yellow-700 mt-1">Review the list above to catch up with your clients.</p>
    </div>
  );
}
