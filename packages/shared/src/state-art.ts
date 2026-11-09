/**
 * The state illustrations: small isometric line drawings that loop a short
 * piece of motion, so an empty screen shows what will happen here instead of
 * sitting blank. Ink outlines, white and grey faces, a hard ink shadow, and
 * one accent per scene: volt when the news is fine, amber when something
 * broke. Dashed outlines mark the thing that is not here yet.
 *
 * Each scene's rest pose (no motion applied) is a complete picture: it is
 * what renders under reduced motion and on the server.
 */
import {
  type ArtKeyframe,
  type ArtLayer,
  type ArtShape,
  type StateArt,
  box,
  circle,
  cylinder,
  disc,
  flat,
  ghost,
  iso,
  line,
  poly,
  shadow,
  solid,
  solidBox,
  solidCylinder,
  sparkle,
  stroke,
} from './iso-art';

const layer = (
  id: string,
  shapes: ArtShape[],
  motion?: ArtKeyframe[],
  origin?: [number, number],
): ArtLayer => ({ id, shapes, motion, origin });

/** Twinkle for sparkles: shrink away and come back */
const twinkle = (start: number): ArtKeyframe[] => [
  { at: 0, scale: 1 },
  { at: start, scale: 1 },
  { at: start + 0.08, scale: 0.2, opacity: 0.4, ease: 'in' },
  { at: start + 0.18, scale: 1, ease: 'spring' },
  { at: 1, scale: 1 },
];

// ── Plans: a stack of plan sheets, a dashed sheet settling on top ──────────

const SHEET = { x: 2, y: -2, w: 32, d: 40, h: 2.5 } as const;

/**
 * Height a dashed sheet hovers at so it clears a stack whose top surface is
 * at `top`: a sheet's isometric footprint is (w + d) / 2 tall on screen, so
 * the dashed outline has to sit that far up, plus a gap, to never cross the
 * rows on the top sheet.
 */
const hoverAbove = (top: number) => top + (SHEET.w + SHEET.d) / 2 + 2;

function sheet(z: number, rows: boolean): ArtShape[] {
  const { x, y, w, d, h } = SHEET;
  const shapes = solidBox(x, y, z, w, d, h);
  if (rows) {
    const top = z + h;
    // Exercise rows on the top sheet, ragged like real names
    for (const [ry, len] of [[7, 18], [14, 22], [21, 13], [28, 20]] as const) {
      shapes.push(stroke(line([[x + 7, y + ry, top], [x + 7 + len, y + ry, top]])));
      shapes.push(solid(disc(x + 4, y + ry, top, 1), 'ink'));
    }
  }
  return shapes;
}

function sheetShadow(): ArtShape {
  const { x, y, w, d } = SHEET;
  return shadow(box(x, y + 4, 0, w, d, 0).base);
}

/** The volt tab poking out of the stack: a bookmarked plan */
function planTab(z: number): ArtShape[] {
  return solidBox(SHEET.x + SHEET.w, SHEET.y + 9, z, 6, 7, 2.5, { top: 'accent', sides: 'accent' });
}

function ghostSheet(z: number): ArtShape[] {
  const { x, y, w, d } = SHEET;
  const cx = x + w / 2;
  const cy = y + d / 2;
  return [
    ghost(box(x, y, z, w, d, 0).top),
    stroke(line([[cx - 4, cy, z], [cx + 4, cy, z]])),
    stroke(line([[cx, cy - 4, z], [cx, cy + 4, z]])),
  ];
}

const plans: StateArt = {
  id: 'plans',
  frame: [26.5, -12],
  duration: 3200,
  accent: 'brand',
  layers: [
    layer('shadow', [sheetShadow()]),
    layer(
      'stack',
      [...sheet(0, false), ...planTab(4.5), ...sheet(4.5, false), ...sheet(9, true)],
      [
        { at: 0 },
        { at: 0.52 },
        { at: 0.58, y: 1.2, ease: 'out' },
        { at: 0.7, y: 0, ease: 'spring' },
        { at: 1 },
      ],
    ),
    // Hovers clear of the stack, then drops onto the top sheet (surface at 11.5)
    layer('ghost', ghostSheet(hoverAbove(11.5)), [
      { at: 0 },
      { at: 0.3 },
      { at: 0.52, y: hoverAbove(11.5) - 11.5, ease: 'in' },
      { at: 0.6, y: hoverAbove(11.5) - 11.5, opacity: 0, ease: 'linear' },
      // Back at its hover height, fading in for the next drop
      { at: 0.62, y: 0, opacity: 0, ease: 'linear' },
      { at: 0.94, y: 0, ease: 'out' },
      { at: 1 },
    ]),
  ],
};

// ── Building: the coach is putting the plan together, sheet by sheet ───────

const drop = (start: number): ArtKeyframe[] => [
  { at: 0, y: -12, opacity: 0 },
  { at: start, y: -12, opacity: 0 },
  { at: start + 0.04, y: -10, ease: 'linear' },
  { at: start + 0.16, y: 0, ease: 'in' },
  { at: start + 0.2, y: -0.8, ease: 'out' },
  { at: start + 0.24, y: 0, ease: 'in' },
  { at: 0.84, y: 0 },
  { at: 0.92, y: 0, opacity: 0, ease: 'linear' },
  { at: 1, y: -12, opacity: 0 },
];

const building: StateArt = {
  id: 'building',
  frame: [26.5, -13],
  duration: 3600,
  accent: 'brand',
  layers: [
    layer('shadow', [sheetShadow()]),
    layer('base', sheet(0, false)),
    layer('second', [...planTab(5.5), ...sheet(5.5, false)], drop(0.08)),
    layer('third', sheet(11, true), drop(0.36)),
    // The next sheet on its way, hovering clear of the finished stack
    layer('ghost', ghostSheet(hoverAbove(13.5)), [
      { at: 0, opacity: 0 },
      { at: 0.6, opacity: 0 },
      { at: 0.66, opacity: 1, ease: 'linear' },
      { at: 0.84 },
      { at: 0.9, opacity: 0, ease: 'linear' },
      { at: 1, opacity: 0 },
    ]),
  ],
};

// ── Inbox: a message card, the other side typing ───────────────────────────

const CARD = { x: -6, y: 8, w: 50, d: 34, h: 5 } as const;

const bubbleBox = box(14, -8, 22, 22, 10, 3);
const bubbleCenter = iso(25, -3, 25);

const typingDot = (i: number): ArtLayer =>
  layer(`dot${i}`, [solid(disc(19 + i * 6, -3, 25, 1.7), 'ink')], [
    { at: 0, opacity: 0 },
    { at: 0.1, opacity: 0 },
    { at: 0.16, opacity: 1, ease: 'linear' },
    { at: 0.24 + i * 0.08, y: 0 },
    { at: 0.3 + i * 0.08, y: -2, ease: 'out' },
    { at: 0.36 + i * 0.08, y: 0, ease: 'in' },
    { at: 0.48 + i * 0.08, y: 0 },
    { at: 0.54 + i * 0.08, y: -2, ease: 'out' },
    { at: 0.6 + i * 0.08, y: 0, ease: 'in' },
    { at: 0.84 },
    { at: 0.88, opacity: 0, ease: 'linear' },
    { at: 1, opacity: 0 },
  ]);

const inbox: StateArt = {
  id: 'inbox',
  frame: [25, 5],
  duration: 3400,
  accent: 'brand',
  layers: [
    layer('shadow', [shadow(box(CARD.x, CARD.y + 4, 0, CARD.w, CARD.d, 0).base)]),
    layer('card', [
      ...solidBox(CARD.x, CARD.y, 0, CARD.w, CARD.d, CARD.h),
      // Unread volt avatar and two lines of message
      solid(disc(CARD.x + 9, CARD.y + 9, CARD.h, 4.5), 'accent'),
      stroke(line([[CARD.x + 17, CARD.y + 7, CARD.h], [CARD.x + 40, CARD.y + 7, CARD.h]])),
      stroke(line([[CARD.x + 17, CARD.y + 13, CARD.h], [CARD.x + 32, CARD.y + 13, CARD.h]])),
      stroke(line([[CARD.x + 7, CARD.y + 22, CARD.h], [CARD.x + 38, CARD.y + 22, CARD.h]])),
      stroke(line([[CARD.x + 7, CARD.y + 28, CARD.h], [CARD.x + 26, CARD.y + 28, CARD.h]])),
    ]),
    layer(
      'bubble',
      [solid(bubbleBox.left, 'shade'), solid(bubbleBox.right, 'shade'), solid(bubbleBox.top)],
      [
        { at: 0, scale: 0.3, opacity: 0 },
        { at: 0.04, scale: 0.3, opacity: 0 },
        { at: 0.16, scale: 1, opacity: 1, ease: 'spring' },
        { at: 0.84 },
        { at: 0.9, scale: 0.5, opacity: 0, ease: 'in' },
        { at: 1, scale: 0.3, opacity: 0 },
      ],
      bubbleCenter,
    ),
    typingDot(0),
    typingDot(1),
    typingDot(2),
    layer('spark1', [solid(sparkle(-14, 2, 16))], twinkle(0.2), iso(-14, 2, 16)),
    layer('spark2', [solid(sparkle(50, 0, 10, 2))], twinkle(0.55), iso(50, 0, 10)),
  ],
};

// ── Caught up: the button's been pressed, nothing left to answer ───────────

const BTN = { cx: 22, cy: 22 } as const;
const btnTop = iso(BTN.cx, BTN.cy, 13);

function rays(): ArtShape[] {
  const [cx, cy] = btnTop;
  return [-160, -125, -90, -55, -20].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return stroke(`M${(cx + Math.cos(a) * 22).toFixed(2)} ${(cy + Math.sin(a) * 16).toFixed(2)}L${(cx + Math.cos(a) * 28).toFixed(2)} ${(cy + Math.sin(a) * 21).toFixed(2)}`);
  });
}

const checkAt: [number, number] = [btnTop[0], btnTop[1] - 30];

const caughtUp: StateArt = {
  id: 'caughtUp',
  frame: [28, -0.5],
  duration: 3000,
  accent: 'brand',
  layers: [
    layer('shadow', [shadow(disc(BTN.cx, BTN.cy + 4, 0, 20))]),
    layer('base', solidCylinder(BTN.cx, BTN.cy, 0, 20, 4)),
    layer(
      'ripple',
      [stroke(disc(BTN.cx, BTN.cy, 4, 20))],
      [
        { at: 0, opacity: 0 },
        { at: 0.12, opacity: 0 },
        { at: 0.13, opacity: 0.9, ease: 'linear' },
        { at: 0.5, scale: 1.4, opacity: 0, ease: 'out' },
        { at: 1, opacity: 0 },
      ],
      iso(BTN.cx, BTN.cy, 4),
    ),
    layer(
      'button',
      [
        ...solidCylinder(BTN.cx, BTN.cy, 4, 12, 7),
        ...solidCylinder(BTN.cx, BTN.cy, 11, 5, 2.5, { top: 'shade', side: 'paper' }),
      ],
      [
        { at: 0 },
        { at: 0.06 },
        { at: 0.13, y: 3, ease: 'in' },
        { at: 0.28, y: 0, ease: 'spring' },
        { at: 1 },
      ],
    ),
    layer('rays', rays(), [
      { at: 0 },
      { at: 0.1 },
      { at: 0.14, opacity: 0.15, ease: 'linear' },
      { at: 0.32, opacity: 1, ease: 'out' },
      { at: 1 },
    ]),
    layer(
      'check',
      [
        solid(circle(checkAt[0], checkAt[1], 6), 'accent'),
        stroke(`M${checkAt[0] - 2.6} ${checkAt[1] + 0.2}L${checkAt[0] - 0.6} ${checkAt[1] + 2.2}L${checkAt[0] + 2.8} ${checkAt[1] - 1.8}`, 1.6),
      ],
      [
        { at: 0, scale: 0.4, opacity: 0 },
        { at: 0.2, scale: 0.4, opacity: 0 },
        { at: 0.34, scale: 1, opacity: 1, ease: 'spring' },
        { at: 0.84 },
        { at: 0.92, scale: 0.6, opacity: 0, ease: 'in' },
        { at: 1, scale: 0.4, opacity: 0 },
      ],
      checkAt,
    ),
  ],
};

// ── Plates: progress stacks up, one plate at a time ────────────────────────

const STACK = { cx: 16, cy: 18, r: 17, h: 3.5 } as const;

function plate(cx: number, cy: number, z: number, r: number, h: number, side: 'shade' | 'accent' = 'shade'): ArtShape[] {
  const c = cylinder(cx, cy, z, r, h);
  return [
    solid(c.side, side),
    solid(c.top),
    stroke(disc(cx, cy, z + h, r * 0.58)),
    solid(disc(cx, cy, z + h, r * 0.18), 'ink'),
  ];
}

const settle = (at: number): ArtKeyframe[] => [
  { at: 0 },
  { at },
  { at: at + 0.05, y: 0.8, ease: 'out' },
  { at: at + 0.12, y: 0, ease: 'spring' },
  { at: 1 },
];

const plates: StateArt = {
  id: 'plates',
  frame: [24.5, 8],
  duration: 3200,
  accent: 'brand',
  layers: [
    layer('shadow', [shadow(disc(STACK.cx, STACK.cy + 4, 0, STACK.r)), shadow(disc(46, 40, 0, 9))]),
    layer('loose', plate(46, 37, 0, 9, 3)),
    layer('stack', [...plate(STACK.cx, STACK.cy, 0, STACK.r, STACK.h), ...plate(STACK.cx, STACK.cy, 4.5, STACK.r, STACK.h)], settle(0.5)),
    layer('top', plate(STACK.cx, STACK.cy, 9, STACK.r, STACK.h, 'accent'), [
      { at: 0 },
      { at: 0.08 },
      { at: 0.3, y: -14, ease: 'out' },
      { at: 0.36, y: -14 },
      { at: 0.5, y: 0, ease: 'in' },
      { at: 0.55, y: 0.8, ease: 'out' },
      { at: 0.62, y: 0, ease: 'spring' },
      { at: 1 },
    ]),
    layer('spark1', [solid(sparkle(44, 4, 26))], twinkle(0.5), iso(44, 4, 26)),
    layer('spark2', [solid(sparkle(-12, 8, 22, 2))], twinkle(0.62), iso(-12, 8, 22)),
  ],
};

// ── Week: a calendar of empty days, one workout waiting to land ────────────

// Five big day slots rather than seven small ones: at app size seven dashed
// squares ran together into a ruler. Five still reads as a training week.
const DAYS = 5;
const SLOT = 11;
const GAP = 2.5;
const CAL = { x: -12, y: 4, w: DAYS * SLOT + (DAYS - 1) * GAP + 5, d: 22, h: 3 } as const;
const slotX = (i: number) => CAL.x + 2.5 + i * (SLOT + GAP);
const slotY = CAL.y + 8;
const TODAY = 2;

const week: StateArt = {
  id: 'week',
  frame: [33, 12],
  duration: 3200,
  accent: 'brand',
  layers: [
    layer('shadow', [shadow(box(CAL.x, CAL.y + 4, 0, CAL.w, CAL.d, 0).base)]),
    layer('calendar', [
      ...solidBox(CAL.x, CAL.y, 0, CAL.w, CAL.d, CAL.h),
      // Header band, like the top of a wall planner
      ...solidBox(CAL.x, CAL.y, CAL.h, CAL.w, 5, 1.5, { top: 'shade', sides: 'shade' }),
      ...Array.from({ length: DAYS }, (_, i) => ghost(box(slotX(i), slotY, CAL.h, SLOT, SLOT, 0).top)),
    ]),
    layer('workout', solidBox(slotX(TODAY), slotY, CAL.h + 11, SLOT, SLOT, 3, { top: 'accent' }), [
      { at: 0 },
      { at: 0.3, y: -3 },
      { at: 0.54, y: 11, ease: 'in' },
      { at: 0.59, y: 10.2, ease: 'out' },
      { at: 0.64, y: 11, ease: 'in' },
      { at: 0.8, y: 11 },
      { at: 1, ease: 'inOut' },
    ]),
  ],
};

// ── Logbook: an open log with nothing written yet, a volt pencil ready ─────

const PAGE = { y: 0, d: 40, h: 3 } as const;

function page(x: number, w: number): ArtShape[] {
  const shapes = solidBox(x, PAGE.y, 0, w, PAGE.d, PAGE.h);
  for (const ry of [9, 16, 23, 30]) {
    shapes.push(ghost(line([[x + 4, PAGE.y + ry, PAGE.h], [x + w - 4, PAGE.y + ry, PAGE.h]])));
  }
  return shapes;
}

function pencil(): ArtShape[] {
  const x = 26;
  const y = 2;
  const z = PAGE.h;
  const s = 4;
  const len = 26;
  const tipY = y + len;
  const apex: [number, number, number] = [x + s / 2, tipY + 7, z + 0.5];
  return [
    ...solidBox(x, y - 3, z, s, 3, s, { top: 'ink', sides: 'ink' }),
    ...solidBox(x, y, z, s, len, s, { top: 'accent', sides: 'accent' }),
    solid(poly([[x + s, tipY, z], [x + s, tipY, z + s], apex])),
    solid(poly([[x, tipY, z + s], [x + s, tipY, z + s], apex])),
    solid(poly([[x, tipY, z], [x + s, tipY, z], apex]), 'shade'),
  ];
}

const logbook: StateArt = {
  id: 'logbook',
  frame: [10, 4],
  duration: 3400,
  accent: 'brand',
  layers: [
    layer('shadow', [shadow(box(-30, PAGE.y + 4, 0, 62, PAGE.d, 0).base)]),
    layer('book', [...page(-30, 30), ...page(1, 31)]),
    layer('scribble', [stroke(line([[5, 30, PAGE.h], [19, 30, PAGE.h]]), 1.8)], [
      { at: 0, opacity: 0 },
      { at: 0.3, opacity: 0 },
      { at: 0.45, opacity: 1, ease: 'out' },
      { at: 0.82 },
      { at: 0.9, opacity: 0, ease: 'linear' },
      { at: 1, opacity: 0 },
    ]),
    layer('pencil', pencil(), [
      // Rests beside the page, slides along a line and back
      { at: 0 },
      { at: 0.16, x: -18.2, y: -6.5, ease: 'inOut' },
      { at: 0.24, x: -18.2, y: -4.5, ease: 'out' },
      { at: 0.45, x: -6.1, y: 2.5, ease: 'inOut' },
      { at: 0.52, x: -6.1, y: 0.5, ease: 'out' },
      { at: 0.75, x: 0, y: 0, ease: 'inOut' },
      { at: 1 },
    ]),
  ],
};

// ── Unplugged: the load failed, the connection is out ─────────────────────

const SOCKET = { x: -14, y: 6, w: 16, d: 26, h: 22 } as const;
const HOLE_Z = 6;

function hole(y: number): ArtShape {
  const x = SOCKET.x + SOCKET.w;
  return solid(poly([[x, y, HOLE_Z], [x, y + 2.5, HOLE_Z], [x, y + 2.5, HOLE_Z + 4], [x, y, HOLE_Z + 4]]), 'ink');
}

const PLUG = { x: 18, y: 10, w: 16, d: 16, h: 12 } as const;
const gap = iso(SOCKET.x + SOCKET.w + 4, 19, 10);

const unplugged: StateArt = {
  id: 'unplugged',
  frame: [17, 3.5],
  duration: 2800,
  accent: 'warning',
  layers: [
    layer('shadow', [
      shadow(box(SOCKET.x, SOCKET.y + 4, 0, SOCKET.w, SOCKET.d, 0).base),
    ]),
    layer('socket', [...solidBox(SOCKET.x, SOCKET.y, 0, SOCKET.w, SOCKET.d, SOCKET.h), hole(13), hole(22)]),
    layer(
      'sparks',
      [
        stroke(`M${gap[0] - 2} ${gap[1] - 7}L${gap[0] - 3.5} ${gap[1] - 11}`),
        stroke(`M${gap[0] + 2} ${gap[1] - 6}L${gap[0] + 5} ${gap[1] - 9}`),
        stroke(`M${gap[0] + 3} ${gap[1] + 5}L${gap[0] + 6} ${gap[1] + 7}`),
      ],
      [
        { at: 0, opacity: 0 },
        { at: 0.3, opacity: 0 },
        { at: 0.32, opacity: 1, ease: 'linear' },
        { at: 0.38, opacity: 0.2, ease: 'linear' },
        { at: 0.42, opacity: 1, ease: 'linear' },
        { at: 0.56, opacity: 0, ease: 'linear' },
        { at: 1, opacity: 0 },
      ],
      gap,
    ),
    layer(
      'plug',
      [
        shadow(box(PLUG.x, PLUG.y + 4, 0, PLUG.w, PLUG.d, 0).base),
        // Cable trailing off the back
        stroke(`M${iso(PLUG.x + PLUG.w, PLUG.y + 8, 6).join(' ')}C${iso(PLUG.x + PLUG.w + 14, PLUG.y + 8, 0).join(' ')} ${iso(PLUG.x + PLUG.w + 10, PLUG.y + 28, 0).join(' ')} ${iso(PLUG.x + PLUG.w + 26, PLUG.y + 30, 0).join(' ')}`, 2.4),
        ...solidBox(PLUG.x, PLUG.y, 0, PLUG.w, PLUG.d, PLUG.h),
        ...solidBox(PLUG.x - 7, 13, HOLE_Z + 0.75, 7, 2.5, 2.5, { top: 'paper', sides: 'paper' }),
        ...solidBox(PLUG.x - 7, 22, HOLE_Z + 0.75, 7, 2.5, 2.5, { top: 'paper', sides: 'paper' }),
      ],
      [
        { at: 0 },
        { at: 0.12 },
        { at: 0.3, x: -4.3, y: -2.5, ease: 'out' },
        { at: 0.36, x: -3.4, y: -2, ease: 'out' },
        { at: 0.42, x: -4.3, y: -2.5, ease: 'out' },
        { at: 0.7, x: 0, y: 0, ease: 'inOut' },
        { at: 1 },
      ],
    ),
    layer(
      'alert',
      [
        solid(circle(gap[0], gap[1] - 26, 6), 'accent'),
        { d: `M${gap[0]} ${gap[1] - 29.2}L${gap[0]} ${gap[1] - 25.6}`, fill: 'none', stroke: 'ink', strokeWidth: 1.8 },
        solid(circle(gap[0], gap[1] - 23.1, 0.5), 'ink'),
      ],
      [
        { at: 0 },
        { at: 0.32 },
        { at: 0.4, scale: 1.18, ease: 'out' },
        { at: 0.52, scale: 1, ease: 'spring' },
        { at: 1 },
      ],
      [gap[0], gap[1] - 26],
    ),
  ],
};

// ── No coach: an invite, waiting to be dropped into place ──────────────────

const TICKET = { x: -6, y: -4, w: 44, d: 28, h: 2.5 } as const;
const TICKET_Z = 14;

function ticket(): ArtShape[] {
  const { x, y, w, d, h } = TICKET;
  const z = TICKET_Z;
  const stub = 12;
  const top = z + h;
  const f = box(x, y, z, w, d, h);
  return [
    solid(f.left, 'shade'),
    solid(f.right, 'shade'),
    solid(f.top),
    solid(box(x + w - stub, y, z, stub, d, h).top, 'accent'),
    ghost(line([[x + w - stub, y + 2, top], [x + w - stub, y + d - 2, top]])),
    // Link glyph: two interlocked rings
    stroke(disc(x + 10, y + 12, top, 4)),
    stroke(disc(x + 16, y + 16, top, 4)),
    stroke(line([[x + 8, y + 23, top], [x + 26, y + 23, top]])),
  ];
}

const ticketFoot = iso(TICKET.x + TICKET.w / 2, TICKET.y + TICKET.d / 2, 0);

const noCoach: StateArt = {
  id: 'noCoach',
  frame: [33, -3],
  duration: 3000,
  accent: 'brand',
  layers: [
    layer(
      'dock',
      [ghost(box(TICKET.x, TICKET.y, 0, TICKET.w, TICKET.d, 0).base)],
      [
        { at: 0 },
        { at: 0.5, scale: 0.9 },
        { at: 1 },
      ],
      ticketFoot,
    ),
    layer('ticket', ticket(), [
      { at: 0 },
      { at: 0.5, y: -4 },
      { at: 1 },
    ]),
    layer('spark1', [solid(sparkle(44, -6, 26))], twinkle(0.25), iso(44, -6, 26)),
    layer('spark2', [solid(sparkle(-16, 16, 26, 2))], twinkle(0.6), iso(-16, 16, 26)),
  ],
};

// ── Lost: the kettlebell is not where the page said it would be ────────────

const KB = { x: 70, y: 66, r: 17 } as const;
const KB_BASE: [number, number] = [KB.x, KB.y + KB.r - 1];

const lost: StateArt = {
  id: 'lost',
  frame: [25.5, 10],
  duration: 3000,
  accent: 'brand',
  layers: [
    layer('spot', [ghost(disc(40, 26, 0, 13)), stroke(line([[38, 24, 0], [42, 28, 0]])), stroke(line([[42, 24, 0], [38, 28, 0]]))]),
    layer('shadow', [shadow(`M${KB.x - 21} ${KB.y + 16}A16 5 0 1 0 ${KB.x + 11} ${KB.y + 16}A16 5 0 1 0 ${KB.x - 21} ${KB.y + 16}Z`)]),
    layer(
      'kettlebell',
      [
        // Handle: a flat-topped volt grip nearly as wide as the bell
        solid(
          `M${KB.x - 14} ${KB.y - 8}L${KB.x - 14.5} ${KB.y - 24}Q${KB.x - 14.5} ${KB.y - 32} ${KB.x - 6.5} ${KB.y - 32}` +
            `L${KB.x + 6.5} ${KB.y - 32}Q${KB.x + 14.5} ${KB.y - 32} ${KB.x + 14.5} ${KB.y - 24}L${KB.x + 14} ${KB.y - 8}` +
            `L${KB.x + 9} ${KB.y - 10}L${KB.x + 9.5} ${KB.y - 22.5}Q${KB.x + 9.5} ${KB.y - 26.5} ${KB.x + 5.5} ${KB.y - 26.5}` +
            `L${KB.x - 5.5} ${KB.y - 26.5}Q${KB.x - 9.5} ${KB.y - 26.5} ${KB.x - 9.5} ${KB.y - 22.5}L${KB.x - 9} ${KB.y - 10}Z`,
          'accent',
        ),
        solid(circle(KB.x, KB.y, KB.r)),
        // Shaded flank and a glint, so the bell reads round
        solid(`M${KB.x} ${KB.y - KB.r}A${KB.r} ${KB.r} 0 0 1 ${KB.x} ${KB.y + KB.r}A${KB.r * 0.62} ${KB.r} 0 0 0 ${KB.x} ${KB.y - KB.r}Z`, 'shade'),
        stroke(`M${KB.x - 10} ${KB.y - 2}A11 11 0 0 1 ${KB.x - 3} ${KB.y - 10}`),
      ],
      [
        { at: 0 },
        { at: 0.18, rotate: -7, ease: 'out' },
        { at: 0.4, rotate: 5, ease: 'inOut' },
        { at: 0.58, rotate: -2.5, ease: 'inOut' },
        { at: 0.72, rotate: 0, ease: 'out' },
        { at: 1 },
      ],
      KB_BASE,
    ),
    layer('mark', [
      stroke(`M${KB.x + 22} ${KB.y - 34}C${KB.x + 22} ${KB.y - 40} ${KB.x + 31} ${KB.y - 40} ${KB.x + 31} ${KB.y - 34}C${KB.x + 31} ${KB.y - 30} ${KB.x + 26.5} ${KB.y - 30} ${KB.x + 26.5} ${KB.y - 26}`, 1.8),
      solid(circle(KB.x + 26.5, KB.y - 21.5, 0.6), 'ink'),
    ], [
      { at: 0, opacity: 1 },
      { at: 0.4, y: -2 },
      { at: 1 },
    ]),
  ],
};

// ── Search: nothing turned up under the lens ───────────────────────────────

const LENS: [number, number] = [74, 40];

function lens(): ArtShape[] {
  const [cx, cy] = LENS;
  const a = Math.PI / 4;
  const hx = (r: number, off: number) => cx + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * off;
  const hy = (r: number, off: number) => cy + Math.sin(a) * r + Math.sin(a + Math.PI / 2) * off;
  return [
    solid(flat([[hx(12, -2.6), hy(12, -2.6)], [hx(28, -2.6), hy(28, -2.6)], [hx(28, 2.6), hy(28, 2.6)], [hx(12, 2.6), hy(12, 2.6)]]), 'accent'),
    solid(circle(cx, cy, 13)),
    stroke(circle(cx, cy, 9.5)),
    stroke(`M${cx - 6} ${cy - 2}A6.5 6.5 0 0 1 ${cx - 1} ${cy - 6.5}`),
  ];
}

const sweep: ArtKeyframe[] = [
  { at: 0 },
  { at: 0.3, x: -20, y: 2 },
  { at: 0.42, x: -20, y: 2 },
  { at: 0.72, x: 12, y: 6 },
  { at: 0.82, x: 12, y: 6 },
  { at: 1 },
];

const search: StateArt = {
  id: 'search',
  frame: [17.5, 5],
  duration: 3600,
  accent: 'brand',
  layers: [
    layer('rows', [0, 1, 2].map((i) => ghost(box(-24 + i * 4, -4 + i * 16, 0, 46, 12, 0).base))),
    layer('lensShadow', [shadow(`M${LENS[0] - 9} ${LENS[1] + 27}A9 3 0 1 0 ${LENS[0] + 9} ${LENS[1] + 27}A9 3 0 1 0 ${LENS[0] - 9} ${LENS[1] + 27}Z`)], sweep),
    layer('lens', lens(), sweep),
  ],
};

/** Every illustration, by id */
export const STATE_ART = {
  plans,
  building,
  inbox,
  caughtUp,
  plates,
  week,
  logbook,
  unplugged,
  noCoach,
  lost,
  search,
} as const satisfies Record<string, StateArt>;

export type StateArtId = keyof typeof STATE_ART;
