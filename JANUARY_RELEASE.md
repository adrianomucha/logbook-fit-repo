# January release: what's left

One list of everything between today and the January release. Written
2026-11-13 by checking `FIX_PLAN.md`, `IOS_APP_PLAN.md`, `TESTFLIGHT.md`,
`COACH_UX_BACKLOG.md` and the Notion weekly priorities against the code on
`main` (0144ea2). Those docs stay as background; this is the list to work from.

**Assumed scope (change it here if wrong):** the web app opens to coaches
beyond the hand-invited beta, and the iOS client app is live on the App Store.
No release date is set yet.

Effort: S (under half a day) · M (1 to 2 days) · L (multi-day).
Owner: **A** = Adrian (needs your accounts or your call) · **C** = can be done
in a Claude Code session.

---

## 0. Decide first (these change the rest of the list)

- [ ] **Pick the date.** Everything below is sequenced backwards from it. (A)
- [ ] **Coach signup: open or still invite-only?** Today a coach can only sign
      up from a waitlist invite. Opening it is one env var
      (`OPEN_COACH_SIGNUP=true`), but it also means rewriting the landing page,
      which currently sells a waitlist for a "free private beta". (A)
- [ ] **Free or paid in January?** There is no billing code. If January is
      still free, say so on the landing page and in the terms. If paid, that is
      an L item of its own and should be the first thing started. (A)
- [ ] **Staging database: yes or no.** There is only the production Supabase
      project, so TestFlight builds and App Review both run against production.
      Acceptable for January if decided on purpose. (A)

## 1. iOS app to the App Store (longest lead time, start now)

App Review plus one possible rejection round can take two weeks, and review
slows over the December holidays. Aim to submit by mid-December.

- [ ] **Confirm the first TestFlight build is installed and working.** The
      App Store Connect record exists (`ascAppId` is set in `mobile/eas.json`);
      `IOS_APP_PLAN.md` 4.5 is still unchecked. (A)
- [ ] **Run the six-point smoke test** in `TESTFLIGHT.md` §6 on a real phone:
      sign in, log a set and reopen, push arrives and opens the chat, privacy
      and terms open, delete account is present. (A, S)
- [ ] **`EXPO_TOKEN` GitHub secret** so later builds are one click from
      Actions. (A, S)
- [ ] **Reviewer account on production** via `prisma/seed_reviewer.ts`;
      credentials go in App Store Connect only. (A, S)
- [ ] **External TestFlight group** with at least two real clients for a week
      before submitting. Needs Beta App Review (about a day). (A)
- [ ] **Privacy nutrition labels**: email, name, health and fitness, user
      content. No tracking. (A, S)
- [ ] **Screenshots** for 6.7" and 6.1" from the TestFlight build. (A, S)
- [ ] **Listing copy**: name, subtitle, description, keywords, support URL,
      review notes (text is drafted in `TESTFLIGHT.md` §5). (C drafts, A pastes)
- [ ] **Universal links** so an emailed `logbook.fit/client/...` link opens the
      app. Not built: no `apple-app-site-association`, no `associatedDomains`
      in `mobile/app.json`. Nice to have for 1.0; needs a new build. (C, M)
- [ ] **Point the web install banner at the App Store** once the listing is
      live (`InstallPrompt`). (C, S)
- [ ] **Submit for review.** (A)

## 2. Must fix before real users (verified still open in code)

Silent data loss and dead ends. All of these apply to web and, where there is
a client screen, to `mobile/` as well.

- [ ] **Plan builder swallows save errors.** `PlanEditorDrawer.tsx` has six
      catch blocks and no toast; a failed exercise save or rename looks like it
      worked. (FIX_PLAN 2.7) (C, S)
- [ ] **Rejected set saves vanish.** A 4xx on the sets write drops the batch
      and reverts the checkmarks with no message, on web
      (`useWorkoutExecution.ts`) and in the app
      (`mobile/src/hooks/useWorkoutExecution.ts`). Network failures already
      show a toast; this case does not. (FIX_PLAN 2.8) (C, S)
- [ ] **An empty plan can be assigned.** The assign route never looks at
      exercise count and the modal does not warn. (FIX_PLAN 2.6) (C, S)
- [ ] **Past clients have no read path.** Rows on the Past clients page only
      offer Restore, and the client API 404s on an ended relationship, while
      the copy promises nothing is deleted. Add a read-only view or soften the
      promise. (FIX_PLAN 2.11) (C, M)
- [ ] **Plan card menu shows controls that do nothing.** Duplicate, Archive
      and Restore are never wired, and the "Archived" section can never fill.
      Remove them or build them. (FIX_PLAN 3.3) (C, S to remove)
- [ ] **Builder "Library" tab is a hardcoded list**, not the coach's own
      exercises, and exercises cannot be deleted. (FIX_PLAN 3.4) (C, M)
- [ ] **Waitlist repeat signup says "Watch your inbox" but sends nothing.**
      Resend the confirmation or change the line. (FIX_PLAN 3.9) (C, S)
- [ ] **Unassign plan: confirm it warns that week progress resets** on every
      path. Not verified in this pass. (FIX_PLAN 3.7) (C, S)

## 3. Release safety

- [ ] **End-to-end pass on production** of the whole loop with two real
      accounts: waitlist, invite, coach signup, import or build a plan, invite
      a client, client trains on web and on iOS, check-in, reply, message,
      leave coach, delete account. Write down every stumble. (A + C, M)
- [ ] **Error reporting you will actually see.** There is no Sentry or similar
      SDK in either app; errors go to server logs only. Add one, or at least
      an alert on the existing `[EMAIL_ALERT]` and `[RATE-LIMIT_ALERT]` log
      lines, before strangers arrive. (C, M)
- [ ] **Production env check**: `/admin` health panel is green for mailer,
      Upstash, `NEXTAUTH_URL`, `ADMIN_EMAILS`, cron secrets, Expo push. (A, S)
- [ ] **Confirm both crons ran** in Vercel (`/api/cron/check-ins`,
      `/api/cron/idle-workouts`) and the pg_cron sweep is scheduled. (A, S)
- [ ] **Database backup and restore drill** on Supabase: know the plan's
      retention and restore once into a scratch project. (A, S)
- [ ] **Smoke tests for the routes that guard data**: auth, coach/client
      scoping, the check-in scheduler. Unit tests are strong; there is no
      end-to-end suite. A handful of route tests is enough for January. (C, M)
- [ ] **Refresh `prisma/seed.ts`** so a fresh local or demo database shows
      the shipped product (check-in schedule, plan instances, sample client,
      an invite, a waitlist row). (FIX_PLAN 3.1) (C, M)
- [ ] **Support path**: a support address in the app, the listing and the
      footer, and a decision on who answers it. (A, S)

## 4. Getting coaches in (from the Notion weekly priorities, all unchecked)

- [ ] **Landing page matches the January offer** (waitlist vs open signup,
      free vs paid, App Store badge once live). (C, S to M)
- [ ] **Coach signup journey tested end to end** on a phone: form,
      confirmation email, invite, first login. (A, S)
- [ ] **Conversion tracking**: tell apart visits, signup starts and
      completed signups, by source. Only `@vercel/analytics` page views exist
      today. (C, S)
- [ ] **SEO check**: crawl fixes and Search Console verification shipped in
      October; confirm the pages are indexed and the two supporting pages
      (check-in template, client check-in software) are live and linked. (A, S)
- [ ] **Three coaches through signup unaided**, fix the biggest confusion. (A)
- [ ] **Launch push**: one post, direct outreach to a short list of coaches,
      and a note to everyone on the waitlist. (A)

## 5. Should do if time allows

- [ ] Server validation: `clientFeeling` is still a free string and feedback
      can be empty (FIX_PLAN 3.5; the plan, day and week routes are done). (C, S)
- [ ] Effort rating: `feedbackSent` does not reset between workouts in one
      session (FIX_PLAN 3.6). (C, S)
- [ ] Unfinished workouts from a past week cannot be reopened; only the
      Progress log shows them (rest of FIX_PLAN 2.12). (C, M)
- [ ] "I'll adjust the plan" is recorded but nothing tracks the follow-through
      (backlog 12). (C, S to M)
- [ ] Delete dead files: `prisma/sql/post_00*.sql`,
      `TEST_CASES_PHASE_3_4.md`, the orphaned exercise-library UI and the
      three overlapping exercise datasets (FIX_PLAN 3.8, backlog 31 to 35). (C, S)
- [ ] Update `FIX_PLAN.md` checkboxes; it is out of date (see below). (C, S)
- [ ] Clear out Linear: all 53 issues are the January 2026 MVP plan, still in
      Backlog although most of it shipped. Archive them or stop using it. (A, S)

## 6. Not for January (decided, do not drift)

- Offline workout logging that survives a killed tab or app.
- Coach triage in the iOS app; Android.
- Add, remove and reorder weeks and days in the plan builder.
- Concurrent plan edits (last write wins), roster pagination.
- One account being both coach and client.
- Billing, unless section 0 says otherwise.

---

## Already done since the old lists were written

`FIX_PLAN.md` still shows these as open or deferred. They are in the code:

- Terminated and no-coach clients get an honest screen with Settings and Sign
  out (FIX_PLAN 2.1, 2.2).
- Coach picks the plan start; weeks run in the client's timezone
  (2.12 start date, backlog 19, the deferred timezone item).
- Password change or reset signs out every other device (the deferred session
  item marked "revisit before public launch").
- Weight unit is real, per coach and per client (part of 3.3).
- Sample client is excluded from dashboard counts and the confidence strip is
  gone (3.2).
- Zod validation on plan, day and add-week writes (most of 3.5).
- A failed beta invite email still gives the admin a copyable link (half of 3.9).
- Security pass of early November: admin takeover, upload limits, deleted
  accounts, npm audit at zero.
