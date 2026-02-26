import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { format } from 'date-fns';

interface DayCardProps {
  day: WeekDayInfo;
  onClick?: () => void;
}

export function DayCard({ day, onClick }: DayCardProps) {
  const { date, dayOfWeek, workoutDay, status, isInteractive } = day;

  // Get status-specific styles following PRD visual specifications
  const getStatusStyles = () => {
    switch (status) {
      case 'TODAY':
        return {
          card: cn(
            'border-info border-2',
            'shadow-lg shadow-info/10',
            'ring-2 ring-info/10',
            'cursor-pointer hover:shadow-xl hover:shadow-info/15',
            'transition-all'
          ),
          badge: 'bg-info text-info-foreground',
          badgeText: 'Today',
        };
      case 'COMPLETED':
        return {
          card: cn(
            'bg-success/5',
            'border-success/20',
            'cursor-pointer hover:bg-success/10',
            'transition-colors'
          ),
          badge: 'bg-success text-success-foreground',
          badgeText: 'Done',
        };
      case 'UPCOMING':
        return {
          card: 'opacity-55 pointer-events-none',
          badge: null,
          badgeText: null,
        };
      case 'MISSED':
        return {
          card: 'cursor-pointer hover:bg-muted/50 transition-colors',
          badge: 'bg-muted-foreground text-background',
          badgeText: 'Missed',
        };
      case 'REST':
        return {
          card: 'border-dashed border-muted-foreground/30 opacity-60',
          badge: 'bg-muted text-muted-foreground',
          badgeText: 'Rest',
        };
      default:
        return {
          card: '',
          badge: null,
          badgeText: null,
        };
    }
  };

  const styles = getStatusStyles();
  const exerciseCount = workoutDay?.exercises?.length || 0;

  const handleClick = () => {
    if (isInteractive && onClick) {
      onClick();
    }
  };

  return (
    <Card
      className={cn('transition-all', styles.card)}
      onClick={handleClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Day info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{dayOfWeek}</span>
              <span className="text-xs text-muted-foreground">
                {format(date, 'MMM d')}
              </span>
            </div>

            {status === 'REST' ? (
              <p className="text-sm text-muted-foreground">Rest day</p>
            ) : (
              <>
                <p className="font-medium text-sm truncate">
                  {workoutDay?.name || 'Workout'}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Dumbbell className="w-3 h-3" />
                  <span>{exerciseCount} exercises</span>
                </div>
              </>
            )}
          </div>

          {/* Right: Status badge or checkmark */}
          <div className="flex-shrink-0">
            {status === 'COMPLETED' ? (
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <Check className="w-4 h-4 text-success-foreground" />
              </div>
            ) : styles.badgeText ? (
              <Badge variant="secondary" className={cn('text-xs', styles.badge)}>
                {styles.badgeText}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
