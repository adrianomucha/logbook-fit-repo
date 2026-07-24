# Launch Posts

For the public launch moment, whenever that comes. Drafted now so it isn't
written in a panic later.

**Read this first:** Product Hunt and Hacker News have close to zero overlap with
independent fitness coaches. These are credibility and backlink plays, not
acquisition. Do them once, cheaply, when the product is stable. Do not delay
beta work for them, and do not measure them by signups, because the signups you
get will mostly be developers who will never coach anyone.

---

## Product Hunt

**Name:** Logbook.fit

**Tagline (60 char limit):**
- `The coaching platform that shows you who's about to quit` (56)
- `Ranks your coaching clients by who needs you today` (50)
- `Catch the client fade before it becomes a refund` (48)

**Description:**

> Logbook.fit is a retention-first platform for independent fitness coaches.
>
> Most coaching apps hand you a wall of client data and leave you to work out
> who's struggling. Logbook does the opposite: it opens on a ranked list of who
> needs you today. At risk first, on track last.
>
> At the center is a structured two-way check-in loop. You send a check-in, your
> client responds with effort, how their body feels, and notes, and you review it
> next to anything they flagged during the week. Then you reply and adjust the
> plan. The whole conversation lives next to the plan instead of scattered across
> WhatsApp.
>
> It's deliberately not for everyone. If you work out alone, it's useless to you.
> It's built for one person: the independent coach who actually gives a damn
> about every client.

**First comment (the maker comment, most important asset on the page):**

> Hey PH,
>
> I built this after watching a coach friend lose four clients in a month and
> not be able to tell me why. We went through them one by one. None had
> complained. All four had just gone quiet for a few weeks, and in every case she
> found out when a payment failed.
>
> Then I found the number that made it a product instead of a favour: research
> cited by the Personal Trainer Development Center found around 60% of clients
> who *achieved their goal* left anyway, because no follow-up plan was offered.
> Sixty percent of the winners.
>
> Coaching software has spent a decade competing on the easy part of the job:
> exercise libraries, program builders, video demos. All solved. Meanwhile the
> genuinely hard part, deciding who needs your attention today, is still done in
> the coach's head at 6am from memory.
>
> So the core design decision here is that the home screen is not a client list.
> It's a triage queue. The client who's crushing it gets pushed to the bottom of
> the screen, because they're fine and they don't need you today.
>
> Happy to answer anything. And if you're a coach: I'd love to know how many days
> of silence would make you worry about someone. My default is 7 and I'm still
> not confident in it.

**Assets needed:** dashboard screenshot (urgency-sorted, with a visibly at-risk
client), the check-in review screen, plan builder, 30-second demo video. The
existing `/landing` images are a starting point.

---

## Show HN

HN is skeptical of consumer SaaS and allergic to marketing language. The version
that works there is technical and understated.

**Title:** `Show HN: Logbook.fit – Coaching software that ranks clients by churn risk`

**Post body:**

> I've been building this for independent fitness coaches, who mostly run their
> businesses on a spreadsheet plus WhatsApp.
>
> The core observation: client churn in coaching is signalled by absence, not by
> events. Nobody sends a "I'm about to quit" message. They just stop replying,
> and every tool a coach owns is event-driven, so silence produces no signal
> anywhere. A spreadsheet only contains what you typed into it. A chat app only
> shows what was said.
>
> So the main thing here is a server-side urgency model that scores each client
> on days since last activity, check-in state, unanswered coach messages, flagged
> exercises from workouts, and plan expiry, then sorts the coach's dashboard by
> that score instead of alphabetically. There's one definition of urgency shared
> by the dashboard and the client detail view, which sounds obvious but was
> actually the second version. The first had two implementations that disagreed
> with each other, which is its own lesson.
>
> Stack is Next.js 15 (App Router), Postgres via Prisma, NextAuth, deployed on
> Vercel. Nothing exotic. The interesting problems have all been modelling ones:
> what counts as "at risk", how to handle a check-in that's never answered
> without deadlocking the scheduler, and whether assigning a plan should share a
> reference or clone it (it clones, after we got burned by editing a template and
> silently changing 12 clients' live programs).
>
> It's in private beta. Happy to go into detail on any of it.

**Expect:** "why not a spreadsheet", "the real problem is coaches don't care",
and someone who has strong opinions about your urgency scoring. Answer all of
them properly. The comment thread is the actual value of an HN post.

---

## Indie Hackers / build-in-public post

Better ICP fit than HN, and the audience rewards specificity about numbers.

**Title:** `Talked to 40 fitness coaches before writing a line of product code. Here's what I got wrong.`

Structure:
1. The origin (the four lost clients).
2. The three assumptions I had going in.
3. Which ones survived contact with actual coaches (the silence problem) and
   which didn't (I was sure they wanted automated client nudges. They hate them,
   because clients can tell it's automated and it's worse than nothing).
4. The one number that changed the product: coaches said 4 days of silence, not 7.
5. Where it is now, honestly, including what's still broken.

Post this only when you have real beta numbers to put in section 5. A
build-in-public post without numbers is just an ad.

---

## Launch day checklist

- [ ] Waitlist form tested on mobile, in a private window, on a slow connection
- [ ] Landing page images loading (not the placeholder slots)
- [ ] `/login` and signup flow working for a brand new account
- [ ] Confirmation email actually sends (Email 0 in `email-sequence.md`)
- [ ] Someone who has never seen the product tries to sign up while you watch and
      say nothing
- [ ] Analytics recording waitlist conversions
- [ ] You are free for the entire day to answer comments, because that is the
      whole job on launch day
