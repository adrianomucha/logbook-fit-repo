import { Text, View } from 'react-native';
import type { WorkoutDay } from '@logbook/shared/types';
import { parseSessionName } from '@logbook/shared/parse-session-name';
import { Button, Card, Eyebrow } from '@/components/ui';
import { ExercisePreview } from './ExercisePreview';

interface SessionCardProps {
  workoutDay: WorkoutDay;
  coachName?: string | null;
  state: 'scheduled' | 'in-progress' | 'completed';
  completionPct?: number;
  onAction: () => void;
}

function readableCategories(exercises: WorkoutDay['exercises']): string[] {
  const cats = new Set<string>();
  for (const e of exercises) {
    if (!e.category) continue;
    const readable = e.category
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
    cats.add(readable);
  }
  return Array.from(cats).filter((c) => c.toLowerCase() !== 'other');
}

/** Today's hero: what the session is, how big, and the one button — the web's WorkoutOverview. */
export function SessionCard({ workoutDay, coachName, state, completionPct = 0, onAction }: SessionCardProps) {
  const exercises = workoutDay.exercises;
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const minutes = Math.max(10, Math.round(totalSets * 2));
  const categories = readableCategories(exercises);
  const { day, title, subtitle } = parseSessionName(workoutDay.name || 'Today’s workout');
  const eyebrow = [day ? `Today · Day ${day}` : 'Today’s session', coachName ? `Coach ${coachName.split(' ')[0]}` : null]
    .filter(Boolean)
    .join(' · ');
  const stats: [number, string][] = [
    [minutes, 'min'],
    [exercises.length, exercises.length === 1 ? 'exercise' : 'exercises'],
    [totalSets, 'sets'],
  ];

  return (
    <View className="gap-6">
      <Card>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text className="mt-2.5 font-sans-bold text-[26px] leading-[30px] text-foreground">{title}</Text>
        {subtitle || categories.length > 0 ? (
          <Text className="mt-1.5 font-sans text-[15px] text-muted-foreground">
            {subtitle ?? categories.join(' · ')}
          </Text>
        ) : null}

        <View className="mt-4 flex-row items-baseline border-t border-border/50 pt-4">
          {stats.map(([value, unit], i) => (
            <Text key={unit} className="font-mono text-[13px]">
              {i > 0 ? <Text className="text-muted-foreground/40">{'  ·  '}</Text> : null}
              <Text className="font-mono-semibold text-foreground">{value}</Text>
              <Text className="text-muted-foreground"> {unit}</Text>
            </Text>
          ))}
        </View>

        {workoutDay.description ? (
          <Text className="mt-3 font-sans text-sm leading-5 text-muted-foreground">{workoutDay.description}</Text>
        ) : null}

        {state === 'in-progress' && completionPct > 0 ? (
          <View className="mt-5">
            <View className="mb-1.5 flex-row items-baseline justify-between">
              <Text className="font-mono-bold text-xs text-foreground">{completionPct}%</Text>
              <Eyebrow>complete</Eyebrow>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-muted">
              <View className="h-full rounded-full bg-brand" style={{ width: `${completionPct}%` }} />
            </View>
          </View>
        ) : null}

        {state !== 'completed' ? (
          <Button variant="brand" className="mt-6" onPress={onAction}>
            {state === 'in-progress' ? 'Continue workout' : 'Start workout'}
          </Button>
        ) : null}
      </Card>

      {exercises.length > 0 ? (
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-baseline justify-between border-b border-border/50 px-5 pb-3 pt-4">
            <Eyebrow>Exercises</Eyebrow>
            <Text className="font-mono text-[11px] text-muted-foreground">{exercises.length}</Text>
          </View>
          <View className="px-5">
            <ExercisePreview exercises={exercises} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
