import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PlanTemplateCard } from './PlanTemplateCard';
import type { WorkoutPlan } from '@/types';

interface PlanTemplateListProps {
  templates: WorkoutPlan[];
  getClientCount: (planId: string) => number;
  /** Names of clients on a plan — rendered as a mini-avatar stack on live rows */
  getClientNames?: (planId: string) => string[];
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
}

const cardShadow =
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

/** Search appears once the list is big enough that scrolling stops being enough */
const SEARCH_THRESHOLD = 8;

const byUpdatedDesc = (a: WorkoutPlan, b: WorkoutPlan) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

/**
 * Grouped Plans list — live templates first, then unassigned drafts,
 * archived collapsed at the bottom. Rows over cards: aligned mono stat
 * columns scan straight down, matching the app's logbook voice.
 */
export function PlanTemplateList({
  templates,
  getClientCount,
  getClientNames,
  onEdit,
  onDelete,
}: PlanTemplateListProps) {
  const [query, setQuery] = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = (t: WorkoutPlan) => !q || t.name.toLowerCase().includes(q);

  const sections = [
    {
      key: 'in-use',
      label: 'In use',
      collapsible: false,
      plans: templates
        .filter((t) => !t.archivedAt && getClientCount(t.id) > 0 && matches(t))
        // Busiest plans first; recently touched breaks ties
        .sort((a, b) => getClientCount(b.id) - getClientCount(a.id) || byUpdatedDesc(a, b)),
    },
    {
      key: 'drafts',
      label: 'Not assigned',
      collapsible: false,
      plans: templates
        .filter((t) => !t.archivedAt && getClientCount(t.id) === 0 && matches(t))
        .sort(byUpdatedDesc),
    },
    {
      key: 'archived',
      label: 'Archived',
      collapsible: true,
      plans: templates.filter((t) => !!t.archivedAt && matches(t)).sort(byUpdatedDesc),
    },
  ].filter((s) => s.plans.length > 0);

  const showSearch = templates.length > SEARCH_THRESHOLD || q.length > 0;

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans..."
            aria-label="Search plans"
            className="pl-9"
          />
        </div>
      )}

      {sections.length === 0 && q && (
        <div className="text-center py-12">
          <div className="text-2xl select-none mb-2">🔍</div>
          <p className="text-sm text-muted-foreground antialiased">
            No plans match &ldquo;{query.trim()}&rdquo;
          </p>
        </div>
      )}

      {sections.map((section, si) => {
        // A live search shows its matches everywhere, even in a collapsed section
        const isOpen = !section.collapsible || archivedOpen || q.length > 0;
        return (
          <section
            key={section.key}
            className="animate-enter"
            style={{ animationDelay: `${si * 60}ms` }}
          >
            {section.collapsible ? (
              <button
                onClick={() => setArchivedOpen(!archivedOpen)}
                aria-expanded={isOpen}
                className="w-full flex items-baseline justify-between gap-2 px-1 mb-2 group/header rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground group-hover/header:text-muted-foreground font-medium antialiased transition-colors">
                  <ChevronRight
                    className={cn('w-3 h-3 transition-transform duration-150', isOpen && 'rotate-90')}
                    aria-hidden="true"
                  />
                  {section.label}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground antialiased">
                  {section.plans.length}
                </span>
              </button>
            ) : (
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased">
                  {section.label}
                </h2>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground antialiased">
                  {section.plans.length}
                </span>
              </div>
            )}

            {isOpen && (
              <div className={`bg-card rounded-xl divide-y divide-border overflow-hidden ${cardShadow}`}>
                {section.plans.map((plan) => (
                  <PlanTemplateCard
                    key={plan.id}
                    plan={plan}
                    clientCount={getClientCount(plan.id)}
                    clientNames={getClientNames?.(plan.id)}
                    onEdit={() => onEdit(plan.id)}
                    onDelete={() => onDelete(plan.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
