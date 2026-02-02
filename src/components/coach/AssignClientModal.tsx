import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { Client, WorkoutPlan } from '@/types';

interface AssignClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (clientId: string) => void;
  clients: Client[];
  plans: WorkoutPlan[];
  currentPlanId: string;
}

export function AssignClientModal({
  isOpen,
  onClose,
  onAssign,
  clients,
  plans,
  currentPlanId,
}: AssignClientModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedClientId(null);
    onClose();
  };

  const handleAssign = () => {
    if (selectedClientId) {
      onAssign(selectedClientId);
      setSelectedClientId(null);
    }
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    return plan ? `${plan.emoji || '💪'} ${plan.name}` : 'Unknown plan';
  };

  if (clients.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Assign Client" maxWidth="md">
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Clients Available</h3>
          <p className="text-muted-foreground">
            There are no clients to assign to this plan.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Client to Plan"
      maxWidth="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedClientId}>
            Assign Client
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {clients.map((client) => {
          const isOnThisPlan = client.currentPlanId === currentPlanId;
          const isOnAnotherPlan = client.currentPlanId && client.currentPlanId !== currentPlanId;
          const isSelected = client.id === selectedClientId;

          return (
            <button
              key={client.id}
              disabled={isOnThisPlan}
              onClick={() => setSelectedClientId(client.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isOnThisPlan
                  ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'bg-primary/5 border-primary ring-1 ring-primary'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{client.avatar || '👤'}</span>
                  <div>
                    <div className="font-medium">{client.name}</div>
                    {isOnThisPlan && (
                      <div className="text-sm text-muted-foreground">Already on this plan</div>
                    )}
                    {isOnAnotherPlan && (
                      <div className="text-sm text-amber-600">
                        Currently on: {getPlanName(client.currentPlanId!)}
                      </div>
                    )}
                    {!client.currentPlanId && (
                      <div className="text-sm text-muted-foreground">No plan assigned</div>
                    )}
                  </div>
                </div>
                {isOnThisPlan && (
                  <Badge variant="secondary">Assigned</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
