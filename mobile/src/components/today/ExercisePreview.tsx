import { Text, View } from 'react-native';
import type { Exercise } from '@logbook/shared/types';
import { groupBySuperset, isSuperset } from '@logbook/shared/superset';
import { Eyebrow } from '@/components/ui';

function prescription(exercise: Exercise): string {
  return exercise.reps ? `${exercise.sets}×${exercise.reps}` : `${exercise.sets}s`;
}

function Row({ exercise, label, last }: { exercise: Exercise; label: string; last: boolean }) {
  return (
    <View className={`flex-row items-center gap-3.5 py-3.5 ${last ? '' : 'border-b border-border/50'}`}>
      <Text className="w-7 text-right font-mono-medium text-[11px] text-muted-foreground">{label}</Text>
      <View className="flex-1">
        <Text className="font-sans-semibold text-[15px] text-foreground" numberOfLines={1}>
          {exercise.name}
        </Text>
        {exercise.notes ? (
          <Text className="mt-0.5 font-sans text-xs text-muted-foreground" numberOfLines={1}>
            {exercise.notes}
          </Text>
        ) : null}
      </View>
      <Text className="font-mono-medium text-xs text-muted-foreground">{prescription(exercise)}</Text>
    </View>
  );
}

/** The day's exercises, supersets bracketed together — mirrors the web's ExercisePreviewList. */
export function ExercisePreview({ exercises }: { exercises: Exercise[] }) {
  const groups = groupBySuperset(exercises);
  return (
    <View>
      {groups.map((group, gi) => {
        const number = String(gi + 1).padStart(2, '0');
        const last = gi === groups.length - 1;
        if (!isSuperset(group)) {
          return <Row key={group[0].id} exercise={group[0]} label={number} last={last} />;
        }
        return (
          <View key={group[0].id} className={`py-3.5 ${last ? '' : 'border-b border-border/50'}`}>
            <Eyebrow className="mb-2">Superset</Eyebrow>
            <View className="border-l-2 border-brand/60 pl-3">
              {group.map((exercise, mi) => (
                <Row
                  key={exercise.id}
                  exercise={exercise}
                  label={`${number}${String.fromCharCode(65 + mi)}`}
                  last={mi === group.length - 1}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
