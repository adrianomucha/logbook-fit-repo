import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { LogoMark } from '@/components/brand/LogoMark';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { EarlyAccessForm } from '@/components/marketing/EarlyAccessForm';
import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow } from '@/components/marketing/atoms';
import {
  CoachReviewMock,
  DashboardMock,
  FeatureGrid,
  InviteRail,
  LoopDiagram,
  PhoneToday,
  ProblemPanel,
  ProofBand,
  UrgencyLadder,
} from '@/components/marketing/mocks';

export const metadata: Metadata = {
  title: 'Logbook.fit — Early access for coaches',
  description:
    'Logbook.fit is a coach-first fitness platform. See who needs you today, close the loop with structured check-ins, and onboard clients with one link. Join the early-access waitlist — no credit card.',
  openGraph: {
    title: 'Logbook.fit — Early access for coaches',
    description:
      'The coach-first platform that sorts your roster by urgency and turns scattered DMs into one structured check-in loop. Join the early-access waitlist.',
    type: 'website',
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Logbook.fit for me if I coach clients online, in person, or both?',
    a: 'Both. Logbook.fit is built for independent personal trainers and online coaches. Clients execute plans on their phone and you stay in the loop through structured check-ins — whether you also see them in the gym or coach entirely remotely.',
  },
  {
    q: 'What does early access actually get me?',
    a: 'A spot on the waitlist and first access when we open seats to a first group of independent coaches. No credit card, no commitment. You also get a direct say in what we build next — we are shaping the product with real coaches right now.',
  },
  {
    q: 'How do my clients get set up?',
    a: 'You generate an invite link and send it however you already talk to your clients. The moment they sign up they are connected to you — ready for the plan and check-ins you set up. No CSV imports, no account codes, no manual matching.',
  },
  {
    q: 'What is the check-in loop?',
    a: 'A structured two-way loop that replaces scattered DMs. You send a check-in; your client rates their effort, tells you how their body feels, and flags any exercise that felt wrong mid-workout. You review it all in one view, reply, and adjust the live plan if needed. Then it comes back around.',
  },
  {
    q: "How does the urgency dashboard decide who's 'at risk'?",
    a: 'Every client falls into one of four states — At Risk (no workout logged in roughly 5–7 days), Check-in Due, Check-in Ready to review, or On Track — and your roster reorders itself so the client who is slipping sits at the very top. You open the app already knowing your first moves.',
  },
  {
    q: 'Do I need to rebuild my programs from scratch?',
    a: 'You build plans in a visual builder pulling from an exercise library organized by muscle group, with your own sets, reps, and coaching cues. When a check-in tells you to back off or push harder, you edit the live plan inline — no rebuilding a spreadsheet.',
  },
  {
    q: 'How much will it cost?',
    a: 'Pricing is not locked yet — that is part of what early-access coaches help us get right. Joining the waitlist costs nothing and puts no card on file. We will be transparent about pricing well before anyone is asked to pay.',
  },
];

/** Eyebrow + h2 + supporting copy, used to open each content section. */
function SectionHeading({
  id,
  eyebrow,
  heading,
  copy,
  align = 'left',
  className,
}: {
  id: string;
  eyebrow: string;
  heading: React.ReactNode;
  copy: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'} ${className ?? ''}`}>
      <Eyebrow accent dot>
        {eyebrow}
      </Eyebrow>
      <h2
        id={id}
        className="mt-4 font-heading text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl"
      >
        {heading}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  );
}

export default function EarlyAccessPage() {
  return (
    <>
      {/* Force the dark canvas onto the root element too, so mobile overscroll
          and any pre-hydration paint stay near-black rather than flashing the
          app's light default (which only the shared root layout sets). */}
      <style dangerouslySetInnerHTML={{ __html: 'html,body{background-color:hsl(0 0% 3.9%)}' }} />
      <div className="dark min-h-dvh scroll-smooth bg-background font-sans text-foreground antialiased">
        <MarketingNav />

      <main id="top">
        {/* ── HERO ─────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden border-b border-border/60"
        >
          <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40" />
          <div className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] volt-glow" />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:py-28">
            <div>
              <Reveal>
                <Eyebrow accent dot>
                  Early access · for independent coaches
                </Eyebrow>
              </Reveal>
              <Reveal delay={60}>
                <h1
                  id="hero-heading"
                  className="mt-5 font-heading text-4xl font-extrabold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]"
                >
                  Know who needs you today.
                  <br />
                  <span className="text-muted-foreground">Before they ghost.</span>
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Your whole roster, sorted by urgency — at-risk clients first, check-ins waiting to review
                  next, everyone on track quietly at the bottom. Logbook.fit replaces the spreadsheet-plus-WhatsApp
                  scramble with one screen that tells you exactly where to spend your attention.
                </p>
              </Reveal>
              <Reveal delay={180}>
                <div className="mt-8 max-w-lg">
                  <EarlyAccessForm location="hero" size="lg" />
                </div>
              </Reveal>
              <Reveal delay={220}>
                <p className="mt-4 text-sm text-muted-foreground">
                  Already invited?{' '}
                  <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-brand">
                    Sign in
                  </Link>
                </p>
              </Reveal>
            </div>

            <Reveal delay={120} className="lg:pl-4">
              <DashboardMock />
            </Reveal>
          </div>
        </section>

        {/* ── PROBLEM ──────────────────────────────────────── */}
        <section
          id="problem"
          aria-labelledby="problem-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
            <Reveal>
              <SectionHeading
                id="problem-heading"
                eyebrow="The problem"
                heading="The best coaches lose clients in the silence."
                copy="A client goes quiet for a week and you don't notice until they've already decided to quit. The signal was there — no logged workout, a skipped check-in — but it's buried in a spreadsheet tab and three chat threads. Logbook.fit watches the roster so you don't have to, and puts the one client who's slipping at the very top of your screen."
              />
            </Reveal>
            <Reveal delay={80}>
              <ProblemPanel />
            </Reveal>
          </div>
        </section>

        {/* ── URGENCY ──────────────────────────────────────── */}
        <section
          id="urgency"
          aria-labelledby="urgency-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
            <Reveal className="lg:order-2">
              <SectionHeading
                id="urgency-heading"
                eyebrow="Urgency triage"
                heading="An inbox that sorts itself by who's about to slip."
                copy="Every client lands in one of four states and the list reorders itself: At Risk (no workout logged in 5–7 days) rises to the top, then Check-in Due, then Check-in Ready to review, and everyone On Track settles quietly at the bottom. You open the app already knowing your first three moves — no scrolling, no guessing, no 'who did I forget?'"
              />
            </Reveal>
            <Reveal delay={80} className="lg:order-1">
              <UrgencyLadder />
            </Reveal>
          </div>
        </section>

        {/* ── LOOP ─────────────────────────────────────────── */}
        <section
          id="loop"
          aria-labelledby="loop-heading"
          className="relative scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-12">
              <SectionHeading
                id="loop-heading"
                align="center"
                eyebrow="The check-in loop"
                heading="One loop. Four honest moves."
                copy="Coaching happens between the sessions. Logbook.fit turns that space into one structured loop instead of a scattered DM thread: you send a check-in, your client rates effort and how their body feels and flags anything that felt wrong, you review it next to those flags and reply — adjusting the plan right there if it needs it. Then it comes back around."
              />
            </Reveal>
            <Reveal delay={80}>
              <LoopDiagram />
            </Reveal>
          </div>
        </section>

        {/* ── TODAY (client side) ──────────────────────────── */}
        <section
          id="client"
          aria-labelledby="client-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
            <Reveal>
              <SectionHeading
                id="client-heading"
                eyebrow="The client side"
                heading={
                  <>
                    For your clients: it&apos;s not a PDF.
                    <br className="hidden sm:block" /> It&apos;s you, showing up.
                  </>
                }
                copy="Generic apps hand a client a plan and walk away. Logbook.fit opens to today's session — the exact lifts, sets, and loads you programmed for this week — with your voice attached. Your client trains with their hands free, taps through sets, overrides weight or reps when the day calls for it, and flags anything that feels wrong straight to you."
              />
            </Reveal>
            <Reveal delay={80}>
              <PhoneToday />
            </Reveal>
          </div>
        </section>

        {/* ── COACH REVIEW ─────────────────────────────────── */}
        <section
          id="review"
          aria-labelledby="review-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-12">
              <SectionHeading
                id="review-heading"
                align="center"
                eyebrow="Close the loop"
                heading="You review the reply and the flags together."
                copy="The check-in doesn't land in a void — it lands next to the exact exercises your client flagged, inside the plan you built. See the effort, read the note, look at what got flagged, and reply in the same view. Change the plan right there, and your client sees it on their next session."
              />
            </Reveal>
            <Reveal delay={80}>
              <CoachReviewMock />
            </Reveal>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────── */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-12">
              <SectionHeading
                id="features-heading"
                align="center"
                eyebrow="The toolkit"
                heading="Everything the relationship needs, in one place."
                copy="Not another client-facing tracker bolted onto your workflow — a coach-first command center your clients simply plug into."
              />
            </Reveal>
            <FeatureGrid />
          </div>
        </section>

        {/* ── INVITE ───────────────────────────────────────── */}
        <section
          id="invite"
          aria-labelledby="invite-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-12">
              <SectionHeading
                id="invite-heading"
                align="center"
                eyebrow="Onboarding"
                heading="Onboard a client with one link."
                copy="Generate an invite link, send it however you already talk to your clients, and the moment they sign up they're connected to you — ready for the plan and check-ins you set up. No CSV imports, no account codes, no 'what's your email again?'"
              />
            </Reveal>
            <Reveal delay={80}>
              <InviteRail />
            </Reveal>
          </div>
        </section>

        {/* ── PROOF ────────────────────────────────────────── */}
        <section
          id="proof"
          aria-labelledby="proof-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-10">
              <SectionHeading
                id="proof-heading"
                align="center"
                eyebrow="Why it's different"
                heading="Built around the relationship, not solo tracking."
                copy="Three principles we won't compromise on — the reason coaches are joining early."
              />
            </Reveal>
            <Reveal delay={80}>
              <ProofBand />
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="scroll-mt-24 overflow-hidden border-b border-border/60"
        >
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-10">
              <SectionHeading
                id="faq-heading"
                align="center"
                eyebrow="Questions"
                heading="The honest answers."
                copy="Everything a coach wants to know before joining the waitlist."
              />
            </Reveal>
            <Reveal delay={60}>
              <div className="divide-y divide-border border-y border-border">
                {FAQ.map((item) => (
                  <details key={item.q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
                      <span className="font-heading text-base font-semibold text-foreground sm:text-lg">
                        {item.q}
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <p className="pb-5 pr-9 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <section aria-labelledby="cta-heading" className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full volt-glow opacity-80" />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <Reveal>
              <LogoMark size={40} className="mx-auto" />
              <h2
                id="cta-heading"
                className="mx-auto mt-6 max-w-2xl font-heading text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.75rem]"
              >
                Coach on purpose, not whenever a notification surfaces.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                We&apos;re onboarding a first group of independent coaches and their clients. No credit card,
                no commitment — just early access and a direct say in what we build next. Bring the clients
                who keep slipping through the DMs.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <div className="mx-auto mt-9 max-w-lg text-left">
                <EarlyAccessForm location="final-cta" size="lg" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark size={26} />
                <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                  Logbook<span className="text-muted-foreground/60">.fit</span>
                </span>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Coach-first fitness · Early access 2026
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
              <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                FAQ
              </a>
              <Link
                href="/login"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <a href="#top" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Request early access
              </a>
            </nav>
          </div>
          <div className="mt-10 border-t border-border/60 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
              © 2026 Logbook.fit · Built with coaches
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
