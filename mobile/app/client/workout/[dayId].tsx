import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import type { WorkoutExercise } from '@logbook/shared/types/api';
import { exerciseLabel, groupBySuperset, isSuperset } from '@logbook/shared/superset';
import {
  formatExercisePrescription,
  getCompletedSetsCount,
  getNextIncompleteExerciseId,
  isExerciseComplete,
  stripDayPrefix,
} from '@logbook/shared/workout-execution';
import { apiFetch } from '@/lib/api';
import { useWorkoutExecution } from '@/hooks/useWorkoutExecution';
import { Button, EmptyState, Eyebrow, LoadingScreen } from '@/components/ui';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { FlagMessageSheet } from '@/components/workout/FlagMessageSheet';

const FINISH_BAR_HEIGHT = 56 + 24;

/**
 * Workout execution — the web's ClientWorkoutExecution, one screen: sticky
 * header with progress, the exercise list (expand → set table), flags and
 * "message coach", a finish bar, and the celebration with an effort rating.
 * All the saving logic is in useWorkoutExecution; this file is the chrome.
 */
export default function WorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const {
    day,
    exercises,
    completion,
    completionId,
    isReadOnly,
    stats,
    saveError,
    error,
    isLoading,
    restartWorkout,
    toggleSet,
    updateSet,
    toggleFlag,
    updateFlagNote,
    finishWorkout,
  } = useWorkoutExecution(dayId ?? null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [messageExercise, setMessageExercise] = useState<WorkoutExercise | null>(null);
  const [celebration, setCelebration] = useState<{ exercisesDone: number; exercisesTotal: number; durationMin: number } | null>(null);
  const [isSavingRating, setIsSavingRating] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef<Map<string, number>>(new Map());

  // Auto-expand the first incomplete exercise once. Viewing does not start
  // the workout; the first interaction does.
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (didAutoExpand.current || !day || isReadOnly || exercises.length === 0) return;
    didAutoExpand.current = true;
    setExpandedId(getNextIncompleteExerciseId(exercises) || exercises[0].workoutExerciseId);
  }, [day, exercises, isReadOnly]);

  // Auto-advance: when the exercise being looked at just got completed, open
  // the next incomplete one and bring it into view.
  const completeIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (isReadOnly || exercises.length === 0) return;
    const now = new Set(exercises.filter(isExerciseComplete).map((e) => e.workoutExerciseId));
    if (completeIds.current === null) {
      completeIds.current = now;
      return;
    }
    const prev = completeIds.current;
    completeIds.current = now;
    if (expandedId && now.has(expandedId) && !prev.has(expandedId)) {
      const next = exercises.find((e) => !isExerciseComplete(e));
      if (next) {
        setExpandedId(next.workoutExerciseId);
        const y = cardY.current.get(next.workoutExerciseId);
        if (y != null) setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }), 50);
      } else {
        setExpandedId(null);
      }
    }
  }, [exercises, expandedId, isReadOnly]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/client');
  }, [router]);

  const finishingRef = useRef(false);
  const completeWorkout = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinishing(true);
    const startTime = completion?.startedAt ? new Date(completion.startedAt).getTime() : Date.now();
    const summary = {
      exercisesDone: stats.exercisesDone,
      exercisesTotal: stats.exercisesTotal,
      durationMin: Math.round((Date.now() - startTime) / 60000),
    };
    try {
      await finishWorkout();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCelebration(summary);
    } catch (err) {
      finishingRef.current = false;
      setIsFinishing(false);
      Alert.alert('Not finished yet', err instanceof Error && err.message ? err.message : 'Failed to finish the workout. Try again.');
    }
  }, [completion, stats, finishWorkout]);

  const onFinishPress = () => {
    if (stats.exercisesDone === stats.exercisesTotal) {
      void completeWorkout();
      return;
    }
    Alert.alert(
      'Finish this workout?',
      `You've completed ${stats.exercisesDone} of ${stats.exercisesTotal} exercises. The rest will be logged as skipped.`,
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Finish workout', onPress: () => void completeWorkout() },
      ]
    );
  };

  const onRestartPress = () => {
    Alert.alert('Restart this workout?', "You'll start again from the first set. All progress, flags and notes from this session are cleared.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart workout',
        style: 'destructive',
        onPress: async () => {
          if (isRestarting) return;
          setIsRestarting(true);
          try {
            await restartWorkout();
            didAutoExpand.current = false;
            completeIds.current = null;
            setExpandedId(null);
          } catch {
            Alert.alert("Couldn't restart", 'Please try again.');
          } finally {
            setIsRestarting(false);
          }
        },
      },
    ]);
  };

  const onToggleFlag = async (workoutExerciseId: string) => {
    const ok = await toggleFlag(workoutExerciseId);
    if (!ok) Alert.alert("Couldn't save the flag", 'Please try again.');
  };

  const sendMessage = async (content: string) => {
    if (!messageExercise) return;
    const setsCompleted = getCompletedSetsCount(messageExercise);
    const contextLine = `🚩 ${messageExercise.exercise.name} · ${formatExercisePrescription(messageExercise)} · ${setsCompleted}/${messageExercise.sets} sets done`;
    const flagNote = messageExercise.flag?.note ? `\n“${messageExercise.flag.note}”` : '';
    const question = content.trim() || `I have a question about ${messageExercise.exercise.name}`;
    await apiFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: `${contextLine}${flagNote}\n\n${question}`,
        exerciseReferenceId: messageExercise.workoutExerciseId,
        ...(completionId ? { workoutReferenceId: completionId } : {}),
      }),
    });
    setMessageExercise(null);
  };

  const rateEffort = async (rating: 'EASY' | 'MEDIUM' | 'HARD') => {
    if (isSavingRating) return;
    setIsSavingRating(true);
    if (completionId) {
      try {
        await apiFetch(`/api/client/workout/${completionId}/finish`, {
          method: 'POST',
          body: JSON.stringify({ effortRating: rating }),
        });
      } catch {
        // Non-critical — the rating can be given from Today later
      }
    }
    router.replace('/client');
  };

  if (isLoading) return <LoadingScreen />;

  if (error || !day) {
    return (
      <View className="flex-1 bg-background px-5" style={{ paddingTop: insets.top + 24 }}>
        <EmptyState
          title={error ? "Couldn't load this workout" : 'Workout not found'}
          body={error ? 'Check your connection and try again.' : "This workout doesn't exist in your plan."}
        />
        <Button variant="primary" onPress={goBack}>Go back</Button>
      </View>
    );
  }

  if (celebration) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
        <View className="mb-8 items-center">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-brand">
            <Feather name="check" size={40} color="#1e2702" />
          </View>
          <Eyebrow className="mb-1.5">Session complete</Eyebrow>
          <Text className="text-center font-sans-bold text-2xl tracking-tight text-foreground">{day.name}</Text>
        </View>
        <View className="mb-10 w-full max-w-xs flex-row gap-3">
          <View className="flex-1 items-center rounded-xl bg-muted/60 px-3 py-6">
            <Text className="font-mono-bold text-2xl text-foreground">
              {celebration.exercisesDone}/{celebration.exercisesTotal}
            </Text>
            <Eyebrow className="mt-2">Exercises</Eyebrow>
          </View>
          <View className="flex-1 items-center rounded-xl bg-muted/60 px-3 py-6">
            <Text className="font-mono-bold text-2xl text-foreground">{celebration.durationMin}</Text>
            <Eyebrow className="mt-2">Minutes</Eyebrow>
          </View>
        </View>
        <Eyebrow className="mb-4">How did that feel?</Eyebrow>
        <View className="flex-row gap-3">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
            <Pressable
              key={level}
              onPress={() => void rateEffort(level)}
              disabled={isSavingRating}
              className="min-h-[44px] items-center justify-center rounded-full bg-foreground px-6 py-3.5 active:opacity-80"
            >
              <Text className="font-sans-bold text-sm uppercase tracking-[0.7px] text-background">
                {level === 'EASY' ? 'Easy' : level === 'MEDIUM' ? 'Medium' : 'Hard'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.replace('/client')} disabled={isSavingRating} className="mt-8 min-h-[44px] justify-center px-4">
          <Eyebrow>Skip for now</Eyebrow>
        </Pressable>
      </View>
    );
  }

  const pct = stats.exercisesTotal > 0 ? Math.round((stats.exercisesDone / stats.exercisesTotal) * 100) : 0;
  const eyebrow = [
    day.orderIndex ? `Day ${day.orderIndex}` : null,
    isReadOnly && completion?.completedAt ? format(new Date(completion.completedAt), 'MMM d') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header — the web's WorkoutHeader: back + count row, eyebrow, full title, volt progress bar */}
      <View className="border-b border-border bg-background px-4 pb-4" style={{ paddingTop: insets.top }}>
        <View className="h-12 flex-row items-center justify-between">
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" className="-ml-2 h-11 w-11 items-center justify-center active:opacity-70">
            <Feather name="arrow-left" size={20} color="#0a0a0a" />
          </Pressable>
          <View className="flex-row items-center gap-1">
            {isReadOnly ? (
              <Pressable onPress={onRestartPress} disabled={isRestarting} hitSlop={8} accessibilityRole="button" accessibilityLabel="Restart workout" className="h-10 w-10 items-center justify-center active:opacity-70">
                <Feather name="rotate-ccw" size={18} color="#737373" />
              </Pressable>
            ) : null}
            <Text className="font-mono-bold text-sm text-foreground">
              {stats.exercisesDone}
              <Text className="text-muted-foreground">/{stats.exercisesTotal}</Text>
            </Text>
          </View>
        </View>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text className="mt-1 font-sans-bold text-2xl leading-7 tracking-tight text-foreground">
          {stripDayPrefix(day.name ?? 'Workout')}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Workout progress"
          accessibilityValue={{ min: 0, max: stats.exercisesTotal, now: stats.exercisesDone }}
          className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <View className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </View>
      </View>

      {saveError ? (
        <View className="bg-warning/10 px-4 py-2">
          <Text className="font-sans text-xs text-warning-text">{saveError}</Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: (isReadOnly ? 32 : FINISH_BAR_HEIGHT) + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="mb-1 flex-row items-baseline justify-between px-1">
          <Eyebrow>Exercises</Eyebrow>
          <Text className="font-mono text-[11px] text-muted-foreground">
            {stats.exercisesDone}/{exercises.length}
          </Text>
        </View>
        {groupBySuperset(exercises).map((group, groupIndex) => {
          const card = (exercise: WorkoutExercise, memberIndex: number) => (
            <View key={exercise.workoutExerciseId} onLayout={(e) => cardY.current.set(exercise.workoutExerciseId, e.nativeEvent.layout.y)}>
              <ExerciseCard
                exercise={exercise}
                exerciseLabel={exerciseLabel(groupIndex + 1, memberIndex, group.length)}
                isExpanded={expandedId === exercise.workoutExerciseId}
                onToggleExpand={() => setExpandedId((prev) => (prev === exercise.workoutExerciseId ? null : exercise.workoutExerciseId))}
                onToggleSet={toggleSet}
                onUpdateSet={updateSet}
                onToggleFlag={() => void onToggleFlag(exercise.workoutExerciseId)}
                onUpdateFlagNote={(note) => updateFlagNote(exercise.workoutExerciseId, note)}
                onMessageCoach={() => setMessageExercise(exercise)}
                isReadOnly={isReadOnly}
              />
            </View>
          );
          if (!isSuperset(group)) {
            return (
              <View key={group[0].workoutExerciseId} className="border-b border-border/50 py-1.5">
                {card(group[0], 0)}
              </View>
            );
          }
          return (
            <View key={group[0].workoutExerciseId} className="border-b border-border/50 py-3.5">
              <View className="mb-1 flex-row items-center gap-1.5">
                <Feather name="link" size={12} color="#737373" />
                <Eyebrow>Superset · Alternate sets</Eyebrow>
              </View>
              <View className="border-l-2 border-brand/60 pl-3">{group.map((exercise, i) => card(exercise, i))}</View>
            </View>
          );
        })}
      </ScrollView>

      {!isReadOnly ? (
        <View className="absolute inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 pt-3" style={{ paddingBottom: Math.max(12, insets.bottom) }}>
          <Button
            variant={stats.exercisesDone === stats.exercisesTotal ? 'brand' : 'primary'}
            onPress={onFinishPress}
            loading={isFinishing}
          >
            {stats.exercisesDone === stats.exercisesTotal
              ? 'Finish workout'
              : `Finish workout  ${stats.exercisesDone}/${stats.exercisesTotal}`}
          </Button>
        </View>
      ) : null}

      <FlagMessageSheet exercise={messageExercise} onClose={() => setMessageExercise(null)} onSend={sendMessage} />
    </KeyboardAvoidingView>
  );
}
