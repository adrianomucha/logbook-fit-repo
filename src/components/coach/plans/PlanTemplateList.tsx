import { PlanTemplateCard } from './PlanTemplateCard';
import type { WorkoutPlan } from '@/types';

interface PlanTemplateListProps {
  templates: WorkoutPlan[];
  getClientCount: (planId: string) => number;
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
}

const cardShadow =
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

/**
 * Grouped Plans list — live templates first (volt dots), then unassigned
 * drafts, archived collapsed to the bottom. Rows over cards: aligned mono
 * stat columns scan straight down, matching the app's logbook voice.
 */
export function PlanTemplateList({
  templates,
  getClientCount,
  onEdit,
  onDelete,
}: PlanTemplateListProps) {
  const sections = [
    {
      key: 'in-use',
      label: 'In use',
      plans: templates.filter((t) => !t.archivedAt && getClientCount(t.id) > 0),
    },
    {
      key: 'drafts',
      label: 'Not assigned',
      plans: templates.filter((t) => !t.archivedAt && getClientCount(t.id) === 0),
    },
    {
      key: 'archived',
      label: 'Archived',
      plans: templates.filter((t) => !!t.archivedAt),
    },
  ].filter((s) => s.plans.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section, si) => (
        <section
          key={section.key}
          className="animate-enter"
          style={{ animationDelay: `${si * 60}ms` }}
        >
          <div className="flex items-baseline justify-between px-1 mb-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium antialiased">
              {section.label}
            </h2>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70 antialiased">
              {section.plans.length}
            </span>
          </div>
          <div className={`bg-card rounded-xl divide-y divide-border overflow-hidden ${cardShadow}`}>
            {section.plans.map((plan) => (
              <PlanTemplateCard
                key={plan.id}
                plan={plan}
                clientCount={getClientCount(plan.id)}
                onEdit={() => onEdit(plan.id)}
                onDelete={() => onDelete(plan.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
