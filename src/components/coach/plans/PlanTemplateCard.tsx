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
  onDuplicate: () => void;
  onArchive: () => void;
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
        'rounded-xl border bg-card overflow-hidden',
        'hover:shadow-md hover:border-foreground/20',
        'active:scale-[0.98]',
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
      <div className="p-4 sm:p-5">
        {/* Top row: large emoji + actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl sm:text-5xl leading-none select-none transition-transform duration-200 group-hover:scale-110">
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchived && onRestore ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
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
        <h3 className="text-base sm:text-lg font-bold leading-snug truncate mb-1">
          {plan.name}
        </h3>

        {/* Metadata chips */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          {plan.durationWeeks && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-medium tabular-nums">
              {plan.durationWeeks} {plan.durationWeeks === 1 ? 'wk' : 'wks'}
            </span>
          )}
          {plan.workoutsPerWeek && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-medium tabular-nums">
              {plan.workoutsPerWeek}x&thinsp;/&thinsp;week
            </span>
          )}
          {isArchived && (
            <span className="inline-flex items-center rounded-md bg-destructive/10 text-destructive px-2 py-0.5 font-medium">
              Archived
            </span>
          )}
        </div>

        {/* Client count footer with usage bar */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">
                {clientCount === 0
                  ? 'No clients yet'
                  : `${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`}
              </span>
            </div>
            {clientCount > 0 && (
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(clientCount, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-3 rounded-sm bg-foreground/20"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
