/**
 * Shared display language for check-in answers, used on both sides of the
 * loop (client form/detail, coach review) so a "Run Down" reads red and a
 * "Fresh" reads green everywhere: easy/fresh = success, strained = warning,
 * run down = destructive.
 */
export const FEELING_DISPLAY: Record<string, { label: string; emoji: string; text: string }> = {
  EASY: { label: 'Too Easy', emoji: '😴', text: 'text-success' },
  MEDIUM: { label: 'About Right', emoji: '💪', text: 'text-foreground' },
  HARD: { label: 'Too Hard', emoji: '😰', text: 'text-warning' },
  FRESH: { label: 'Fresh', emoji: '✨', text: 'text-success' },
  NORMAL: { label: 'Normal', emoji: '👍', text: 'text-foreground' },
  TIRED: { label: 'Tired', emoji: '😓', text: 'text-warning' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴', text: 'text-destructive' },
};
