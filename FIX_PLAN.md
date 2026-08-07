# Fix Plan — ordered checklist before tester rollout

Derived from `TESTING_READINESS_GAPS.md` (2026-08-07). Work top to bottom:
each phase unblocks the next. Effort: S (&lt; half day) · M (1–2 days) · L (multi-day).

## Phase 0 — Config, deploy & visibility (do first; almost all S)

- [x] **0.1** Add `UPSTASH_REDIS_REST_URL`/`_TOKEN` to `.env.example` with a comment
      that rate limiting is inert on serverless without them; log an
      `[RATE-LIMIT_ALERT]`-style line (not just `console.warn`) when running in
      production without Redis. (`src/lib/rate-limit.ts:29-43`) — S
- [x] **0.2** Boot-time env sanity check: one server-side module that warns loudly
      (log + admin banner) when `ADMIN_EMAILS`, `RESEND_API_KEY`/`WAITLIST_FROM_EMAIL`,
      `NEXTAUTH_URL`, or Upstash vars are missing in production. Extends the
      existing mailer banner pattern (`src/app/admin/layout.tsx:38-56`). — S
- [x] **0.3** Staging migrations: run `prisma migrate deploy` for preview envs too
      (or a dedicated staging branch condition) so a fresh staging DB works.
      (`package.json:8` `vercel-build`) — S
- [x] **0.4** Demo accounts: give locked-demo sign-in its own error message instead
      of "Invalid email or password" (`src/lib/auth.ts:29-32`,
      `src/app/login/page.tsx:37-40`), and add `NEXT_PUBLIC_DEMO_MODE` (build-time!)
      to the deploy checklist in DEVELOPMENT.md. — S
- [x] **0.5** Error reporting: wire Sentry (or at minimum report from
      `src/app/error.tsx` / `global-error.tsx` to a logging endpoint) so tester
      500s leave a trace. Stop rendering raw `error.message` in `error.tsx:14`. — M
- [x] **0.6** Add `/admin/:path*` to the middleware matcher so a signed-out admin
      gets a login redirect instead of a bare 404. (`src/middleware.ts:56`) — S
- [x] **0.7** Password-reset silent no-op: when `createResetToken` returns null or
      the mailer is unconfigured, log an `[EMAIL_ALERT]` line (keep the anti-enumeration
      `{ok:true}` response). (`src/app/api/auth/password-reset/route.ts:44-52`) — S
- [x] **0.8** CI: add `"test": "vitest run"` to package.json and a GitHub Actions
      workflow running install → lint → test → build on PRs. Delete the dead
      `@prisma → generated/prisma` alias in `vitest.config.ts`. — S
- [x] **0.9** Fix login `callbackUrl`: honor it in `src/app/login/page.tsx:42-49`
      (middleware already writes it) so deep links survive re-auth. — S
- [x] **0.10** Distinct login error for rate-limited attempts so blocked users stop
      digging (`src/lib/auth.ts:41-45`). — S

## Phase 1 — Make the core retention loop true

- [ ] **1.1** Cron: add a `vercel.json` cron hitting a new authed endpoint that runs
      `expireStaleCheckIns` + `ensureScheduledCheckIn` for every client with
      `checkInScheduleEnabled`, hourly or daily. (`src/lib/checkin-schedule.ts`) — M
- [ ] **1.2** Surface the check-in schedule at plan-assign time (opt-out, not buried
      opt-in): add the toggle to `AssignPlanModal`/`PlanSetupModal`, and consider
      defaulting `checkInScheduleEnabled` to `true` for new relationships.
      (`prisma/schema.prisma:175`, `CheckInHistoryPanel.tsx:72-79`) — S–M
- [ ] **1.3** Notifications beyond messages: push + in-app toast/badge for
      check-in created (incl. auto), client responded, coach responded, plan
      assigned, client joined via invite. Reuse `notifyNewMessage` pattern in
      `src/lib/push.ts`; call sites in the respective routes. — M
- [ ] **1.4** Re-wire flag context: map `exerciseReference`/`workoutReference` in
      `apiMessagesToMessages` (`src/lib/adapters/api.ts:115-130`) so the existing
      `ChatView` exercise card (`ChatView.tsx:339-357`) renders for both parties. — S
- [ ] **1.5** Fix coach check-in history payload: include `clientFeeling`,
      `painBlockers`, `coachFeedback`, `planAdjustment` in
      `GET /api/coach/clients/[id]` (`route.ts:130-136`) so notes, "Your response",
      edit-response, and the adjustment badge actually render; raise/paginate the
      `take: 5` cap (and the workout `take: 10`). — S–M
- [ ] **1.6** Always-reachable "Send check-in": render the check-in section (or a
      header action) when a plan exists but no active check-in, un-deadening
      `InlineCheckInReview`'s empty branch. (`UnifiedClientProfile.tsx:698,552-554`) — S
- [ ] **1.7** Fix check-in reply data loss: await `onCompleteCheckIn` /
      `onStartNewCheckIn` before clearing state and showing success; show the error
      inline and keep the draft on failure. (`InlineCheckInReview.tsx:158-174`,
      `UnifiedClientProfile.tsx:145-156,246-261`) — S
- [ ] **1.8** Show flagged exercises on the standalone `/check-in` page (the path the
      dashboard CTA uses), or route the CTA to the inline workspace review.
      (`ClientCheckIn.tsx`, `ClientsRequiringAction.tsx:75`) — S–M
- [ ] **1.9** Client-side check-in visibility: a "sent — waiting on your coach"
      state after submitting, and a persistent feedback/history surface that does
      not expire on Monday (drop the `startOfWeek` filter, add a simple list).
      (`ClientDashboard.tsx:146-165,626-631`, `CoachFeedbackCard.tsx:14-16`) — M
- [ ] **1.10** Notify the coach roster: call `ensureScheduledCheckIn` (batched) from
      the dashboard route, or rely on 1.1's cron — either way the dashboard must not
      show "all clear" while check-ins are overdue.
      (`src/app/api/coach/dashboard/route.ts`) — S (falls out of 1.1)

## Phase 2 — Dead ends, false screens, tester traps

- [ ] **2.1** Terminated client: honest "Your coaching with X has ended" screen with
      nav + sign-out, instead of `WelcomeAwaitingPlan`'s "your coach is putting your
      plan together". Detect via ended relationship, not just missing plan.
      (`ClientDashboard.tsx:388-403,457-462`, `src/lib/relationship-termination.ts`) — M
- [ ] **2.2** Add `ClientNav`/`AccountMenu` (at minimum sign-out) to the no-coach and
      no-clientProfile screens. (`ClientDashboard.tsx:372-403`) — S
- [ ] **2.3** Empty/mismatched week: explanatory state with a "message your coach"
      CTA instead of a bare greeting. (`ClientDashboard.tsx:204-210`,
      `TodayFocusView.tsx:65`) — S
- [ ] **2.4** "Send Reminder": implement it (send a nudge message/push) or rename to
      "View client". (`ClientsRequiringAction.tsx:46,73-83`) — S
- [ ] **2.5** Invite email field: either send a real client-invite email (new
      template in `src/lib/services/email.ts`, send from `POST /api/invites`) or
      remove the field and fix "Waiting on client@x.com" copy.
      (`InviteClientModal.tsx:257-277`, `GettingStartedCard.tsx:114`) — S–M
- [ ] **2.6** Empty-plan guard: block (or warn on) assigning a plan with zero
      exercises; return day/exercise counts from `GET /api/plans`.
      (`plans/[id]/assign/route.ts:82`, `plans/route.ts:26-29`) — S–M
- [ ] **2.7** Plan-builder error surfacing: replace the seven swallowed catches with
      toasts and don't close drawers on failure.
      (`PlanEditorDrawer.tsx:197-327`, `ExerciseEditorDrawer.tsx:167-172`) — S–M
- [ ] **2.8** Workout set-write 4xx: toast "couldn't save these sets" instead of
      silently reverting; keep ≤100-set batches (chunk the flush).
      (`useWorkoutExecution.ts:133-144`, `schemas.ts:255-256`) — S
- [ ] **2.9** Signup hardening: handle Prisma `P2002` as 409, keep the submit button
      disabled through navigation. (`api/auth/signup/route.ts:107-115,221-226`,
      `SignupClient.tsx:181-185`) — S
- [ ] **2.10** Existing-account invite acceptance: authenticated accept path
      (`POST /api/invites/[token]/accept` for a signed-in CLIENT with no active
      coach), which also gives churned clients a way back; fix the false
      "can rejoin with a new invite" copy meanwhile. (`api/auth/signup/route.ts:107-115`,
      `PastClientsPage.tsx:45`) — L (copy fix is S — do that immediately)
- [ ] **2.11** Past-client read-only view: make rows clickable to a read-only
      profile (history + conversation), per the "nothing is deleted" promise —
      or soften the promise. (`PastClientsPage.tsx:29-64`,
      `coach/clients/[id]/route.ts:26-32`, `messages/[userId]/route.ts:69-74`) — M
- [ ] **2.12** Week math honesty: snap `planStartDate` to the coming Monday (or ask
      the coach) on assign, and add prev-week navigation so unfinished weeks aren't
      stranded. (`plans/[id]/assign/route.ts:91`, `WeeklyOverview.tsx:32-35`) — M

## Phase 3 — Copy truth, seed, cleanup (before or during the test round)

- [ ] **3.1** Refresh `prisma/seed.ts`: set `checkInScheduleEnabled`, use plan
      instances (`sourceTemplateId`), `isSample`, `linkedUserId`, `repsMax`,
      `supersetWithPrevious`; add a `ClientInvite` + `WaitlistEntry`; fix
      QUICKSTART's "1 coach, 1 client" count. — M
- [ ] **3.2** Exclude the sample client from dashboard counts and fix
      `WeeklyConfidenceStrip` bucket labels (`NEEDS_PLAN`/`PLAN_ENDED` ≠
      "awaiting replies"). (`api/coach/dashboard/route.ts:22-23`,
      `WeeklyConfidenceStrip.tsx:13-17,91`) — S
- [ ] **3.3** Remove or implement decorative controls: weight-unit selector,
      "replace with library exercise" on existing rows, plan Archive/Duplicate/
      Restore menu + permanent-empty "Archived" section.
      (`ExerciseEditorDrawer.tsx:399-408`, `PlanEditorDrawer.tsx:172-187`,
      `PlanTemplateList.tsx:66,136-143`) — M
- [ ] **3.4** Builder "Library" tab = the coach's real library, not the static
      dataset; add exercise DELETE (soft-delete via existing `deletedAt`) and
      case-insensitive uniqueness. (`ExerciseEditorDrawer.tsx:17`,
      `api/exercises/[id]/route.ts`, hardening migration index) — M
- [ ] **3.5** Server validation parity: zod on `PUT /api/plans/[id]`,
      `PUT /api/days/[id]`, `POST /api/plans/[id]/weeks`; `clientFeeling` as enum;
      non-empty `coachFeedback`; align length caps (flag note 200 vs 500).
      (`schemas.ts:170-179`, respective routes) — S–M
- [ ] **3.6** Effort-feedback fixes: key `feedbackSent` to completion id; stop
      claiming "can rate later" for non-final workouts.
      (`ClientDashboard.tsx:51,596`, `ClientWorkoutExecution.tsx:280-286`) — S
- [ ] **3.7** Unassign-plan confirm on all paths + warn that week progress resets.
      (`UnifiedClientProfile.tsx:311-321`) — S
- [ ] **3.8** Delete dead files: `prisma/sql/post_00*.sql` (content lives in
      migrations), unreachable `InlinePlanEditor` menu, `TEST_CASES_PHASE_3_4.md`
      (retire or rewrite), stale "no self-serve reset" comment in the admin
      password route. — S
- [ ] **3.9** Waitlist: allow re-triggering the confirmation email (or change the
      repeat-signup copy); return `inviteUrl` to `InviteActions` so a failed email
      still yields a copyable link immediately.
      (`api/waitlist/route.ts:41-50`, `InviteActions.tsx:39-51`) — S

## Explicitly deferred (decide, don't drift)

- Session invalidation on password reset (30-day JWTs survive) — accepted risk,
  revisit before public launch.
- Offline/PWA set-queue persistence (localStorage mirror) and offline indicator.
- User timezone field + consistent week/streak math (root cause of #19).
- E2E test suite; route-level tests for auth/scoping.
- Pagination (invites `take:20`, check-ins, workouts) beyond the caps raised in 1.5.
- Per-exercise progression view; coach message inbox; CSP `object-src`/`base-uri`;
  waitlist beta-token expiry; soft-delete purging; admin audit log.
