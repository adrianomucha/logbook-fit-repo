import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WorkoutExercise } from '@logbook/shared/types/api';
import {
  formatExercisePrescription,
  formatLastCompact,
  getCompletedSetsCount,
  isExerciseComplete,
  isSetCompleted,
  parseTargetReps,
  parseTargetSeconds,
  parseTargetWeight,
} from '@logbook/shared/workout-execution';
import { Eyebrow } from '@/components/ui';
import { SET_COLS, SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  /** "4" standalone, "4A"/"4B" inside a superset */
  exerciseLabel: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSet: (workoutExerciseId: string, setNumber: number) => void;
  onUpdateSet: (workoutExerciseId: string, setNumber: number, patch: { actualReps?: number; actualWeight?: number }) => void;
  onToggleFlag: () => void;
  onUpdateFlagNote: (note: string) => void;
  onMessageCoach: () => void;
  isReadOnly?: boolean;
}

/** One exercise: the row that expands into coach note, flag, and the set table — the web's ExerciseCard. */
export function ExerciseCard({
  exercise,
  exerciseLabel,
  isExpanded,
  onToggleExpand,
  onToggleSet,
  onUpdateSet,
  onToggleFlag,
  onUpdateFlagNote,
  onMessageCoach,
  isReadOnly = false,
}: ExerciseCardProps) {
  const isComplete = isExerciseComplete(exercise);
  const completedSets = getCompletedSetsCount(exercise);
  const isFlagged = !!exercise.flag;
  const flagNote = exercise.flag?.note ?? '';
  const displayLabel = exerciseLabel.replace(/^\d+/, (n) => n.padStart(2, '0'));
  const prescription = formatExercisePrescription(exercise);
  const isTime = exercise.trackingType === 'TIME';
  const setNumbers = Array.from({ length: exercise.sets }, (_, i) => i + 1);

  // The countdown lives under the next set still to be done. One timer per
  // exercise keeps a 3-set plank from stacking three stopwatches, and the
  // timer moves down on its own as each set completes.
  const nextSetNumber = isTime ? setNumbers.find((n) => !isSetCompleted(exercise.setCompletions, n)) : undefined;

  // Toggle every set in one go — completing also persists actuals per set,
  // exactly like a per-set tap, so bulk-completed exercises still log data.
  const toggleAll = () => {
    if (isReadOnly) return;
    const targets = isComplete
      ? setNumbers.filter((n) => isSetCompleted(exercise.setCompletions, n))
      : setNumbers.filter((n) => !isSetCompleted(exercise.setCompletions, n));
    for (const setNumber of targets) {
      if (!isComplete) {
        const sc = exercise.setCompletions.find((s) => s.setNumber === setNumber);
        const reps =
          sc?.actualReps ??
          (isTime ? parseTargetSeconds(exercise.reps ?? undefined) : parseTargetReps(exercise.reps ?? undefined));
        const weight = sc?.actualWeight ?? parseTargetWeight(exercise.weight ?? undefined);
        const patch: { actualReps?: number; actualWeight?: number } = {};
        if (reps != null) patch.actualReps = reps;
        if (weight != null) patch.actualWeight = weight;
        if (Object.keys(patch).length > 0) onUpdateSet(exercise.workoutExerciseId, setNumber, patch);
      }
      onToggleSet(exercise.workoutExerciseId, setNumber);
    }
  };

  return (
    <View>
      <View className="min-h-[56px] flex-row items-center gap-3.5">
        <Pressable
          onPress={onToggleExpand}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          className="flex-1 flex-row items-center gap-3.5 rounded-lg py-2.5 active:bg-muted/30"
        >
          <Text
            className={`w-7 text-right font-mono-medium text-[11px] ${isComplete ? 'text-success' : 'text-muted-foreground'}`}
          >
            {displayLabel}
          </Text>
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`shrink font-sans-semibold text-[15px] tracking-tight ${isComplete ? 'text-muted-foreground' : 'text-foreground'}`}
                numberOfLines={1}
              >
                {exercise.exercise.name}
              </Text>
              {isFlagged ? <View className="h-1.5 w-1.5 rounded-full bg-warning" /> : null}
            </View>
            <Text className="font-mono text-xs text-muted-foreground">
              {prescription}
              {completedSets > 0 && !isComplete ? (
                <Text className="font-mono-bold text-success">{`  ${completedSets}/${exercise.sets}`}</Text>
              ) : null}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={toggleAll}
          disabled={isReadOnly}
          accessibilityRole="button"
          accessibilityState={{ checked: isComplete }}
          accessibilityLabel={isComplete ? 'Mark all sets incomplete' : 'Mark all sets complete'}
          hitSlop={8}
          className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
            isComplete ? 'border-success bg-success' : 'border-foreground/15 bg-transparent'
          }`}
        >
          {isComplete ? <Feather name="check" size={16} color="#fafafa" /> : null}
        </Pressable>
      </View>

      {isExpanded ? (
        <View className="gap-3.5 pb-4 pl-[42px] pr-1 pt-1.5">
          {exercise.coachNotes ? (
            <Text className="border-l-2 border-brand pl-3 font-sans text-sm leading-5 text-foreground/75">
              {exercise.coachNotes}
            </Text>
          ) : null}

          {isFlagged ? (
            <View className="rounded-lg border border-warning/20 bg-warning/5 p-3">
              <View className="mb-2 flex-row items-center gap-2">
                <Feather name="flag" size={16} color="#f59f0a" />
                <Text className="font-sans-medium text-sm text-foreground">Flagged for coach</Text>
              </View>
              {!isReadOnly ? (
                <>
                  <TextInput
                    className="h-11 rounded-lg border border-input bg-background px-3 font-sans text-base text-foreground"
                    placeholder="Sore left shoulder on the last set"
                    placeholderTextColor="#737373"
                    value={flagNote}
                    onChangeText={onUpdateFlagNote}
                    maxLength={200}
                    accessibilityLabel={`Note for your coach about ${exercise.exercise.name}`}
                  />
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="font-mono text-xs text-muted-foreground">{flagNote.length}/200</Text>
                    <View className="flex-row items-center gap-4">
                      <Pressable onPress={onToggleFlag} hitSlop={8} className="min-h-[44px] justify-center">
                        <Text className="font-sans text-sm text-muted-foreground">Remove flag</Text>
                      </Pressable>
                      <Pressable onPress={onMessageCoach} hitSlop={8} className="min-h-[44px] justify-center">
                        <Text className="font-sans-medium text-sm text-primary">Message coach</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : flagNote ? (
                <Text className="font-sans text-sm italic text-foreground">“{flagNote}”</Text>
              ) : null}
            </View>
          ) : null}

          <View>
            <View className="flex-row items-center gap-2 pb-1">
              <Text style={{ width: SET_COLS.set }} className="font-mono text-[10px] uppercase tracking-[1.4px] text-muted-foreground">
                Set
              </Text>
              <Text className="flex-1 font-mono text-[10px] uppercase tracking-[1.4px] text-muted-foreground">Last</Text>
              <Text style={{ width: SET_COLS.weight }} className="text-center font-mono text-[10px] uppercase tracking-[1.4px] text-muted-foreground">
                Weight
              </Text>
              <Text style={{ width: SET_COLS.reps }} className="text-center font-mono text-[10px] uppercase tracking-[1.4px] text-muted-foreground">
                {isTime ? 'Sec' : 'Reps'}
              </Text>
              <View style={{ width: SET_COLS.check }} />
            </View>
            {setNumbers.map((setNumber, idx) => {
              const sc = exercise.setCompletions.find((s) => s.setNumber === setNumber);
              return (
                <SetRow
                  key={`${setNumber}-${exercise.setCompletions.length === 0 ? 'fresh' : 'logged'}`}
                  setNumber={setNumber}
                  trackingType={exercise.trackingType}
                  repsTarget={exercise.reps ?? undefined}
                  weightTarget={exercise.weight ?? undefined}
                  actualReps={sc?.actualReps ?? null}
                  actualWeight={sc?.actualWeight ?? null}
                  previous={exercise.lastPerformance ? formatLastCompact(exercise.lastPerformance, isTime) : undefined}
                  completed={!!sc?.completed}
                  onToggle={() => onToggleSet(exercise.workoutExerciseId, setNumber)}
                  onChangeReps={(reps) => onUpdateSet(exercise.workoutExerciseId, setNumber, { actualReps: reps })}
                  onChangeWeight={(weight) => onUpdateSet(exercise.workoutExerciseId, setNumber, { actualWeight: weight })}
                  isReadOnly={isReadOnly}
                  showDivider={idx > 0}
                  showTimer={setNumber === nextSetNumber}
                />
              );
            })}
          </View>

          {!isFlagged && !isReadOnly ? (
            <Pressable onPress={onToggleFlag} hitSlop={8} className="flex-row items-center gap-1.5 py-2">
              <Feather name="flag" size={14} color="#737373" />
              <Eyebrow>Flag for coach</Eyebrow>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
