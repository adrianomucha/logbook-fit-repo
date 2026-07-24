# Email Sequence

The waitlist form already captures emails (`/api/waitlist`, admin export at
`/admin/waitlist`). Right now signup is a dead end: someone raises their hand and
then hears nothing until an invite arrives. That gap is where waitlist intent
goes to die.

Five emails. The job is to keep the problem warm and to make the invite feel
earned rather than random.

---

## Email 0: Instant confirmation (on signup)

**Subject:** `You're on the list`

**Send:** immediately, automated.

> Thanks for putting your name down.
>
> Quick context on what you've signed up for: Logbook.fit is a coaching platform
> built around one idea. Your quietest client is your next cancellation, so the
> app should show you that person first.
>
> We're onboarding coaches in small batches so we can actually talk to each one.
> You'll get your invite within a few weeks.
>
> In the meantime, one question, and I read every reply:
>
> **When you last lost a client, how long were they quiet before you noticed?**
>
> Just hit reply. One line is plenty.
>
> [Name]
> logbook.fit

**Why the question:** replies train the sending domain, they tell you which
waitlist entries are real coaches versus tire-kickers, and the answers are the
raw material for every piece of content in this pack.

---

## Email 1: The stat (day 3)

**Subject:** `60% of the clients who succeed still leave`

> Not the ones who fail. The ones who win.
>
> Research cited by the PTDC found that around 60% of clients who actually
> achieved their goal left anyway, because no follow-up plan was offered.
>
> That's the number that started this whole project, because it reframes churn
> completely. It's not "my coaching wasn't good enough." It's "I had no system
> for the moment after the win," and that's a fixable problem.
>
> The moment a client hits their target is the moment you're most likely to lose
> them. Most coaching software treats it as a celebration screen. It should be
> treated as a red alert.
>
> That's one of the things Logbook flags for you. More soon.

---

## Email 2: The two-week window (day 10)

**Subject:** `Week one they're busy. Week three they're gone.`

> Here's the pattern that shows up in nearly every conversation I have with
> coaches:
>
> **Week 1 of silence:** they're genuinely busy. Work, kids, a cold. Nothing is
> wrong yet.
>
> **Week 2:** they're embarrassed. They've missed sessions, they haven't logged
> anything, and now replying to you means admitting it.
>
> **Week 3:** they've decided. They're just waiting for the payment to fail so
> they never have to say it out loud.
>
> Almost nobody reaches out in week one, because week one doesn't look like a
> problem. Which is exactly why it works. A message in week one reads as a
> check-in. The identical message in week three reads as a save attempt, and they
> can tell.
>
> The hard part isn't knowing this. It's noticing week one is happening, across
> 20 clients, on a Tuesday, when nothing has visibly gone wrong.
>
> That's what the dashboard is for.

---

## Email 3: What it actually is (day 18)

**Subject:** `What you'll get when your invite lands`

> Concretely, here's what's waiting:
>
> **A dashboard that triages for you.** Your roster sorted by who needs you
> today: at risk, check-in due, awaiting your reply, on track. The people who are
> fine are at the bottom, where they belong.
>
> **A real check-in loop.** You send a structured check-in. Your client answers
> with effort, how their body feels, and notes. You review it next to anything
> they flagged during the week, reply, and mark that you're adjusting the plan.
> The whole conversation lives next to the plan instead of scattered across
> WhatsApp.
>
> **A plan builder that doesn't fight you.** Multi-week plans, duplicate and
> reorder exercises, copy across days, your own exercise library with default
> prescriptions and coaching notes.
>
> **Invite-based onboarding.** Send a link with a personal note. Your client signs
> up already connected to you, with your message waiting.
>
> And to be clear about what it isn't: it's not a workout tracker for lifters,
> it doesn't do meal plans, and it won't sync to a watch. It's a tool for the
> coach, not the athlete.
>
> Free through the beta.

---

## Email 4: The invite (when their batch opens)

**Subject:** `Your Logbook.fit invite`

> Your spot's ready.
>
> [Sign in and set up your roster →]
>
> Two things that'll make the first ten minutes worth it:
>
> 1. **Add your three most important clients**, not all of them. The dashboard
>    only gets interesting once there's someone on it to worry about.
> 2. **Send one check-in.** That's the loop the whole product is built around,
>    and it's the fastest way to see whether this is useful to you or not.
>
> One ask in return: when something is confusing, broken, or missing, reply to
> this email and tell me. You're in a small batch specifically so I can act on it.
>
> [Name]

---

## Email 5: The nudge (5 days after invite, only to coaches who haven't activated)

**Subject:** `Did it not click?`

> You grabbed a beta spot last week but haven't set up a roster yet, so I'm
> assuming one of three things:
>
> **You got busy.** Completely fair. It takes about ten minutes and your spot
> isn't going anywhere.
>
> **You looked and it wasn't obvious what to do.** That's on me, and I'd really
> like to know which screen lost you. Reply with one sentence and I'll fix it.
>
> **You've decided it's not for you.** Also fine, and genuinely useful to know.
> Reply with "not for me" and I'll stop emailing about it.
>
> No wrong answer here. I'd just rather know than guess.

**Why this email matters more than it looks:** activation, not signup, is the
metric that matters. This email is the cheapest activation lever you have, and
option three gives you your clearest product feedback of the whole sequence.

---

## Ongoing: the beta update (every 2 to 3 weeks)

Keep it short and make it feel like a workshop, not a newsletter.

> **What shipped:** [2 or 3 things, in plain language]
>
> **What a coach told me:** [one real quote, with permission]
>
> **What I'm unsure about:** [one open question, with a reply prompt]

The third section is the one that gets replies, and replies are what keep the
whole list alive.

---

## Implementation notes

- Sending currently runs through `src/lib/services/waitlist-email.ts`. Emails 1
  through 3 are a straightforward drip and can be scheduled off `createdAt`.
- Email 5 needs an activation check: has this coach invited at least one client?
  That's the same signal used for the "beta coaches activated" metric in
  `DISTRIBUTION.md`, so it's worth having either way.
- Always include a plain-text unsubscribe. Waitlist consent is not a licence to
  keep emailing forever.
- Send from a personal address (`adrian@logbook.fit`), not `noreply@`. The entire
  sequence depends on people replying, and `noreply` tells them not to.
