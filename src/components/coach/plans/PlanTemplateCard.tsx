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
        'rounded-xl bg-card overflow-hidden',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.08)]',
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
      <div className="p-4 sm:p-5">
        {/* Top row: emoji tile + actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-lg bg-muted/60 flex items-center justify-center text-2xl leading-none select-none">
            {plan.emoji || '💪'}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-1 -mt-1 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
        <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate mb-4 antialiased">
          {plan.name}
        </h3>

        {/* Stat blocks — big tabular numbers with mono eyebrow labels */}
        <div className="flex items-end gap-6 mb-4">
          <div>
            <p className="text-xl font-black tabular-nums leading-none antialiased">
              {plan.durationWeeks ?? '\u2014'}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium mt-1 antialiased">
              {plan.durationWeeks === 1 ? 'Week' : 'Weeks'}
            </p>
          </div>
          <div>
            <p className="text-xl font-black tabular-nums leading-none antialiased">
              {plan.workoutsPerWeek ? `${plan.workoutsPerWeek}\u00D7` : '\u2014'}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium mt-1 antialiased">
              Per week
            </p>
          </div>
        </div>

        {/* Footer — volt dot marks plans with clients actively on them */}
        <div className="pt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] antialiased">
            {isArchived ? (
              <span className="font-medium text-muted-foreground/60">Archived</span>
            ) : clientCount > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25 shrink-0" aria-hidden="true" />
                <span className="font-medium text-muted-foreground">
                  {clientCount} {clientCount === 1 ? 'client' : 'clients'} on this plan
                </span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="font-medium text-muted-foreground/60">Not assigned yet</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
