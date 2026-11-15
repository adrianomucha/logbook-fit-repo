import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PlanTemplateCard } from './PlanTemplateCard';
import type { WorkoutPlan } from '@/types';
import { NO_MATCH_COPY } from '@logbook/shared/state-copy';
import { StateView } from '@/components/states/StateView';

interface PlanTemplateListProps {
  templates: WorkoutPlan[];
  getClientCount: (planId: string) => number;
  /** Clients on a plan — rendered as a mini-avatar stack on live rows */
  getClients?: (planId: string) => { name: string; avatarUrl: string | null }[];
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
}

const cardEdge =
  'border border-border/70';

/** Search appears once the list is big enough that scrolling stops being enough */
const SEARCH_THRESHOLD = 8;

const byUpdatedDesc = (a: WorkoutPlan, b: WorkoutPlan) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

/**
 * Grouped Plans list: live templates first, then unassigned drafts.
 * Rows over cards: aligned mono stat
 * columns scan straight down, matching the app's logbook voice.
 */
export function PlanTemplateList({
  templates,
  getClientCount,
  getClients,
  onEdit,
  onDelete,
}: PlanTemplateListProps) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = (t: WorkoutPlan) => !q || t.name.toLowerCase().includes(q);

  const sections = [
    {
      key: 'in-use',
      label: 'In use',
      plans: templates
        .filter((t) => getClientCount(t.id) > 0 && matches(t))
        // Busiest plans first; recently touched breaks ties
        .sort((a, b) => getClientCount(b.id) - getClientCount(a.id) || byUpdatedDesc(a, b)),
    },
    {
      key: 'drafts',
      label: 'Not assigned',
      plans: templates
        .filter((t) => getClientCount(t.id) === 0 && matches(t))
        .sort(byUpdatedDesc),
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
        <StateView size="sm" art={NO_MATCH_COPY.art} title={NO_MATCH_COPY.title(query.trim())} tail={NO_MATCH_COPY.plans}>
          <button
            onClick={() => setQuery('')}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors tap-target"
          >
            {NO_MATCH_COPY.clear}
          </button>
        </StateView>
      )}

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

            <div className={`bg-card rounded-2xl divide-y divide-border/50 overflow-hidden ${cardEdge}`}>
              {section.plans.map((plan) => (
                <PlanTemplateCard
                  key={plan.id}
                  plan={plan}
                  clientCount={getClientCount(plan.id)}
                  clients={getClients?.(plan.id)}
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
