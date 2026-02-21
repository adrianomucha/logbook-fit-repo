import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppState, PlanSetupFormData, WorkoutPlan } from '@/types';
import { WeeklyConfidenceStrip } from '@/components/coach/WeeklyConfidenceStrip';
import { ClientsRequiringAction } from '@/components/coach/ClientsRequiringAction';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { PlanTemplateCard } from '@/components/coach/plans/PlanTemplateCard';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dumbbell, Plus, CheckCircle } from 'lucide-react';
import { CoachNav, CoachNavTab } from '@/components/coach/CoachNav';
import { generatePlanStructure, deepCopyPlan } from '@/lib/plan-generator';

interface CoachDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'dashboard' | 'plans';

// Map View to CoachNavTab (clients is separate page)
const viewToNavTab = (view: View): CoachNavTab => view;

export function CoachDashboard({ appState, onUpdateState }: CoachDashboardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // Get plan being edited
  const editingPlan = appState.plans.find((p) => p.id === editingPlanId);

  // Filter templates (not instances, optionally include archived)
  const templates = useMemo(() => {
    return appState.plans.filter((p) => {
      if (!p.isTemplate) return false;
      if (!showArchivedTemplates && p.archivedAt) return false;
      return true;
    });
  }, [appState.plans, showArchivedTemplates]);

  // Count clients using each template
  // First check for plan instances forked from this template, then also count
  // clients directly assigned to this template (for backward compatibility)
  const getClientCountForTemplate = (templateId: string) => {
    // Count plan instances forked from this template
    const instanceCount = appState.plans.filter(
      (p) => !p.isTemplate && p.sourceTemplateId === templateId && !p.archivedAt
    ).length;

    // Also count clients directly assigned to this template (legacy/demo data)
    const directlyAssignedCount = appState.clients.filter(
      (c) => c.currentPlanId === templateId
    ).length;

    return instanceCount + directlyAssignedCount;
  };

  // Get plan name for delete confirmation
  const planToDeleteName = useMemo(() => {
    if (!planToDelete) return '';
    return appState.plans.find((p) => p.id === planToDelete)?.name || '';
  }, [appState.plans, planToDelete]);

  // Calculate total unread messages from all clients
  const totalUnreadMessages = useMemo(() => {
    const coachClientIds = appState.clients.map((c) => c.id);
    return appState.messages.filter(
      (m) => coachClientIds.includes(m.senderId) && !m.read
    ).length;
  }, [appState.clients, appState.messages]);

  // Handle view query parameter
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'plans') {
      setCurrentView('plans');
    }
  }, [searchParams]);

  const handleUpdatePlan = (updatedPlan: WorkoutPlan) => {
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    }));
  };

  const handleCreateNewPlan = () => {
    setShowPlanSetupModal(true);
  };

  const handlePlanCreated = (formData: PlanSetupFormData) => {
    const newPlan = generatePlanStructure(formData);

    onUpdateState((state) => ({
      ...state,
      plans: [...state.plans, newPlan],
    }));

    setShowPlanSetupModal(false);

    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleDuplicateTemplate = (templateId: string) => {
    const source = appState.plans.find((p) => p.id === templateId);
    if (!source) return;

    const newTemplate = deepCopyPlan(source, { makeInstance: false });
    onUpdateState((state) => ({
      ...state,
      plans: [...state.plans, newTemplate],
    }));

    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleArchiveTemplate = (templateId: string) => {
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.map((p) =>
        p.id === templateId
          ? { ...p, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  };

  const handleRestoreTemplate = (templateId: string) => {
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.map((p) =>
        p.id === templateId
          ? { ...p, archivedAt: undefined, updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  };

  const handleDeleteTemplate = () => {
    if (!planToDelete) return;
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.filter((p) => p.id !== planToDelete),
    }));
    setPlanToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium text-sm sm:text-base">Plan created!</span>
        </div>
      )}

      {/* Plan Setup Modal */}
      <PlanSetupModal
        isOpen={showPlanSetupModal}
        onClose={() => setShowPlanSetupModal(false)}
        onSubmit={handlePlanCreated}
      />

      {/* Delete Template Confirmation */}
      <ConfirmationModal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        message={`Are you sure you want to delete "${planToDeleteName}"?`}
        warningMessage="This action cannot be undone. Client plans created from this template will not be affected."
        confirmLabel="Delete"
        confirmVariant="destructive"
      />

      {/* Plan Editor Drawer */}
      {editingPlan && (
        <PlanEditorDrawer
          open={!!editingPlanId}
          onOpenChange={(open) => !open && setEditingPlanId(null)}
          plan={editingPlan}
          onUpdatePlan={handleUpdatePlan}
          appState={appState}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        <CoachNav
          activeTab={viewToNavTab(currentView)}
          unreadCount={totalUnreadMessages}
          onTabChange={(tab) => {
            if (tab === 'clients') {
              navigate('/coach/clients');
            } else {
              setCurrentView(tab as View);
            }
          }}
        />

        {currentView === 'dashboard' && (
          <div className="space-y-4">
            <WeeklyConfidenceStrip
              clients={appState.clients}
              checkIns={appState.checkIns}
            />
            <ClientsRequiringAction
              clients={appState.clients}
              messages={appState.messages}
              checkIns={appState.checkIns}
              completedWorkouts={appState.completedWorkouts}
              plans={appState.plans}
              onSelectClient={() => {}}
            />
          </div>
        )}

        {currentView === 'plans' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Plan Templates</h2>
                <p className="text-sm text-muted-foreground">
                  Create and manage workout plan templates. Assign them to clients to create personalized copies.
                </p>
              </div>
              <Button onClick={handleCreateNewPlan} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>

            {/* Include Archived Toggle */}
            {appState.plans.some((p) => p.isTemplate && p.archivedAt) && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-archived"
                  checked={showArchivedTemplates}
                  onCheckedChange={(checked) => setShowArchivedTemplates(!!checked)}
                />
                <label
                  htmlFor="show-archived"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Show archived templates
                </label>
              </div>
            )}

            {/* Template Cards Grid */}
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((plan) => (
                  <PlanTemplateCard
                    key={plan.id}
                    plan={plan}
                    clientCount={getClientCountForTemplate(plan.id)}
                    onEdit={() => setEditingPlanId(plan.id)}
                    onDuplicate={() => handleDuplicateTemplate(plan.id)}
                    onArchive={() => handleArchiveTemplate(plan.id)}
                    onRestore={plan.archivedAt ? () => handleRestoreTemplate(plan.id) : undefined}
                    onDelete={() => setPlanToDelete(plan.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4 border rounded-lg bg-white">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">No templates yet</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Create your first workout plan template. You can assign it to clients later.
                  </p>
                </div>
                <Button onClick={handleCreateNewPlan} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Template
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
