import * as Haptics from 'expo-haptics';

/**
 * The app's haptics, in one place, named for what happened and not for how
 * the motor moves. Screens call `haptic.success()`, never expo-haptics
 * directly, so the same event always feels the same.
 *
 * The rule for adding one: a haptic confirms something the athlete did or
 * something they are waiting on (a set ticked, a workout saved, a send that
 * failed). Plain navigation, opening a sheet and scrolling stay silent, and
 * controls iOS already taps for (the system switch, pull to refresh, alerts)
 * are left to the system.
 *
 * iOS plays these through the Taptic Engine and skips them by itself when
 * System Haptics is off or the phone is in Low Power Mode. Every call is
 * fire-and-forget: a haptic that can't play must never break the action it
 * decorates.
 */

function fire(play: () => Promise<void>) {
  void play().catch(() => undefined);
}

export const haptic = {
  /** A choice changed: tabs, segmented controls, option grids. A picker detent. */
  select: () => fire(() => Haptics.selectionAsync()),
  /** A small thing was done under the finger: a set ticked, a message sent, a timer started. */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A weightier commit: starting the workout, completing a whole exercise. */
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Something the athlete was waiting on went through: workout finished, check-in sent, the timer's buzzer. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /**
   * The big one, for the week-complete moment only: the success pattern, then
   * a second one as the confetti lands. Rare on purpose.
   */
  celebrate: () => {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 450);
  },
  /** About to do something that can't be undone: the confirm in front of a destructive action. */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** It didn't work: a failed save or send, a rejected form. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
