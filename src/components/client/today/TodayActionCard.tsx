import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Play, RotateCcw, CheckCircle2, MessageSquare, Dumbbell, Coffee } from 'lucide-react';

export type ActionState = 'scheduled' | 'in-progress' | 'completed' | 'rest';

interface TodayActionCardProps {
  state: ActionState;
  workoutName?: string;
  exerciseCount?: number;
  completionPct?: number;
  onAction: () => void;
}

export function TodayActionCard({
  state,
  workoutName,
  exerciseCount,
  completionPct = 0,
  onAction,
}: TodayActionCardProps) {
  const renderContent = () => {
    switch (state) {
      case 'scheduled':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{workoutName || 'Today\'s Workout'}</h3>
                {exerciseCount !== undefined && (
                  <p className="text-sm text-muted-foreground">{exerciseCount} exercises</p>
                )}
              </div>
            </div>
            <Button
              onClick={onAction}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
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
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{workoutName || 'Today\'s Workout'}</h3>
                <p className="text-sm text-muted-foreground">{completionPct}% complete</p>
              </div>
            </div>
            <Progress value={completionPct} className="mb-4 h-2" />
            <Button
              onClick={onAction}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Great work!</h3>
                <p className="text-sm text-muted-foreground">
                  {workoutName ? `${workoutName} completed` : 'Workout completed'}
                </p>
              </div>
            </div>
            <Button
              onClick={onAction}
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              size="lg"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Send Feedback to Coach
            </Button>
          </>
        );

      case 'rest':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Coffee className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Rest Day</h3>
                <p className="text-sm text-muted-foreground">No workout scheduled today</p>
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
      'transition-all',
      state === 'scheduled' && 'border-teal-200 dark:border-teal-800 shadow-md shadow-teal-100/50 dark:shadow-teal-900/20',
      state === 'in-progress' && 'border-amber-200 dark:border-amber-800 shadow-md shadow-amber-100/50 dark:shadow-amber-900/20',
      state === 'completed' && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
      state === 'rest' && 'border-slate-200 dark:border-slate-700'
    )}>
      <CardContent className="p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
