// Shared display mappings for check-in feeling values.
// Single source of truth for the emoji + label pairs shown wherever a
// check-in's workout/body feeling is rendered.

export const WORKOUT_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  EASY: { label: 'Too Easy', emoji: '😴' },
  MEDIUM: { label: 'About Right', emoji: '💪' },
  HARD: { label: 'Too Hard', emoji: '😰' },
};

export const BODY_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};
