/**
 * Motion tokens shared by the web app and the native app, so the two move
 * the same way. The web reads the curves as CSS variables in
 * src/app/globals.css (a test keeps them in step with this file); the native
 * app feeds them to Reanimated.
 */

type Bezier = readonly [number, number, number, number];

export const EASE = {
  /** Entrances, exits and anything that answers a tap: fast start, soft landing */
  out: [0.23, 1, 0.32, 1],
  /** Small celebratory pops (a ticked set, a completion mark): overshoots, then settles */
  pop: [0.34, 1.56, 0.64, 1],
  /** The tab bar's pill travelling to another tab: lands with a slight overshoot, about 5% of the trip */
  slide: [0.34, 1.4, 0.5, 1],
} as const satisfies Record<string, Bezier>;

/** Milliseconds */
export const DURATION = {
  /** Press feedback */
  press: 150,
  /** A control changing state: a check filling in, a chip selecting */
  state: 200,
  /** The check landing in a ticked set */
  pop: 250,
  /** Content fading up into place */
  enter: 300,
  /** The tab bar icon landing with the pill */
  tabPop: 350,
  /** A completion mark popping in */
  celebrate: 400,
  /** A progress bar moving to a new value */
  meter: 500,
} as const;

/** How far a pressed control shrinks */
export const PRESS_SCALE = 0.97;
/** Small round targets (a set's check, an icon button) shrink a little more */
export const PRESS_SCALE_SMALL = 0.92;
/** Where a ticked set's check starts from. Never 0: nothing appears from nothing. */
export const CHECK_POP_FROM = 0.9;
/** Where a completion mark starts from */
export const CELEBRATE_POP_FROM = 0.6;
/** How far content travels as it fades up, in px */
export const ENTER_OFFSET = 6;

export function cssBezier(curve: Bezier): string {
  return `cubic-bezier(${curve.join(', ')})`;
}
