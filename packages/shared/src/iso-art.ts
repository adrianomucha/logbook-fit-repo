/**
 * A tiny isometric drawing kit for the state illustrations (empty, caught
 * up, error, not found). Everything here is pure data: SVG path strings plus
 * a declarative loop of keyframes per layer. The web renders it with DOM SVG
 * and the Web Animations API, the native app with react-native-svg and
 * Reanimated, so both apps draw the same picture and play the same motion
 * from one definition.
 *
 * World axes: x runs down-right, y runs down-left, z is up. One world unit
 * is one viewBox unit before projection.
 */

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

/** The frame every illustration is shown in. Fixed, so stroke weights match. */
export const ART_VIEWBOX = { width: 160, height: 100 } as const;

/** Where world (0, 0, 0) lands in the viewBox. */
const ORIGIN = { x: 80, y: 40 } as const;

/**
 * Paint roles, resolved per platform to theme colors:
 * - ink: outlines, solid shadows, glyphs (foreground)
 * - paper: lit faces (card background)
 * - shade: side faces (border grey)
 * - accent: the one highlight per scene (volt, or amber on error states)
 * - none: no paint
 */
export type ArtTone = 'ink' | 'paper' | 'shade' | 'accent' | 'none';

export interface ArtShape {
  d: string;
  fill: ArtTone;
  stroke: ArtTone;
  /** Dashed outline: a placeholder for the thing that will be here */
  dashed?: boolean;
  /** Defaults to ART_STROKE */
  strokeWidth?: number;
}

export type ArtEase = 'linear' | 'in' | 'out' | 'inOut' | 'spring';

/** Cubic-bezier control points for each ease, shared by both renderers. */
export const ART_EASES: Record<ArtEase, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  in: [0.55, 0, 0.9, 0.4],
  out: [0.2, 0.8, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
  // Overshoots then settles: the app's "pop" curve (see tabPop, setComplete)
  spring: [0.34, 1.56, 0.64, 1],
};

/**
 * One pose in a layer's loop. `at` is 0..1 of the illustration's duration.
 * x/y are viewBox units, rotate is degrees, scale is about the layer origin.
 * `ease` shapes the move INTO this keyframe from the previous one.
 */
export interface ArtKeyframe {
  at: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  ease?: ArtEase;
}

export interface ArtLayer {
  id: string;
  shapes: ArtShape[];
  /** Loop for this layer. Must start at 0 and end at 1 on the same pose. */
  motion?: ArtKeyframe[];
  /** Scale / rotate pivot in drawing units. Defaults to the frame center. */
  origin?: [number, number];
}

export interface StateArt {
  id: string;
  /**
   * Top-left of the visible frame in drawing units: centers this scene's
   * drawing (with all its motion) in the ART_VIEWBOX-sized frame.
   */
  frame: [number, number];
  /** Loop length in ms */
  duration: number;
  /** What the accent paint means here: volt for good news, amber for trouble */
  accent: 'brand' | 'warning';
  /** Bottom to top */
  layers: ArtLayer[];
}

export const ART_STROKE = 1.5;

// ── Projection ──────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];
type Vec2 = [number, number];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** World point to viewBox point */
export function iso(x: number, y: number, z: number): Vec2 {
  return [ORIGIN.x + (x - y) * COS30, ORIGIN.y + (x + y) * SIN30 - z];
}

const pt = ([x, y]: Vec2) => `${r2(x)} ${r2(y)}`;

/** Closed polygon through world points */
export function poly(points: Vec3[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${pt(iso(...p))}`).join('') + 'Z';
}

/** Open polyline through world points */
export function line(points: Vec3[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${pt(iso(...p))}`).join('');
}

/** Closed polygon through viewBox points (for flat, screen-facing glyphs) */
export function flat(points: Vec2[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${pt(p)}`).join('') + 'Z';
}

// ── Solids ──────────────────────────────────────────────────────────────────

export interface BoxFaces {
  top: string;
  /** The face at y + depth (front left on screen) */
  left: string;
  /** The face at x + width (front right on screen) */
  right: string;
  /** The footprint at the box's base, for shadows and placeholders */
  base: string;
}

/** Axis-aligned box from (x, y, z) spanning w along x, d along y, h up. */
export function box(x: number, y: number, z: number, w: number, d: number, h: number): BoxFaces {
  const x2 = x + w;
  const y2 = y + d;
  const z2 = z + h;
  return {
    top: poly([[x, y, z2], [x2, y, z2], [x2, y2, z2], [x, y2, z2]]),
    left: poly([[x, y2, z], [x2, y2, z], [x2, y2, z2], [x, y2, z2]]),
    right: poly([[x2, y, z], [x2, y2, z], [x2, y2, z2], [x2, y, z2]]),
    base: poly([[x, y, z], [x2, y, z], [x2, y2, z], [x, y2, z]]),
  };
}

/** Semi-axes of a world circle of radius r lying flat, once projected */
function ellipseAxes(r: number): Vec2 {
  return [r * Math.SQRT2 * COS30, r * Math.SQRT2 * SIN30];
}

/** A circle of radius r lying flat at height z */
export function disc(cx: number, cy: number, z: number, r: number): string {
  const [ex, ey] = iso(cx, cy, z);
  const [rx, ry] = ellipseAxes(r);
  return (
    `M${pt([ex - rx, ey])}` +
    `A${r2(rx)} ${r2(ry)} 0 1 0 ${pt([ex + rx, ey])}` +
    `A${r2(rx)} ${r2(ry)} 0 1 0 ${pt([ex - rx, ey])}Z`
  );
}

export interface CylinderFaces {
  top: string;
  side: string;
  base: string;
}

/** Upright cylinder standing at height z */
export function cylinder(cx: number, cy: number, z: number, r: number, h: number): CylinderFaces {
  const [bx, by] = iso(cx, cy, z);
  const [rx, ry] = ellipseAxes(r);
  const ty = by - h;
  return {
    top: disc(cx, cy, z + h, r),
    side:
      `M${pt([bx - rx, ty])}L${pt([bx - rx, by])}` +
      `A${r2(rx)} ${r2(ry)} 0 0 0 ${pt([bx + rx, by])}` +
      `L${pt([bx + rx, ty])}` +
      `A${r2(rx)} ${r2(ry)} 0 0 1 ${pt([bx - rx, ty])}Z`,
    base: disc(cx, cy, z, r),
  };
}

/** A flat, screen-facing circle (spheres, badges, dots) */
export function circle(cx: number, cy: number, r: number): string {
  return `M${r2(cx - r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 0 ${r2(cx + r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 0 ${r2(cx - r)} ${r2(cy)}Z`;
}

// ── Shape shorthands ────────────────────────────────────────────────────────

export const solid = (d: string, fill: ArtTone = 'paper'): ArtShape => ({ d, fill, stroke: 'ink' });
export const shadow = (d: string): ArtShape => ({ d, fill: 'ink', stroke: 'ink' });
export const ghost = (d: string): ArtShape => ({ d, fill: 'none', stroke: 'ink', dashed: true });
export const stroke = (d: string, strokeWidth?: number): ArtShape => ({ d, fill: 'none', stroke: 'ink', strokeWidth });

/** Box drawn as three shapes, lit top + shaded sides */
export function solidBox(
  x: number, y: number, z: number, w: number, d: number, h: number,
  { top = 'paper', sides = 'shade' }: { top?: ArtTone; sides?: ArtTone } = {},
): ArtShape[] {
  const f = box(x, y, z, w, d, h);
  return [solid(f.left, sides), solid(f.right, sides), solid(f.top, top)];
}

/** Cylinder drawn as two shapes */
export function solidCylinder(
  cx: number, cy: number, z: number, r: number, h: number,
  { top = 'paper', side = 'shade' }: { top?: ArtTone; side?: ArtTone } = {},
): ArtShape[] {
  const f = cylinder(cx, cy, z, r, h);
  return [solid(f.side, side), solid(f.top, top)];
}

/** Small diamond, the sparkle accent. Size is its half-width in viewBox units. */
export function sparkle(x: number, y: number, z: number, s = 3.2): string {
  const [cx, cy] = iso(x, y, z);
  const h = s * 0.7;
  return flat([[cx - s, cy], [cx, cy - h], [cx + s, cy], [cx, cy + h]]);
}

// ── Motion ──────────────────────────────────────────────────────────────────

export interface ArtPose {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
}

/** A layer's pivot relative to the frame's top-left, for renderers */
export function framedOrigin(art: StateArt, layer: ArtLayer): [number, number] {
  const [fx, fy] = art.frame;
  const [ox, oy] = layer.origin ?? [fx + ART_VIEWBOX.width / 2, fy + ART_VIEWBOX.height / 2];
  return [ox - fx, oy - fy];
}

/** The SVG viewBox attribute for a scene */
export function artViewBox(art: StateArt): string {
  return `${art.frame[0]} ${art.frame[1]} ${ART_VIEWBOX.width} ${ART_VIEWBOX.height}`;
}

export const REST_POSE: ArtPose = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };

export function poseOf(k: ArtKeyframe): ArtPose {
  return {
    x: k.x ?? 0,
    y: k.y ?? 0,
    scale: k.scale ?? 1,
    rotate: k.rotate ?? 0,
    opacity: k.opacity ?? 1,
  };
}

function bezierAt(p1x: number, p1y: number, p2x: number, p2y: number, t: number): number {
  // Solve x(u) = t for u by bisection, then return y(u)
  const coord = (u: number, a: number, b: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (coord(mid, p1x, p2x) < t) lo = mid;
    else hi = mid;
  }
  return coord((lo + hi) / 2, p1y, p2y);
}

/** The layer's pose at loop progress t (0..1). Used for previews and tests. */
export function samplePose(motion: ArtKeyframe[] | undefined, t: number): ArtPose {
  if (!motion || motion.length === 0) return REST_POSE;
  let prev = motion[0];
  for (const k of motion) {
    if (k.at >= t) {
      if (k === prev || k.at === prev.at || k.at === t) return poseOf(k);
      const local = (t - prev.at) / (k.at - prev.at);
      const [a, b, c, d] = ART_EASES[k.ease ?? 'inOut'];
      const e = bezierAt(a, b, c, d, local);
      const from = poseOf(prev);
      const to = poseOf(k);
      return {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        scale: from.scale + (to.scale - from.scale) * e,
        rotate: from.rotate + (to.rotate - from.rotate) * e,
        opacity: from.opacity + (to.opacity - from.opacity) * e,
      };
    }
    prev = k;
  }
  return poseOf(prev);
}

/**
 * The loop as timed segments, for renderers that chain tweens (Reanimated's
 * withSequence). Each segment moves to `pose` over `duration` ms.
 */
export function motionSegments(
  motion: ArtKeyframe[],
  loopMs: number,
): { pose: ArtPose; duration: number; ease: ArtEase }[] {
  const out: { pose: ArtPose; duration: number; ease: ArtEase }[] = [];
  for (let i = 1; i < motion.length; i++) {
    const k = motion[i];
    out.push({
      pose: poseOf(k),
      duration: Math.max(0, (k.at - motion[i - 1].at) * loopMs),
      ease: k.ease ?? 'inOut',
    });
  }
  return out;
}
