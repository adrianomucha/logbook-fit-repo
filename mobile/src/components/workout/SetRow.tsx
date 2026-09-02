import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { TrackingType } from '@logbook/shared/reps';
import { parseTargetReps, parseTargetSeconds, parseTargetWeight } from '@logbook/shared/workout-execution';
import { SetTimer } from './SetTimer';

interface SetRowProps {
  setNumber: number;
  trackingType: TrackingType;
  repsTarget?: string | number;
  weightTarget?: string | number;
  actualReps?: number | null;
  actualWeight?: number | null;
  /** Last session's result, compact ("52.5×8") */
  previous?: string;
  completed: boolean;
  onToggle: () => void;
  onChangeReps?: (reps: number) => void;
  onChangeWeight?: (weight: number) => void;
  isReadOnly?: boolean;
  showDivider?: boolean;
  /**
   * Show the countdown under this row. Only meaningful for TIME sets; the
   * exercise card turns it on for the next set still to be done.
   */
  showTimer?: boolean;
}

/** Column widths shared with the header row in ExerciseCard: SET · LAST · WEIGHT · REPS · ✓ */
export const SET_COLS = { set: 28, weight: 68, reps: 56, check: 32 };

/**
 * One set: number, last time, weight, reps, done. Inputs seed from the logged
 * value, then the prescription; marking done persists whatever is shown so
 * the log matches what was lifted even when the default was left untouched.
 */
export function SetRow({
  setNumber,
  trackingType,
  repsTarget,
  weightTarget,
  actualReps,
  actualWeight,
  previous,
  completed,
  onToggle,
  onChangeReps,
  onChangeWeight,
  isReadOnly = false,
  showDivider = false,
  showTimer = false,
}: SetRowProps) {
  const isTime = trackingType === 'TIME';
  const defaultReps = isTime ? parseTargetSeconds(repsTarget) : parseTargetReps(repsTarget);
  const defaultWeight = parseTargetWeight(weightTarget);

  const [reps, setReps] = useState(
    actualReps != null ? String(actualReps) : defaultReps != null ? String(defaultReps) : ''
  );
  const [weight, setWeight] = useState(
    actualWeight != null ? String(actualWeight) : defaultWeight != null ? String(defaultWeight) : ''
  );

  const commitReps = (raw: string) => {
    const v = raw.replace(/[^\d]/g, '');
    setReps(v);
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) onChangeReps?.(n);
  };
  const commitWeight = (raw: string) => {
    const v = raw.replace(/[^\d.]/g, '');
    setWeight(v);
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= 0) onChangeWeight?.(n);
  };

  const toggle = () => {
    if (isReadOnly) return;
    if (!completed) {
      const r = parseInt(reps, 10);
      if (!Number.isNaN(r) && r >= 0) onChangeReps?.(r);
      const w = parseFloat(weight);
      if (!Number.isNaN(w) && w >= 0) onChangeWeight?.(w);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  // Countdown reached zero: the athlete held the full prescription, so log
  // exactly those seconds and tick the set in one go. Bypasses toggle()
  // because that reads the `reps` state, which hasn't re-rendered yet.
  const completeWithSeconds = (seconds: number) => {
    if (isReadOnly || completed) return;
    setReps(String(seconds));
    onChangeReps?.(seconds);
    const w = parseFloat(weight);
    if (!Number.isNaN(w) && w >= 0) onChangeWeight?.(w);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  // Countdown from whatever is in the seconds cell — the athlete can retype
  // it to hold longer or shorter than prescribed — else the prescription.
  const typedSeconds = parseInt(reps, 10);
  const timerTarget = !Number.isNaN(typedSeconds) && typedSeconds > 0 ? typedSeconds : defaultReps;
  const showCountdown = isTime && showTimer && !completed && !isReadOnly;

  const inputClass = `h-11 rounded-lg text-center font-mono-bold text-base ${
    completed ? 'bg-transparent text-muted-foreground' : 'bg-muted/50 text-foreground'
  }`;

  const row = (
    <View className={`h-14 flex-row items-center gap-2 ${showDivider ? 'border-t border-border/30' : ''}`}>
      <Text
        style={{ width: SET_COLS.set }}
        className={`font-mono-bold text-sm ${completed ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        {setNumber}
      </Text>
      <Text className="flex-1 font-mono text-xs text-muted-foreground" numberOfLines={1}>
        {previous || '—'}
      </Text>
      <TextInput
        style={{ width: SET_COLS.weight }}
        className={inputClass}
        value={weight}
        onChangeText={commitWeight}
        placeholder={defaultWeight != null ? String(defaultWeight) : '—'}
        placeholderTextColor="#737373"
        keyboardType="decimal-pad"
        editable={!isReadOnly}
        selectTextOnFocus
        accessibilityLabel={`Set ${setNumber} weight`}
      />
      <TextInput
        style={{ width: SET_COLS.reps }}
        className={inputClass}
        value={reps}
        onChangeText={commitReps}
        placeholder={defaultReps != null ? String(defaultReps) : '—'}
        placeholderTextColor="#737373"
        keyboardType="number-pad"
        editable={!isReadOnly}
        selectTextOnFocus
        accessibilityLabel={`Set ${setNumber} ${isTime ? 'seconds' : 'reps'}`}
      />
      <Pressable
        onPress={toggle}
        disabled={isReadOnly}
        accessibilityRole="button"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={completed ? `Mark set ${setNumber} incomplete` : `Mark set ${setNumber} complete`}
        hitSlop={8}
        style={{ width: SET_COLS.check, height: SET_COLS.check }}
        className={`items-center justify-center rounded-full border-2 active:scale-95 ${
          completed ? 'border-success bg-success' : 'border-foreground/15 bg-transparent'
        }`}
      >
        {completed ? <Feather name="check" size={16} color="#fafafa" /> : null}
      </Pressable>
    </View>
  );

  if (!showCountdown) return row;

  return (
    <View>
      {row}
      <SetTimer
        setNumber={setNumber}
        targetSeconds={timerTarget}
        onFinish={completeWithSeconds}
        onStop={(seconds) => commitReps(String(seconds))}
      />
    </View>
  );
}
