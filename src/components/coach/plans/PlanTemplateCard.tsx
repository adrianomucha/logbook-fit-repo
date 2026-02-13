import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Copy, Archive, Trash2, RotateCcw } from 'lucide-react';
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
    <Card
      className={`group cursor-pointer transition-all hover:shadow-md ${
        isArchived ? 'opacity-60' : ''
      }`}
      onClick={onEdit}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Plan Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="text-2xl shrink-0">{plan.emoji || '💪'}</span>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">
                {plan.durationWeeks} {plan.durationWeeks === 1 ? 'week' : 'weeks'} · {plan.workoutsPerWeek} workouts/week
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {clientCount === 0
                  ? 'Not assigned to any clients'
                  : `Used by ${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchived && onRestore ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
