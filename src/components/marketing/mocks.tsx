import {
  CalendarRange,
  Check,
  Copy,
  Flag,
  Gauge,
  Link2,
  ListChecks,
  ListOrdered,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/brand/LogoMark';
import { Reveal } from './Reveal';
import { Avatar, Eyebrow, MonoTag } from './atoms';

// ── Local status meta (kept close to the mock markup) ─────────────
type StatusKey = 'at-risk' | 'due' | 'ready' | 'on-track';
const STATUS: Record<StatusKey, { dot: string; text: string; label: string }> = {
  'at-risk': { dot: 'bg-red-500', text: 'text-red-400', label: 'AT RISK' },
  due: { dot: 'bg-amber-400', text: 'text-amber-300', label: 'CHECK-IN DUE' },
  ready: { dot: 'bg-sky-400', text: 'text-sky-300', label: 'CHECK-IN READY' },
  'on-track': { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'ON TRACK' },
};

// ── Small primitives shared inside mocks ──────────────────────────
function StatusText({ status }: { status: StatusKey }) {
  return (
    <span className={cn('font-mono text-[10px] uppercase tracking-[0.14em]', STATUS[status].text)}>
      {STATUS[status].label}
    </span>
  );
}

/**
 * Effort rating — three states, matching the product's EffortRating enum
 * (EASY / MEDIUM / HARD), not a numeric score. The selected level fills volt.
 */
const EFFORT_LEVELS = ['Easy', 'Medium', 'Hard'] as const;
function EffortPills({ level }: { level: (typeof EFFORT_LEVELS)[number] }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {EFFORT_LEVELS.map((l) => (
        <span
          key={l}
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]',
            l === level
              ? 'bg-brand text-brand-foreground'
              : 'border border-border text-muted-foreground/60'
          )}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HERO — coach dashboard, sorted by urgency
// ══════════════════════════════════════════════════════════════════
function DashRow({
  status,
  initials,
  tint,
  name,
  meta,
  action,
  dim = false,
  delay = 0,
}: {
  status: StatusKey;
  initials: string;
  tint: number;
  name: string;
  meta: string;
  action?: React.ReactNode;
  dim?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5',
          dim && 'opacity-55'
        )}
      >
        <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', STATUS[status].dot)} />
        <Avatar initials={initials} tint={tint} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading text-sm font-semibold text-foreground">{name}</span>
            <StatusText status={status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
        {action}
      </div>
    </Reveal>
  );
}

export function DashboardMock() {
  return (
    <div className="relative">
      <p className="sr-only">
        A preview of the Logbook.fit coach dashboard: clients sorted by urgency — Maya R. is at risk with
        no workout in 6 days, Devon K. has a check-in due, Aisha T. has a check-in ready to review, and 9
        more clients are on track.
      </p>
      <div aria-hidden="true">
        <div className="pointer-events-none absolute -inset-x-10 -top-16 bottom-0 -z-10 volt-glow" />
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-2xl sm:p-4">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />

          <div className="mb-3 flex items-center justify-between px-1">
            <Eyebrow>Today · 12 clients</Eyebrow>
            <MonoTag>Sorted by urgency</MonoTag>
          </div>

          <div className="space-y-2">
            <DashRow
              status="at-risk"
              initials="MR"
              tint={4}
              name="Maya R."
              meta="Hypertrophy Block 2 · 6d since last workout"
              delay={0}
              action={
                <button
                  type="button"
                  tabIndex={-1}
                  className="hidden shrink-0 items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-foreground sm:inline-flex"
                >
                  Send reminder
                </button>
              }
            />
            <DashRow
              status="due"
              initials="DK"
              tint={0}
              name="Devon K."
              meta="Push / Pull / Legs · overdue 8d"
              delay={70}
            />
            <DashRow
              status="ready"
              initials="AT"
              tint={1}
              name="Aisha T."
              meta="Fat Loss Phase 1 · responded 2h ago"
              delay={140}
              action={
                <button
                  type="button"
                  tabIndex={-1}
                  className="cta-breathe hidden shrink-0 items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-foreground sm:inline-flex"
                >
                  Review check-in
                </button>
              }
            />

            <div className="flex items-center gap-3 px-1 pt-1.5">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                On track · 9
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <DashRow status="on-track" initials="SO" tint={3} name="Sam O." meta="Strength Base · trained today" dim delay={200} />
            <DashRow status="on-track" initials="PN" tint={2} name="Priya N." meta="Recomp · 2 days ago" dim delay={240} />
          </div>
        </div>
        <p className="mt-3 pl-1 font-mono text-[11px] text-muted-foreground/70">
          {'// live coach view — no setup, no spreadsheet'}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PROBLEM — the messy "before" (deliberately no volt lime)
// ══════════════════════════════════════════════════════════════════
export function ProblemPanel() {
  return (
    <div className="relative" aria-hidden="true">
      <p className="sr-only">
        An illustration of the scattered status quo: mismatched chat bubbles and a spreadsheet, replaced by
        one clear &quot;at risk&quot; row.
      </p>
      {/* messy stack */}
      <div className="relative mx-auto max-w-sm space-y-2.5">
        <div className="absolute -right-4 -top-6 hidden w-40 -rotate-6 rounded-md border border-border/70 bg-secondary/40 p-2 sm:block">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="h-3 rounded-[3px] bg-muted/60" />
            ))}
          </div>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">
            clients.xlsx
          </p>
        </div>

        {[
          { who: 'right', text: 'workout screenshot', when: 'MON 7:14', kind: 'img' },
          { who: 'left', text: 'still sore?', when: 'WED 21:40', kind: 'text' },
          { who: 'right', text: 'voice note · 0:48', when: 'THU 6:02', kind: 'wave' },
          { who: 'left', text: 'you around this week?', when: 'FRI 18:11', kind: 'text', unread: true },
        ].map((b, i) => (
          <div key={i} className={cn('flex', b.who === 'right' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[75%] rounded-2xl border border-border/70 px-3 py-2',
                b.who === 'right' ? 'bg-secondary/70' : 'bg-card'
              )}
            >
              {b.kind === 'img' && <span className="block h-10 w-24 rounded bg-muted/70" />}
              {b.kind === 'wave' && (
                <span className="flex h-6 items-center gap-[2px]">
                  {[6, 12, 8, 16, 10, 14, 7, 12, 9, 15, 8, 11].map((h, j) => (
                    <span key={j} style={{ height: h }} className="w-[2px] rounded bg-muted-foreground/50" />
                  ))}
                </span>
              )}
              {b.kind === 'text' && <span className="text-sm text-muted-foreground">{b.text}</span>}
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/50">
                  {b.when}
                </span>
                {b.unread && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
                    · unread
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* the one answer */}
      <div className="mt-6 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">→</span>
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-brand/40 bg-brand/[0.06] px-3 py-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
          <Avatar initials="MR" tint={4} size={28} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold text-foreground">Maya R.</span>
              <StatusText status="at-risk" />
            </div>
            <p className="truncate text-xs text-muted-foreground">6d since last workout</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        Three tools → one screen
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// URGENCY — the four-state ladder
// ══════════════════════════════════════════════════════════════════
export function UrgencyLadder() {
  const rows: { status: StatusKey; trigger: string; strong: boolean }[] = [
    { status: 'at-risk', trigger: '5–7d no workout', strong: true },
    { status: 'due', trigger: 'check-in overdue', strong: true },
    { status: 'ready', trigger: 'client responded', strong: true },
    { status: 'on-track', trigger: 'up to date', strong: false },
  ];
  return (
    <div className="relative" aria-hidden="true">
      <p className="sr-only">
        The urgency ladder: At Risk, Check-in Due and Check-in Ready sit above the &quot;all caught up&quot;
        line; On Track sits below it.
      </p>
      <div className="relative rounded-2xl border border-border bg-card p-4 sm:p-5">
        {/* ACT TODAY bracket */}
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center">
            <span className="w-3 flex-1 rounded-l-md border-y border-l border-brand/60" />
          </div>
          <div className="flex-1 space-y-2.5">
            <Eyebrow accent className="mb-1">
              Act today
            </Eyebrow>
            {rows.slice(0, 3).map((r, i) => (
              <Reveal key={r.status} delay={i * 70}>
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3',
                    r.strong ? 'py-3' : 'py-2.5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('h-2.5 w-2.5 rounded-full', STATUS[r.status].dot)} />
                    <StatusText status={r.status} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {r.trigger}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* caught-up divider */}
        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            All caught up
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="pl-6">
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/20 px-3 py-2.5 opacity-70">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <StatusText status="on-track" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
              up to date
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LOOP — the check-in loop diagram
// ══════════════════════════════════════════════════════════════════
function LoopNode({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
          {step}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export function LoopDiagram() {
  return (
    <div className="relative mx-auto max-w-4xl" aria-hidden="true">
      <p className="sr-only">
        The check-in loop in three moves: the coach sends a check-in, the client replies with effort, how
        their body feels and any flagged exercises, then the coach reviews and adjusts the plan — and it
        comes back around.
      </p>
      <div className="pointer-events-none absolute -inset-x-8 -top-10 bottom-0 -z-10 volt-glow opacity-70" />

      {/* connectors (md+) */}
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M18 16 H82 Q92 16 92 30 Q92 46 78 46 H22 Q8 46 8 30 Q8 16 18 16 Z"
          fill="none"
          className="stroke-border"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M18 16 H82 Q92 16 92 30 Q92 46 78 46 H22 Q8 46 8 30 Q8 16 18 16 Z"
          fill="none"
          pathLength={100}
          strokeLinecap="round"
          className="loop-pulse stroke-brand"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="relative grid gap-4 md:grid-cols-3">
        <LoopNode step="01" title="Coach sends">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Mon · 9:02
          </p>
          <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            How did this week land? Anything feel off?
          </div>
        </LoopNode>

        <LoopNode step="02" title="Client replies">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Effort
              </span>
              <EffortPills level="Hard" />
            </div>
            <p className="rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground">
              &ldquo;Legs still smoked from Monday.&rdquo;
            </p>
            <div className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1">
              <Flag className="h-3 w-3 text-amber-300" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200">
                Back squat · felt off
              </span>
            </div>
          </div>
        </LoopNode>

        <LoopNode step="03" title="Coach reviews + adjusts">
          <div className="mb-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            Dropped Thursday&apos;s volume, added a warm-up set. Trust it.
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-foreground">
            <Check className="h-3 w-3" strokeWidth={3} />
            Plan updated
          </span>
        </LoopNode>
      </div>

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        ↻ then it comes back around
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TODAY — the client phone card
// ══════════════════════════════════════════════════════════════════
function ProgressRing({ pct }: { pct: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="-rotate-90">
      <circle cx="12" cy="12" r={r} fill="none" className="stroke-muted" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        className="stroke-brand"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

export function PhoneToday() {
  return (
    <div className="relative flex justify-center" aria-hidden="true">
      <p className="sr-only">
        A preview of a client&apos;s phone showing today&apos;s session — Lower Body B, week 3 of 8 — with
        completed and upcoming sets, and a message from their coach.
      </p>
      <div className="pointer-events-none absolute -inset-6 -z-10 volt-glow" />
      <div className="w-[300px] -rotate-2 rounded-[2.4rem] border border-border bg-card p-2.5 shadow-2xl">
        <div className="rounded-[2rem] border border-border/60 bg-background p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">Tuesday · Week 3 of 8</p>
          <h3 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground">
            Today — Lower Body B
          </h3>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">Back Squat</p>
                <p className="font-mono text-[11px] text-muted-foreground">4 × 5 · 82.5 kg</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-brand/40 bg-brand/[0.06] px-3 py-2.5">
              <ProgressRing pct={0.5} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">Romanian DL</p>
                <p className="font-mono text-[11px] text-muted-foreground">4 × 8 · 60 kg</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">Set 2 / 4</span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 opacity-55">
              <span className="h-6 w-6 rounded-full border border-border" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">Walking Lunge</p>
                <p className="font-mono text-[11px] text-muted-foreground">3 × 12</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-3">
            <LogoMark size={22} className="mt-0.5" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Coach Mara
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">
                Saw you flagged the squat felt heavy — dropped tomorrow&apos;s volume and added a warm-up
                set. Trust it.
              </p>
            </div>
          </div>

          <button
            type="button"
            tabIndex={-1}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-brand font-semibold text-brand-foreground"
          >
            Start workout
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COACH REVIEW — close the loop, split panel
// ══════════════════════════════════════════════════════════════════
export function CoachReviewMock() {
  return (
    <div className="relative" aria-hidden="true">
      <p className="sr-only">
        The coach review view: the client&apos;s check-in — their effort rating and how their body feels, plus
        a note — shown beside the flagged exercise in the plan, with an inline &quot;adjust plan&quot; reply.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        {/* incoming check-in */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Eyebrow className="mb-3">Check-in · Aisha T.</Eyebrow>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Effort
              </span>
              <EffortPills level="Hard" />
            </div>
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                How it feels
              </p>
              <blockquote className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                &ldquo;Left knee twinged on RDLs.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>

        {/* flagged plan block */}
        <div className="rounded-xl border border-border bg-card p-4 sm:mt-8">
          <Eyebrow className="mb-3">Fat Loss Phase 1 · Day 2</Eyebrow>
          <div className="space-y-2">
            <div className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground/80">
              Back Squat · 3 × 8
            </div>
            <div className="flex items-center justify-between rounded-lg border-l-2 border-brand bg-brand/[0.06] px-3 py-2">
              <span className="text-sm text-foreground">Romanian Deadlift · 3 × 10</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                <Flag className="h-3 w-3" /> Flagged
              </span>
            </div>
            <div className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground/80">
              Leg Press · 3 × 12
            </div>
          </div>
        </div>
      </div>

      {/* reply composer */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">
          <span className="text-foreground">Reply:</span> Swapped RDLs for hip thrusts this week and cut a
          set. Let&apos;s protect that knee.
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-foreground">
            <Check className="h-3 w-3" strokeWidth={3} /> Adjust plan
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Plan updated
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// FEATURES — 3-col grid
// ══════════════════════════════════════════════════════════════════
const FEATURES = [
  { icon: ListOrdered, label: 'Urgency dashboard', body: 'Your roster sorted by who needs you first — live, every time you open it.' },
  { icon: CalendarRange, label: 'Visual plan builder', body: 'Draft multi-week programs from an exercise library by muscle group, with your own cues.' },
  { icon: ListChecks, label: 'Live workout execution', body: 'Clients tap through sets, override weight or reps, and flag whatever feels wrong.' },
  { icon: Gauge, label: 'Structured check-ins', body: 'Effort, how the body feels, and notes — a clean signal, not a wall of text.' },
  { icon: PenLine, label: 'Inline plan edits', body: 'A check-in says back off? Adjust the live plan in seconds — they see it next session.' },
  { icon: Link2, label: 'One-link onboarding', body: 'Generate an invite, they sign up, and they are instantly connected to you.' },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        return (
          <Reveal key={f.label} delay={i * 60}>
            <div className="group h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand/40">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/20">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {f.label}
              </p>
              <p className="text-[15px] leading-relaxed text-foreground/90">{f.body}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INVITE — 3-step onboarding rail
// ══════════════════════════════════════════════════════════════════
export function InviteRail() {
  const steps = [
    {
      n: '01',
      label: 'Generate link',
      visual: (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
          <span className="truncate font-mono text-xs text-foreground">logbook.fit/join/9F2K</span>
          <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      ),
    },
    {
      n: '02',
      label: 'Client signs up',
      visual: (
        <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
          <Avatar initials="JD" tint={0} size={26} />
          <span className="h-2 flex-1 rounded-full bg-muted" />
        </div>
      ),
    },
    {
      n: '03',
      label: 'Instantly connected',
      visual: (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-heading text-sm text-foreground">Jordan D.</span>
          <StatusText status="on-track" />
        </div>
      ),
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {steps.map((s, i) => (
        <Reveal key={s.n} delay={i * 90}>
          <div className="relative h-full rounded-xl border border-border bg-card p-5">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute -right-4 top-1/2 hidden h-px w-4 -translate-y-1/2 border-t border-dashed border-brand/50 md:block"
              />
            )}
            <div className="mb-3 flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-brand">{s.n}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </span>
            </div>
            {s.visual}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PROOF — value band (no fabricated numbers)
// ══════════════════════════════════════════════════════════════════
export function ProofBand() {
  const values = [
    { label: 'Coach-first', claim: 'Your voice on every workout, not a faceless PDF.' },
    { label: 'Attention, sorted', claim: "One screen tells you who's slipping before they quit." },
    { label: 'Shaped by coaches', claim: 'Built with independent trainers, in the open, right now.' },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 sm:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 volt-glow opacity-60" />
      <div className="grid gap-8 sm:grid-cols-3">
        {values.map((v, i) => (
          <Reveal key={v.label} delay={i * 80} className="text-center">
            <LogoMark size={26} className="mx-auto mb-3" />
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand">{v.label}</p>
            <p className="mx-auto max-w-[24ch] text-[15px] leading-relaxed text-foreground/90">{v.claim}</p>
          </Reveal>
        ))}
      </div>
      <p className="mx-auto mt-9 max-w-2xl text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-muted-foreground/70">
        Early access is opening to a first group of independent coaches — join the waitlist to help shape
        what ships.
      </p>
    </div>
  );
}
