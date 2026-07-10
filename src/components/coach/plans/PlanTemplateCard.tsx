import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Copy, Archive, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avatarColor } from '@/lib/avatar-colors';
import type { WorkoutPlan } from '@/types';

interface PlanTemplateCardProps {
  plan: WorkoutPlan;
  clientCount: number;
  /** Names of clients on this plan — rendered as a mini-avatar stack when provided */
  clientNames?: string[];
  onEdit: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}

const MAX_AVATARS = 3;

/**
 * Plan template row — one line in the grouped Plans list.
 * Emoji + black name on the left, aligned mono stat columns on the right;
 * live templates show the clients on them as a mini-avatar stack.
 */
export function PlanTemplateCard({
  plan,
  clientCount,
  clientNames,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: PlanTemplateCardProps) {
  const isArchived = !!plan.archivedAt;

  const weeksLabel = plan.durationWeeks
    ? `${plan.durationWeeks} ${plan.durationWeeks === 1 ? 'week' : 'weeks'}`
    : null;
  const perWeekLabel = plan.workoutsPerWeek ? `${plan.workoutsPerWeek}×/week` : null;

  return (
    <div
      onClick={onEdit}
      className={cn(
        'group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer transition-colors',
        'hover:bg-muted/50 active:bg-muted/70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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
      {/* Emoji tile */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted/60 flex items-center justify-center text-lg sm:text-xl leading-none select-none shrink-0 group-hover:scale-105 transition-transform duration-150">
        {plan.emoji || '💪'}
      </div>

      {/* Name; stats collapse into a meta line under it on mobile */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-[15px] font-black tracking-tight leading-tight truncate antialiased group-hover:translate-x-0.5 transition-transform duration-150">
          {plan.name}
        </h3>
        <p className="sm:hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums mt-0.5 truncate antialiased">
          {[weeksLabel, perWeekLabel].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      {/* Stat columns — fixed widths so they align down the list */}
      <span className="hidden sm:block w-[72px] text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium tabular-nums antialiased shrink-0">
        {weeksLabel || '—'}
      </span>
      <span className="hidden sm:block w-[72px] text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium tabular-nums antialiased shrink-0">
        {perWeekLabel || '—'}
      </span>

      {/* Usage — clients on the plan as a mini-avatar stack, volt dot marks it live */}
      <span className="w-auto sm:w-[84px] flex items-center justify-end shrink-0">
        {clientCount > 0 ? (
          clientNames && clientNames.length > 0 ? (
            <span
              className="relative flex items-center -space-x-1.5"
              title={clientNames.join(', ')}
              aria-label={`${clientCount} ${clientCount === 1 ? 'client' : 'clients'} on this plan: ${clientNames.join(', ')}`}
            >
              {clientNames.slice(0, MAX_AVATARS).map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className={cn(
                    'w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center',
                    'text-[10px] font-bold select-none antialiased',
                    avatarColor(name)
                  )}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              ))}
              {clientNames.length > MAX_AVATARS && (
                <span className="w-6 h-6 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground tabular-nums select-none">
                  +{clientNames.length - MAX_AVATARS}
                </span>
              )}
              {/* volt live-dot on the stack's corner */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand ring-2 ring-card"
                aria-hidden="true"
              />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums antialiased">
              <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25 shrink-0" aria-hidden="true" />
              <span className="font-medium text-foreground">
                {clientCount} {clientCount === 1 ? 'client' : 'clients'}
              </span>
            </span>
          )
        ) : (
          <span className="hidden sm:inline font-mono text-[10px] font-medium text-muted-foreground/50 antialiased">{'—'}</span>
        )}
      </span>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
  );
}
