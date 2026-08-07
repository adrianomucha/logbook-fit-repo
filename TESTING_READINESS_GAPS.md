# Testing Readiness — Full-Flow Gap Audit

A code-level walkthrough of every journey (landing → waitlist → admin invite →
signup → coach workspace → client app → check-in loop → messaging → termination)
plus the infrastructure around it, done 2026-08-07 on `main` (f17163c). Goal:
what has to be filled before putting the app in front of real testers.

Baseline: **309/309 unit tests pass, production build compiles, lint clean.**
The holes below are flow holes, not build breakage.

Severity tiers:

- **T0 — deploy/config traps**: the staging/prod deploy itself misbehaves.
- **T1 — core loop broken**: the north-star check-in/retention loop doesn't
  work end-to-end.
- **T2 — dead ends**: states a tester can reach with no exit or a false screen.
- **T3 — lying UI**: copy/controls that promise something the code doesn't do.
- **T4 — silent data loss**: user input discarded with no feedback.
- **Defer** at the end.

---

## T0 — Deploy & config traps (fix before anyone touches a URL)

1. **`UPSTASH_REDIS_REST_URL`/`_TOKEN` are read by code but absent from
   `.env.example`.** Without them, rate limiting falls back to a per-lambda
   in-memory Map (`src/lib/rate-limit.ts:29-83`) — effectively no brute-force
   protection on login/signup/reset in any serverless deploy, with only a
   `console.warn`. Also: a Redis outage fails open (`rate-limit.ts:132-140`).
2. **Preview/staging deploys never run migrations.** `package.json:8` gates
   `prisma migrate deploy` on `VERCEL_ENV=production`. A staging deploy against
   a fresh DB builds green and 500s at runtime.
3. **Demo accounts are dead on every deployed build** unless
   `NEXT_PUBLIC_DEMO_MODE=true` was set *at build time* (`src/lib/demo.ts:41-46`,
   `src/lib/auth.ts:29-32`). Testers handed `coach@logbook.fit / demo1234` get
   "Invalid email or password" with no explanation.
4. **`ADMIN_EMAILS` unset/typo'd ⇒ every `/admin` surface 404s for everyone**
   (`src/lib/admin.ts:13`, `src/app/admin/layout.tsx:27-29`) — and since coach
   signup is invite-only by default (`src/app/api/auth/signup/route.ts:95-103`),
   a deploy with neither `ADMIN_EMAILS` nor `OPEN_COACH_SIGNUP` can never mint a
   coach account. Nothing logs why.
5. **Mailer unset ⇒ all three emails (waitlist welcome, beta invite, password
   reset) silently vanish** while the UI says "Watch your inbox"
   (`src/lib/services/email.ts:306-319`, `src/app/api/waitlist/route.ts:48-50`,
   `src/app/api/auth/password-reset/route.ts:50`). The only signal is a banner
   on `/admin` — unreachable if #4 also applies.
6. **`NEXTAUTH_URL` unset ⇒ reset/beta links carry the per-deploy
   `*.vercel.app` hostname** (`src/lib/waitlist.ts:24-31`); a prod deploy
   missing it and the Vercel vars emails `localhost:3000` links.
   `NEXTAUTH_SECRET` unset ⇒ password reset silently sends nothing but still
   answers `{ok:true}` (`src/lib/reset-token.ts:49-50`).
7. **No error reporting anywhere.** No Sentry/OTel; `error.tsx`/
   `global-error.tsx` report to nobody. A tester's 500 leaves no trace. 30 of
   50 API routes have no try/catch, so Prisma failures return HTML 500s where
   clients expect `{error}` JSON.
8. **`/admin` is not in the middleware matcher** (`src/middleware.ts:56`) — a
   signed-out admin gets a bare 404 with no login redirect.

Minimum env for a correct staging deploy: `DATABASE_URL`, `DIRECT_URL`,
`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` (staging origin, else
canonicals point at prod), `RESEND_API_KEY`, `WAITLIST_FROM_EMAIL`,
`ADMIN_EMAILS`, `UPSTASH_REDIS_REST_URL/_TOKEN`, plus `VAPID_*` and
`NEXT_PUBLIC_DEMO_MODE` if in scope.

---

## T1 — The core retention loop doesn't run on its own

1. **Check-ins only materialize when someone loads the right page.**
   `ensureScheduledCheckIn` has exactly three call sites — coach client-detail,
   schedule toggle, client check-ins tab (`src/lib/checkin-schedule.ts:27-37`).
   The coach **dashboard** never calls it, so the roster can show "all clear"
   while check-ins are overdue; a client who stops opening the app — the exact
   user the product exists to catch — never gets one. No cron exists
   (`vercel.json` has no `crons`). Same lazy trigger gates stale-check-in
   expiry.
2. **Auto check-ins default OFF per client** (`prisma/schema.prisma:175`),
   the toggle is buried in a third-level tab and only rendered when a plan is
   assigned (`CheckInHistoryPanel.tsx:72-79`), and its copy — "Auto-sends every
   7 days" — is false per #1.
3. **Push/notifications cover exactly one event: a new chat message.**
   `notifyNewMessage` is the sole caller of the push path
   (`src/app/api/messages/route.ts:162`). No push/in-app signal for: check-in
   arrived, client responded, coach responded, plan assigned, plan ended,
   client joined via invite, flag raised, relationship ended. The coach
   discovers a new client only by reloading.
4. **The flag → coach "north-star" context is dead code on both sides.**
   The API joins and returns `exerciseReference`/`workoutReference`
   (`src/app/api/messages/[userId]/route.ts:92-104`), but the adapter drops
   them (`src/lib/adapters/api.ts:115-130`), so ChatView's rich exercise card
   (`ChatView.tsx:339-357`) never renders. `COACH_UX_BACKLOG.md` #1 is marked ✅
   but this half regressed/never landed. A flag *without* a message reaches no
   coach surface proactively at all.
5. **Coach check-in history renders from a payload that strips the fields it
   displays.** `GET /api/coach/clients/[id]` selects only
   `id,status,effortRating,createdAt,completedAt` (`route.ts:130-136`), so in
   `CheckInHistoryPanel`: client notes, body-feeling, "Your response" (and with
   it the entire edit-response feature), and the "Plan adjustment made" badge
   can never render. History is a date + one emoji. Also capped `take: 5` with
   a "Show all" button that can never show more.
6. **There is a reachable coach state with no way to send a check-in.**
   The workspace check-in section renders only when `plan && activeCheckIn`
   (`UnifiedClientProfile.tsx:698`), which makes `InlineCheckInReview`'s
   "no active check-in" branch (and `onCreateCheckIn`) dead code. A client with
   a plan, no open check-in, and unread messages leaves the coach with no
   button anywhere to start one.
7. **The primary review path hides the flags.** The dashboard "Review Check-in"
   CTA routes to the standalone `/check-in` page (`ClientsRequiringAction.tsx:75`),
   which — unlike the inline workspace review — has no flagged-exercises
   section.
8. **"I'll adjust the plan" is still write-only** (backlog #12): stored boolean,
   zero coach-side consumers, no reminder, no link to an actual edit; the one
   badge that reads it is unreachable per #5.

---

## T2 — Dead ends and false screens

### Client app

1. **Terminated client sees an outright false screen.** Termination nulls the
   plan, so the client gets `WelcomeAwaitingPlan`: *"Your coach is putting your
   training plan together… usually ready within a day or two"* — from a coach
   who just ended the relationship (`ClientDashboard.tsx:457-462`,
   `src/lib/relationship-termination.ts:44-47`). No message, no notice; chat
   history 403s for the client (`api/messages/[userId]/route.ts:69-74`) despite
   "nothing is deleted" copy.
2. **"You're not connected to a coach" screen has no nav, no sign-out, no
   history link** (`ClientDashboard.tsx:388-403`) while claiming "your workout
   history is saved on your account". Progress is unreachable without an active
   plan (`ClientDashboard.tsx:407,418`).
3. **`clientProfile` null ⇒ terminal screen with no nav/sign-out/retry**
   (`ClientDashboard.tsx:372-384`).
4. **Empty or mismatched week renders a page with only a greeting** — no card,
   no CTA, no explanation (`ClientDashboard.tsx:204-210` → `TodayFocusView`).
5. **No week navigation exists**, so once Monday passes, an unfinished week is
   unreachable forever (`WeeklyOverview.tsx:32-35`; progress filters
   `COMPLETED`-only). Plans assigned late in a week give week 1 ~a day; assign
   sets `planStartDate: new Date()` unconditionally
   (`plans/[id]/assign/route.ts:91`).
6. **Coach feedback expires silently on Monday.** The only surface filters to
   this calendar week (`ClientDashboard.tsx:153-165`), is hidden behind the
   weekly toggle on the workout tab (`:626-631`, default is Today), and has no
   badge/notification. Client-side check-in history doesn't exist — after
   submitting, a check-in vanishes until the coach replies.

### Auth / acquisition

7. **An existing account can never accept a coach's invite** — signup 409s
   before invite logic (`api/auth/signup/route.ts:107-115`); no authenticated
   accept path exists. This also means **churned clients can never return**
   (restore is blocked when `endedBy === 'CLIENT'`), and the Past-clients copy
   "can rejoin with a new invite" is false (`PastClientsPage.tsx:45`).
   Backlog #16/#17, confirmed open.
8. **Deep links are always lost at login.** Middleware writes `callbackUrl`
   (`middleware.ts:29`); the login page never reads it
   (`login/page.tsx:42-49`).
9. **Login errors are always "Invalid email or password"** — including
   rate-limited, locked-demo, and soft-deleted accounts (`auth.ts:29-54`,
   `login/page.tsx:37-40`), so a blocked user keeps retrying and digs deeper.
10. **Password reset doesn't invalidate sessions** — 30-day JWTs survive a
    reset (`password-reset/confirm/route.ts:15-17`, `auth.ts:115`). Same for
    the admin reset. Accepted risk, but worth deciding consciously pre-beta.

### Coach app

11. **Past clients are a data black hole**: rows aren't clickable, and both
    detail APIs require an ACTIVE relationship (`coach/clients/[id]/route.ts:26-32`,
    messages 403) — so the "nothing is deleted" promise has no read path.
12. **Plan builder states with no exit**: a plan with no weeks says "try
    deleting it" with only Close (`PlanEditorDrawer.tsx:396-418`); an empty
    week offers no add-day action (`:764-770`). There are no add/delete/reorder
    week-or-day endpoints at all (`POST /plans/[id]/weeks` has zero callers);
    an entirely empty plan can be assigned with no warning.

---

## T3 — UI that promises things the code doesn't do

1. **"Send Reminder" sends nothing** — it just navigates to the profile
   (`ClientsRequiringAction.tsx:46,73-83`). The most important CTA on the
   dashboard.
2. **The invite email field is decorative** — collected, stored, never sent
   (`InviteClientModal.tsx:257-277`, `api/invites/route.ts:39-47`; no
   client-invite template exists in `email.ts`), while `GettingStartedCard.tsx:114`
   shows "Waiting on client@x.com" as if it were.
3. **"Auto-sends every 7 days"** — see T1.
4. **Plan card Archive/Duplicate/Restore don't exist**: menu items render only
   if callbacks are passed and they never are (`PlanTemplateList.tsx:136-143`);
   `archivedAt` isn't a DB column, so the "Archived" section can never be
   non-empty; there's no duplicate endpoint. Backlog #23 open.
5. **The weight-unit (lbs/kg/BW) selector is decorative** — no `weightUnit`
   column, value never sent (`ExerciseEditorDrawer.tsx:399-408`,
   `PlanEditorDrawer.tsx:182`).
6. **"Replace with library exercise" on an existing exercise silently does
   nothing** — the update PUT never sends `name`/`exerciseId`
   (`PlanEditorDrawer.tsx:172-187`, schema omits `exerciseId`).
7. **The builder's "Library" tab is a hardcoded static list**, not the coach's
   real library (`ExerciseEditorDrawer.tsx:17` imports
   `src/lib/exercise-library.ts`); coach-created exercises never appear there.
   Exercises also can't be deleted (no DELETE route) and uniqueness is
   case-sensitive, so "Bench Press"/"bench press" duplicate. Backlog #22 open.
8. **Waitlist repeat-signup shows "Watch your inbox" but no email is ever
   (re)sent** (`api/waitlist/route.ts:41-50`); no resend path exists.
9. **WeeklyConfidenceStrip mislabels buckets** — `NEEDS_PLAN`/`PLAN_ENDED`
   count as "pending · awaiting replies" (`WeeklyConfidenceStrip.tsx:13-17,91`),
   and the sample client is included in all dashboard counts
   (`api/coach/dashboard/route.ts:22-23`).

---

## T4 — Silent data loss

1. **Coach check-in reply is destroyed on failure.** `InlineCheckInReview`
   fires the async complete *without await*, clears the textarea, and shows the
   success screen before the request resolves (`InlineCheckInReview.tsx:158-174`);
   a 409/500 loses the typed response behind a green "sent" screen. Same
   pattern for "start new check-in".
2. **Workout set writes: any 4xx drops the whole batch with no toast**
   (`useWorkoutExecution.ts:133-144`) — triggered by a coach editing the day
   mid-workout, or by the 100-set batch cap (`schemas.ts:255-256`). Checkmarks
   silently revert. The pending queue is in-memory only (killed tab = gone),
   and there's no offline indicator anywhere; `sw.js` deliberately has no fetch
   handler, so a refresh in a dead-zone gym loses the session.
3. **Plan-builder mutations swallow errors across the board** — save/delete
   exercise, rename, emoji, day name, briefing all `console.error` and close as
   if saved (`PlanEditorDrawer.tsx:224-327`).
4. **Effort rating for non-final workouts is unrecoverable** — the "can rate
   later from dashboard" comment is only true for the last workout of the day
   list (`ClientWorkoutExecution.tsx:280-286`); and `feedbackSent` never resets
   between same-session workouts (`ClientDashboard.tsx:51,596`).
5. **Unassign plan** nulls `planStartDate` with no confirm on one of its two
   paths (`InlinePlanEditor.tsx:137-143` — though that component is currently
   unreachable; `UnifiedClientProfile.tsx:311-321`), making week progress
   unrecoverable. All plan PUTs are last-write-wins with no version check.
6. **Signup race returns 500 instead of 409** — no `P2002` branch
   (`api/auth/signup/route.ts:107-115,221-226`); double-submit is possible
   because the button re-enables during navigation (`SignupClient.tsx:181-185`).

---

## Cross-cutting root causes

- **No cron/scheduler of any kind** → lazy check-ins (T1), never-persisted
  invite expiry, no stale-push cleanup.
- **No user timezone field in the schema** → all week/streak/"N days silent"
  math runs on server-local (UTC) or browser-local clocks and they disagree at
  boundaries (backlog #19). Single root cause of several bugs.
- **Adapters drop fields the API already returns** → dead flag-context card,
  gutted check-in history. The server side is often already correct.
- **Notifications were built for messages only** → every other event in the
  retention loop is silent.

## Seed data is ~8 migrations stale

`prisma/seed.ts` sets none of: `checkInScheduleEnabled` (so the seeded
workspace can't demo the auto check-in loop at all), `isSample`,
`sourceTemplateId` (no plan-instance data), `linkedUserId` (account switch has
nothing to switch), `repsMax`, `supersetWithPrevious`; and creates no
`ClientInvite`/`WaitlistEntry` rows. Demo walkthroughs can't reach several
shipped features. Also `prisma/sql/post_00*.sql` are dead legacy files (their
content lives in migrations) and `post_001` has diverged — delete or mark them.

## Test harness gaps (cheap wins)

- No `"test"` script in `package.json` and **no CI at all** (no `.github/`).
  `npx vitest run` passes 309 tests today — wire it up.
- Coverage is 100% pure-function units: zero tests on any of the 50 API
  routes, `middleware.ts`, `auth.ts` authorize, `scoping.ts`, or
  `checkin-schedule.ts` (the scheduler, arguably the most important logic, has
  none).
- `vitest.config.ts` aliases `@prisma` to a directory that doesn't exist.
- `TEST_CASES_PHASE_3_4.md` still describes the pre-DB localStorage UI
  (backlog #35) — retire it or rewrite against the shipped product.

---

## Suggested order of attack before testing

**Round 1 — config & visibility (small, do first):**
T0 items: document Upstash vars in `.env.example`, decide the staging
migration story, set the full env checklist on the deploy, add minimal error
reporting (even a log-drain alert on `[EMAIL_ALERT]`/500s), fix the demo-mode
footgun or drop demo creds from the tester script.

**Round 2 — make the core loop true (the product's promise):**
Cron (Vercel cron → an endpoint that runs `expireStaleCheckIns` +
`ensureScheduledCheckIn` for all enabled clients), default the schedule ON or
surface the toggle at assign time, extend push/in-app notifications to
check-in + plan events, re-wire the adapter so flag context and full check-in
history render, add a "send check-in" button that's always reachable, fix the
no-await data loss in check-in reply.

**Round 3 — remove the traps testers will hit:**
Terminated-client false screen + the three client dead-ends, "Send Reminder"
(rename or implement), invite email field (send it or remove it), existing-
account invite acceptance (or explicitly document the limitation for the
test cohort), empty-plan assignment guard, plan-builder swallowed errors.

**Defer safely:** session invalidation on reset, CSP hardening extras,
pagination, per-exercise progression charts, offline/PWA persistence, E2E
suite, soft-delete purging, waitlist-token expiry.
