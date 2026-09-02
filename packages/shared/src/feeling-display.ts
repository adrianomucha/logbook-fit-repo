/**
 * Shared display language for check-in answers, used on both sides of the
 * loop (client form/detail, coach review) so a "Run Down" reads red and a
 * "Fresh" reads green everywhere: easy/fresh = success, strained = warning,
 * run down = destructive.
 */
export const FEELING_DISPLAY: Record<string, { label: string; emoji: string; text: string }> = {
  // The -text variants are the AA-contrast cuts of the status hues — the
  // bright fill colors sit around 2:1 as small text on light surfaces
  EASY: { label: 'Too Easy', emoji: '😴', text: 'text-success-text' },
  MEDIUM: { label: 'About Right', emoji: '💪', text: 'text-foreground' },
  HARD: { label: 'Too Hard', emoji: '😰', text: 'text-warning-text' },
  FRESH: { label: 'Fresh', emoji: '✨', text: 'text-success-text' },
  NORMAL: { label: 'Normal', emoji: '👍', text: 'text-foreground' },
  TIRED: { label: 'Tired', emoji: '😓', text: 'text-warning-text' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴', text: 'text-destructive' },
};
