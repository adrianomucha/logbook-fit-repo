import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkoutCompletion, WorkoutPlan } from '@/types';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { parseISO, getWeek, getYear } from 'date-fns';

interface VolumeTrendChartProps {
  completions: WorkoutCompletion[];
  plan: WorkoutPlan;
}

interface WeeklyVolume {
  weekNumber: number;
  weekId: string;
  volume: number;
  workoutCount: number;
}

/**
 * Parse weight string like "145 lbs" or "225lbs" to number
 */
function parseWeight(weightStr?: string): number {
  if (!weightStr) return 0;
  const match = weightStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Parse reps string like "8-10" to average number
 */
function parseReps(repsStr?: string): number {
  if (!repsStr) return 8; // Default assumption
  const rangeMatch = repsStr.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    return (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
  }
  const singleMatch = repsStr.match(/(\d+)/);
  return singleMatch ? parseInt(singleMatch[1]) : 8;
}

export function VolumeTrendChart({ completions, plan }: VolumeTrendChartProps) {
  const weeklyData = useMemo(() => {
    // Group completions by week and calculate volume
    const weekMap = new Map<string, WeeklyVolume>();

    const completedWorkouts = completions.filter(
      (c) => c.status === 'COMPLETED' && c.completedAt
    );

    for (const completion of completedWorkouts) {
      // Find the workout day in the plan to get exercise details
      const week = plan.weeks.find((w) => w.id === completion.weekId);
      const day = week?.days.find((d) => d.id === completion.dayId);

      if (!week || !day) continue;

      const weekKey = week.id;
      const existing = weekMap.get(weekKey) || {
        weekNumber: week.weekNumber,
        weekId: week.id,
        volume: 0,
        workoutCount: 0,
      };

      // Calculate volume for this workout
      // Volume = sum of (sets × reps × weight) for each exercise
      let workoutVolume = 0;
      for (const exercise of day.exercises) {
        const weight = parseWeight(exercise.weight);
        const reps = parseReps(exercise.reps);
        const sets = exercise.sets || 3;
        workoutVolume += sets * reps * weight;
      }

      existing.volume += workoutVolume;
      existing.workoutCount += 1;
      weekMap.set(weekKey, existing);
    }

    // Convert to array and sort by week number
    return Array.from(weekMap.values()).sort(
      (a, b) => a.weekNumber - b.weekNumber
    );
  }, [completions, plan]);

  // Calculate chart dimensions
  const chartWidth = 280;
  const chartHeight = 120;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxVolume = Math.max(...weeklyData.map((d) => d.volume), 1);
  const minWeek = Math.min(...weeklyData.map((d) => d.weekNumber), 1);
  const maxWeek = Math.max(...weeklyData.map((d) => d.weekNumber), 1);
  const weekRange = Math.max(maxWeek - minWeek, 1);

  // Generate points for the line
  const points = weeklyData.map((d) => {
    const x =
      padding.left + ((d.weekNumber - minWeek) / weekRange) * innerWidth;
    const y =
      padding.top + innerHeight - (d.volume / maxVolume) * innerHeight;
    return { x, y, data: d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Format volume for display (e.g., 15000 → "15k")
  const formatVolume = (vol: number) => {
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
    return vol.toString();
  };

  if (weeklyData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Volume Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No workout data yet.</p>
            <p className="text-sm">Complete workouts to see your volume trend.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total volume
  const totalVolume = weeklyData.reduce((sum, d) => sum + d.volume, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Volume Trend
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatVolume(totalVolume)} lbs total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            <g className="text-muted-foreground/30">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={padding.top + innerHeight * (1 - ratio)}
                  y2={padding.top + innerHeight * (1 - ratio)}
                  stroke="currentColor"
                  strokeDasharray={ratio === 0 ? '0' : '2,2'}
                />
              ))}
            </g>

            {/* Y-axis labels */}
            <g className="text-muted-foreground text-[8px]">
              <text
                x={padding.left - 4}
                y={padding.top + 4}
                textAnchor="end"
                fill="currentColor"
              >
                {formatVolume(maxVolume)}
              </text>
              <text
                x={padding.left - 4}
                y={padding.top + innerHeight + 4}
                textAnchor="end"
                fill="currentColor"
              >
                0
              </text>
            </g>

            {/* Line chart */}
            {points.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points */}
            {points.map((point, idx) => (
              <g key={idx}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
                {/* Week label */}
                <text
                  x={point.x}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  className="text-[8px] fill-muted-foreground"
                >
                  W{point.data.weekNumber}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>
            {weeklyData.length} {weeklyData.length === 1 ? 'week' : 'weeks'} of data
          </span>
          <span>•</span>
          <span>
            {weeklyData.reduce((sum, d) => sum + d.workoutCount, 0)} workouts
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
