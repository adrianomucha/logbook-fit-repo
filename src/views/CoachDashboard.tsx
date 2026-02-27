import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppState, PlanSetupFormData, WorkoutPlan } from '@/types';
import { WeeklyConfidenceStrip } from '@/components/coach/WeeklyConfidenceStrip';
import { ClientsRequiringAction } from '@/components/coach/ClientsRequiringAction';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { PlanTemplateCard } from '@/components/coach/plans/PlanTemplateCard';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckCircle } from 'lucide-react';
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
  const router = useRouter();
  const searchParams = useSearchParams();
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
    const view = searchParams?.get('view');
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
        <div className="fixed top-4 right-4 z-50 bg-success text-success-foreground px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
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

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <CoachNav
          activeTab={viewToNavTab(currentView)}
          unreadCount={totalUnreadMessages}
          onTabChange={(tab) => {
            if (tab === 'clients') {
              router.push('/coach/clients');
            } else {
              setCurrentView(tab as View);
            }
          }}
        />

        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
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
          <div className="space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Plan Templates</h1>
            <section>
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                </span>
                <div className="flex items-center gap-3">
                  {appState.plans.some((p) => p.isTemplate && p.archivedAt) && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-archived"
                        checked={showArchivedTemplates}
                        onCheckedChange={(checked) => setShowArchivedTemplates(!!checked)}
                      />
                      <label
                        htmlFor="show-archived"
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        Show archived
                      </label>
                    </div>
                  )}
                  <button
                    onClick={handleCreateNewPlan}
                    className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors font-medium uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>
              </div>

              {/* Template cards grid */}
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {templates.map((plan, i) => (
                    <div
                      key={plan.id}
                      className="animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'both' }}
                    >
                      <PlanTemplateCard
                        plan={plan}
                        clientCount={getClientCountForTemplate(plan.id)}
                        onEdit={() => setEditingPlanId(plan.id)}
                        onDuplicate={() => handleDuplicateTemplate(plan.id)}
                        onArchive={() => handleArchiveTemplate(plan.id)}
                        onRestore={plan.archivedAt ? () => handleRestoreTemplate(plan.id) : undefined}
                        onDelete={() => setPlanToDelete(plan.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 text-center py-20 space-y-5">
                  <div className="text-5xl select-none">💪</div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold">No templates yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Create your first workout plan template. Assign it to clients later.
                    </p>
                  </div>
                  <Button onClick={handleCreateNewPlan} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Your First Template
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
