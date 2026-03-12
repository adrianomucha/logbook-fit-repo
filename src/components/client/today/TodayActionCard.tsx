import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Play, RotateCcw, Check, MessageSquare, Dumbbell, Coffee } from 'lucide-react';

export type ActionState = 'scheduled' | 'in-progress' | 'completed' | 'rest';

interface TodayActionCardProps {
  state: ActionState;
  workoutName?: string;
  exerciseCount?: number;
  completionPct?: number;
  onAction: () => void;
  /** Hide the call-to-action button (e.g. when feedback already sent) */
  hideCta?: boolean;
}

export function TodayActionCard({
  state,
  workoutName,
  exerciseCount,
  completionPct = 0,
  onAction,
  hideCta,
}: TodayActionCardProps) {
  const renderContent = () => {
    switch (state) {
      case 'scheduled':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-info" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate">{workoutName || 'Today\'s Workout'}</h3>
                {exerciseCount !== undefined && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{exerciseCount} exercises</p>
                )}
              </div>
            </div>
            <Button
              onClick={onAction}
              className="w-full bg-info hover:bg-info/90 text-info-foreground"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Workout
            </Button>
          </>
        );

      case 'in-progress':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{workoutName || 'Today\'s Workout'}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{completionPct}% complete</p>
              </div>
            </div>
            <Progress value={completionPct} className="mb-4 h-2" />
            <Button
              onClick={onAction}
              className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Resume Workout
            </Button>
          </>
        );

      case 'completed':
        return (
          <>
            <div className={cn("flex items-center gap-4", !hideCta && "mb-5")}>
              <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center shrink-0 animate-[completionPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]">
                <Check className="w-7 h-7 text-success stroke-[3]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xl tracking-tight">Done.</h3>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {workoutName || 'Workout completed'}
                </p>
              </div>
            </div>
            {!hideCta && (
              <Button
                onClick={onAction}
                variant="outline"
                className="w-full border-success/30 text-success hover:bg-success/5"
                size="lg"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Send Feedback to Coach
              </Button>
            )}
          </>
        );

      case 'rest':
        return (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Coffee className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-xl tracking-tight">Rest Day</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Recovery &amp; mobility</p>
              </div>
            </div>
            <Button
              onClick={onAction}
              variant="ghost"
              className="w-full"
              size="lg"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Message Coach
            </Button>
          </>
        );
    }
  };

  return (
    <Card className={cn(
      'transition-[color,background-color,border-color,box-shadow]',
      state === 'scheduled' && 'border-info/20 shadow-md shadow-info/5',
      state === 'in-progress' && 'border-warning/20 shadow-md shadow-warning/5',
      state === 'completed' && 'border-success/20 bg-success/[0.03]',
      state === 'rest' && 'border-border'
    )}>
      <CardContent className="p-5 sm:p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
