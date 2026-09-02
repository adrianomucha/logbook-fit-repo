import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ApiError } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCheckIn } from '@/hooks/useCheckIns';
import { BoldCheck, Button, Eyebrow, LoadingScreen } from '@/components/ui';
import { ChoiceGrid, type Choice } from '@/components/checkin/ChoiceGrid';

const EFFORT_OPTIONS: Choice[] = [
  { value: 'EASY', label: 'Too Easy', emoji: '😴', tone: 'success' },
  { value: 'MEDIUM', label: 'About Right', emoji: '💪', tone: 'neutral' },
  { value: 'HARD', label: 'Too Hard', emoji: '😰', tone: 'warning' },
];

const FEELING_OPTIONS: Choice[] = [
  { value: 'FRESH', label: 'Fresh', emoji: '✨', tone: 'success' },
  { value: 'NORMAL', label: 'Normal', emoji: '👍', tone: 'neutral' },
  { value: 'TIRED', label: 'Tired', emoji: '😓', tone: 'warning' },
  { value: 'RUN_DOWN', label: 'Run Down', emoji: '🥴', tone: 'destructive' },
];

/** A centred card with an icon, title, body and the way back — the form's terminal states. */
function Terminal({ icon, tone, title, body, onBack }: { icon: 'alert-triangle' | 'check-circle'; tone: 'muted' | 'success'; title: string; body: string; onBack: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-4">
      <View className="w-full max-w-md items-center rounded-xl border border-border/70 bg-card px-6 py-12">
        <Feather name={icon} size={tone === 'success' ? 56 : 40} color={tone === 'success' ? '#21c45d' : '#a3a3a3'} />
        <Text className="mt-4 font-sans-bold text-lg tracking-tight text-foreground">{title}</Text>
        <Text className="mb-5 mt-1.5 text-center font-sans text-sm text-muted-foreground">{body}</Text>
        <Button variant="primary" className="h-11 px-6" onPress={onBack}>
          Back to dashboard
        </Button>
      </View>
    </View>
  );
}

/**
 * The success screen replaces the form — the web's redesigned confirmation:
 * volt check, "Sent to <coach>", and a receipt of what was sent so the
 * moment isn't a void. Two ways onward: back to today, or the chat.
 */
function SentScreen({
  coachFirstName,
  effort,
  feeling,
  note,
  onHome,
  onMessage,
}: {
  coachFirstName: string | null;
  effort?: Choice;
  feeling?: Choice;
  note: string;
  onHome: () => void;
  onMessage: () => void;
}) {
  const insets = useSafeAreaInsets();
  const receipt = [
    effort ? { label: 'Workouts felt', value: `${effort.emoji} ${effort.label}` } : null,
    feeling ? { label: 'Body feels', value: `${feeling.emoji} ${feeling.label}` } : null,
  ].filter((r): r is { label: string; value: string } => r !== null);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
    >
      <View className="gap-6">
        {/* Volt check — the same celebration mark the workout-complete state carries */}
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand">
          <BoldCheck size={32} color="#1e2702" strokeWidth={3} />
        </View>

        <View>
          <Eyebrow className="mb-2">Check-in sent</Eyebrow>
          <Text accessibilityRole="header" className="font-sans-bold text-3xl uppercase leading-[34px] tracking-tight text-foreground">
            {coachFirstName ? `Sent to ${coachFirstName}` : 'Sent to your coach'}
          </Text>
          <Text className="mt-3 font-sans text-sm leading-5 text-muted-foreground">
            {coachFirstName ?? 'Your coach'} will read it and get back to you — their reply shows up on your dashboard.
          </Text>
        </View>

        {receipt.length > 0 || note ? (
          <View className="rounded-2xl border border-border/70 bg-card px-4">
            {receipt.map((row, index) => (
              <View key={row.label} className={`flex-row items-center justify-between gap-4 py-3 ${index > 0 ? 'border-t border-border/50' : ''}`}>
                <Text className="font-mono text-[10px] uppercase tracking-[1.4px] text-muted-foreground">{row.label}</Text>
                <Text className="font-sans-semibold text-sm text-foreground">{row.value}</Text>
              </View>
            ))}
            {note ? (
              <View className={`py-3 ${receipt.length > 0 ? 'border-t border-border/50' : ''}`}>
                <Text className="mb-1 font-mono text-[10px] uppercase tracking-[1.4px] text-muted-foreground">Your note</Text>
                <Text className="font-sans text-sm leading-5 text-foreground">{note}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="gap-1.5 pt-1">
          {/* Same volt CTA the today card uses — one clear way onward */}
          <Button variant="brand" onPress={onHome}>
            Back to today
          </Button>
          <Pressable onPress={onMessage} accessibilityRole="button" className="h-11 items-center justify-center rounded-xl active:opacity-70">
            <Text className="font-sans-medium text-sm text-muted-foreground">Message {coachFirstName ?? 'your coach'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

/** The client's check-in form — the web's ClientCheckInForm, one to one. */
export default function CheckInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkinId } = useLocalSearchParams<{ checkinId: string }>();
  const { checkIn, isLoading, submitClientResponse, refresh } = useCheckIn(checkinId ?? null);
  const { coach } = useCurrentUser();
  const coachFirstName = coach?.user.name?.split(' ')[0] ?? null;

  const [effortRating, setEffortRating] = useState<string | null>(null);
  const [clientFeeling, setClientFeeling] = useState<string | null>(null);
  const [painBlockers, setPainBlockers] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goHome = () => router.replace('/client');

  if (isLoading) return <LoadingScreen />;
  if (!checkIn) {
    return <Terminal icon="alert-triangle" tone="muted" title="Check-in not found" body="This check-in doesn't exist or has expired." onBack={goHome} />;
  }
  // Checked before the status gate: the post-submit revalidation flips the
  // status, and the person must see "Sent" rather than a cold "Already sent".
  if (showSuccess) {
    return (
      <SentScreen
        coachFirstName={coachFirstName}
        effort={EFFORT_OPTIONS.find((o) => o.value === effortRating)}
        feeling={FEELING_OPTIONS.find((o) => o.value === clientFeeling)}
        note={painBlockers.trim()}
        onHome={goHome}
        onMessage={() => router.replace('/client/chat')}
      />
    );
  }
  if (checkIn.status === 'EXPIRED') {
    return <Terminal icon="alert-triangle" tone="muted" title="Check-in expired" body="This check-in is no longer open — the next one will appear on your dashboard." onBack={goHome} />;
  }
  if (checkIn.status !== 'PENDING') {
    return <Terminal icon="check-circle" tone="success" title="Already sent" body="You already sent this one to your coach." onBack={goHome} />;
  }

  const submit = async () => {
    if (isSubmitting) return;
    const next: Record<string, string> = {};
    if (!effortRating) next.effortRating = 'Choose how your workouts felt';
    if (!clientFeeling) next.clientFeeling = 'Choose how your body feels';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    try {
      await submitClientResponse({
        effortRating: effortRating!,
        clientFeeling: clientFeeling!,
        painBlockers: painBlockers.trim() || undefined,
      });
      setShowSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Answered elsewhere or expired while the form sat open — refetch so
        // the right terminal screen renders instead of a dead end.
        await refresh();
        setErrors({ submit: 'This check-in is no longer open — it may have been answered already or expired.' });
      } else {
        setErrors({ submit: 'Failed to submit. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const recent = checkIn.client.completions ?? [];

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: Math.max(16, insets.bottom) + 16, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="gap-8">
          <View className="py-4">
            <Pressable onPress={goHome} hitSlop={8} className="mb-3 self-start">
              <Text className="font-mono-medium text-[11px] uppercase tracking-[1.6px] text-muted-foreground">← Back</Text>
            </Pressable>
            <Eyebrow className="mb-1">Check-in</Eyebrow>
            <Text className="font-sans-bold text-2xl tracking-tight text-foreground">Time to check in</Text>
          </View>

          <View>
            <Text className="mb-3 font-mono-medium text-[11px] uppercase tracking-[1.6px] text-muted-foreground">How did your workouts feel?</Text>
            <ChoiceGrid
              choices={EFFORT_OPTIONS}
              value={effortRating}
              columns={3}
              accessibilityLabel="How did your workouts feel?"
              onChange={(v) => {
                setEffortRating(v);
                setErrors((e) => ({ ...e, effortRating: '' }));
              }}
            />
            {errors.effortRating ? <Text className="mt-2 font-sans text-sm text-destructive">{errors.effortRating}</Text> : null}
          </View>

          <View>
            <Text className="mb-3 font-mono-medium text-[11px] uppercase tracking-[1.6px] text-muted-foreground">How does your body feel?</Text>
            <ChoiceGrid
              choices={FEELING_OPTIONS}
              value={clientFeeling}
              columns={2}
              accessibilityLabel="How does your body feel?"
              onChange={(v) => {
                setClientFeeling(v);
                setErrors((e) => ({ ...e, clientFeeling: '' }));
              }}
            />
            {errors.clientFeeling ? <Text className="mt-2 font-sans text-sm text-destructive">{errors.clientFeeling}</Text> : null}
          </View>

          <View>
            <Text className="mb-3 font-mono-medium text-[11px] uppercase tracking-[1.6px] text-muted-foreground">Anything else for your coach?</Text>
            <TextInput
              className="min-h-[88px] rounded-md border border-input bg-background px-3 py-2 font-sans text-base text-foreground"
              placeholder="Right knee twinged on squats Wednesday"
              placeholderTextColor="#737373"
              value={painBlockers}
              onChangeText={(t) => setPainBlockers(t.slice(0, 500))}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text className="mt-1 text-right font-mono-medium text-[10px] uppercase tracking-[1.2px] text-muted-foreground">{painBlockers.length}/500</Text>
          </View>

          {recent.length > 0 ? (
            <View>
              <Text className="mb-3 font-mono-medium text-[11px] uppercase tracking-[1.6px] text-muted-foreground">Recent workouts</Text>
              <View className="gap-1.5">
                {recent.map((c) => (
                  <View key={c.id} className="flex-row items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                    <View className="h-2 w-2 rounded-full bg-success" />
                    <View className="flex-1">
                      <Text className="font-sans-bold text-sm tracking-tight text-foreground" numberOfLines={1}>
                        {c.day?.name ?? 'Workout'}
                      </Text>
                      {c.completedAt ? (
                        <Text className="font-sans-medium text-[10px] uppercase tracking-[1.2px] text-muted-foreground">
                          {format(new Date(c.completedAt), 'EEEE, MMM d')}
                        </Text>
                      ) : null}
                    </View>
                    {c.completionPct != null ? (
                      <Text className="font-sans-bold text-sm text-foreground">{Math.round(c.completionPct)}%</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className="items-center rounded-lg bg-muted/40 py-6">
              <Text className="font-sans-medium text-[10px] uppercase tracking-[1.2px] text-muted-foreground">No recent completed workouts</Text>
            </View>
          )}

          {errors.submit ? <Text className="text-center font-sans text-sm text-destructive">{errors.submit}</Text> : null}

          <Button variant="brand" onPress={submit} loading={isSubmitting}>
            Send check-in
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
