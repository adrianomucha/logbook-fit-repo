import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Copy, Archive, Trash2, RotateCcw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutPlan } from '@/types';

interface PlanTemplateCardProps {
  plan: WorkoutPlan;
  clientCount: number;
  onEdit: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}

export function PlanTemplateCard({
  plan,
  clientCount,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: PlanTemplateCardProps) {
  const isArchived = !!plan.archivedAt;

  return (
    <div
      onClick={onEdit}
      className={cn(
        'group relative cursor-pointer transition-all duration-200',
        'rounded-xl border-2 border-border/80 bg-card overflow-hidden',
        'hover:border-foreground hover:shadow-lg',
        'active:scale-[0.97]',
        isArchived && 'opacity-50 grayscale'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="p-5 sm:p-6">
        {/* Top row: large emoji + actions */}
        <div className="flex items-start justify-between mb-5">
          <div className="text-5xl sm:text-6xl leading-none select-none transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
            {plan.emoji || '💪'}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {(onDuplicate || onArchive || onRestore) && <DropdownMenuSeparator />}
              {isArchived && onRestore ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : onArchive ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Plan name */}
        <h3 className="text-lg sm:text-xl font-bold leading-tight truncate mb-1.5">
          {plan.name}
        </h3>

        {/* Metadata — inline, typographic */}
        <p className="text-xs text-muted-foreground font-medium tabular-nums tracking-wide mb-5">
          {[
            plan.durationWeeks && `${plan.durationWeeks} ${plan.durationWeeks === 1 ? 'wk' : 'wks'}`,
            plan.workoutsPerWeek && `${plan.workoutsPerWeek}x / week`,
            isArchived && 'Archived',
          ].filter(Boolean).join(' \u00B7 ')}
        </p>

        {/* Client count footer */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="font-medium">
              {clientCount === 0
                ? 'No clients'
                : `${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
