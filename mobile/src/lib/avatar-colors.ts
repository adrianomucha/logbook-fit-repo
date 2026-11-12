import { AVATAR_TONES, avatarToneIndex } from '@logbook/shared/palette';

/**
 * Deterministic avatar colour from a display name: the web's avatarColor,
 * drawn from the same shared tones, so the same person is the same colour in
 * both apps.
 */
export function avatarColor(name: string) {
  return AVATAR_TONES[avatarToneIndex(name)];
}
