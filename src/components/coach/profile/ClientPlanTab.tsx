import { useState } from 'react';
import { Client, WorkoutPlan, AppState } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanBuilder } from '@/components/coach/PlanBuilder';
import { AssignPlanModal } from '@/components/coach/AssignPlanModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Plus, ChevronDown, ArrowRightLeft, Trash2, ClipboardList } from 'lucide-react';

interface ClientPlanTabProps {
  client: Client;
  plan?: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  onCreatePlan: () => void;
  onAssignPlan: (planId: string) => void;
  onUnassignPlan: () => void;
  appState: AppState;
}

export function ClientPlanTab({
  client,
  plan,
  onUpdatePlan,
  onCreatePlan,
  onAssignPlan,
  onUnassignPlan,
  appState
}: ClientPlanTabProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // No plan assigned - show empty state with create and assign buttons
  if (!plan) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Workout Plan Assigned</h3>
            <p className="text-muted-foreground mb-4">
              Create a new workout plan or assign an existing one for {client.name}.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setShowAssignModal(true)}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Assign Existing Plan
              </Button>
              <Button onClick={onCreatePlan}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        <AssignPlanModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssign={(planId) => {
            onAssignPlan(planId);
            setShowAssignModal(false);
          }}
          plans={appState.plans}
          currentPlanId={client.currentPlanId}
        />
      </>
    );
  }

  // Plan exists - show management header + PlanBuilder
  return (
    <>
      <div className="space-y-4">
        {/* Plan management header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <span className="text-xl shrink-0">{plan.emoji || '💪'}</span>
            <h3 className="text-lg font-semibold truncate">{plan.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Manage Plan
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSwitchModal(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Switch to Different Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowRemoveConfirm(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Plan from Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <PlanBuilder plan={plan} onUpdatePlan={onUpdatePlan} appState={appState} />
      </div>

      {/* Switch plan modal */}
      <AssignPlanModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        onAssign={(planId) => {
          onAssignPlan(planId);
          setShowSwitchModal(false);
        }}
        plans={appState.plans}
        currentPlanId={client.currentPlanId}
      />

      {/* Remove plan confirmation */}
      <ConfirmationModal
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={() => {
          onUnassignPlan();
          setShowRemoveConfirm(false);
        }}
        title="Remove Plan"
        message={`Are you sure you want to remove "${plan.name}" from ${client.name}?`}
        warningMessage="The plan itself won't be deleted, but the client will no longer have an assigned workout plan."
        confirmLabel="Remove Plan"
        confirmVariant="destructive"
      />
    </>
  );
}
