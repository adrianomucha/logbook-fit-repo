# Beta Readiness Plan — Web/PWA

**Goal:** make the existing web/PWA build safe to hand to beta testers we don't
know personally, without waiting for a native iOS app.

**Premise:** the gaps that block the beta are not "web vs. native" gaps. They are
notification delivery and offline durability, both of which a native app would
also need. Fixing them on web is cheaper and ships same-day.

**Scope:** four workstreams, W1–W4. W1 and W2 are ship gates. W3 and W4 are
strongly recommended but not blocking.

**Out of scope (deliberately):** service worker, web push, offline app shell,
native iOS. See [Phase 2](#phase-2--after-the-beta-opens) for why these wait.

---

## Current state

What already works, so we don't rebuild it:

| Area | State | Evidence |
| --- | --- | --- |
| PWA manifest | Valid, `display: standalone` | `src/app/manifest.ts` |
| iOS meta | `appleWebApp`, `viewport-fit=cover`, safe-area insets | `src/app/layout.tsx:27-40` |
| Icons | 192/512 + `apple-icon.png` | `public/`, `src/app/` |
| Set-save reliability | Debounced batch PUT, serialized flush, retry queue, `keepalive` flush on `pagehide`, idempotent upsert | `src/hooks/api/useWorkoutExecution.ts:102-192` |
| Session length | 30-day JWT | `src/lib/auth.ts:66` |
| Email transport | Resend via plain `fetch`, best-effort, never throws | `src/lib/services/waitlist-email.ts` |

What's missing:

- **No service worker anywhere in the repo.** No push, no background sync, no offline shell.
- **No transactional email beyond the waitlist.** Nothing fires on check-in sent, check-in response, coach reply, or new message.
- **Pending set writes live only in a ref** (`pendingSetsRef`, `useWorkoutExecution.ts:17`). A backgrounded-then-killed PWA loses them with no on-disk trace.
- **No install affordance.** No `beforeinstallprompt` handler, no iOS Add-to-Home-Screen instruction.

---

## W1 — Notification emails (ship gate)

**Why this is first:** the north-star loop is coach sends check-in → client
responds → coach reviews → coach replies. Every hop needs the other party to
know something happened. With alpha users we nudge them on WhatsApp. Strangers
won't come back on their own, the loop will stall, and we'll misread a missing
delivery channel as a failed feature.

Email over push because Resend is already wired and configured, it works on
desktop and every platform, and it needs no service worker. Push is Phase 2.

### W1.1 — Extract a shared email service

`src/lib/services/waitlist-email.ts` already has the right shape: plain `fetch`
to Resend, best-effort, never throws, silently no-ops when unconfigured. Keep
that contract and generalize it.

- **New** `src/lib/services/email.ts`
  - `sendEmail({ to, subject, html }): Promise<boolean>` — the transport. Never throws.
  - `emailLayout(bodyHtml: string): string` — the dark card shell currently inlined in `welcomeHtml()` (lines 17-46), so every notification looks like the waitlist email.
  - From address: read `EMAIL_FROM`, falling back to `WAITLIST_FROM_EMAIL` so nothing breaks in existing environments.
- **Refactor** `waitlist-email.ts` to call `sendEmail` + `emailLayout`. Behavior unchanged; the existing test in `src/lib/services/__tests__/` must still pass.
- **Update** `.env.example` with `EMAIL_FROM`.

### W1.2 — Notification templates

- **New** `src/lib/services/notification-email.ts`, one function per event:
  - `sendCheckInRequested({ to, clientName, coachName, checkInId })`
  - `sendCheckInResponded({ to, coachName, clientName, checkInId })`
  - `sendCoachReplied({ to, clientName, coachName, checkInId })`
  - `sendNewMessage({ to, recipientName, senderName, preview })`

Each returns a subject + body built on `emailLayout`, with one primary link back
into the app. Deep links are built from `NEXTAUTH_URL`:

| Event | Recipient | Link target |
| --- | --- | --- |
| Check-in requested | Client | `/client/checkin/{id}` |
| Check-in responded | Coach | `/coach` (client workspace surfaces it as the hero card) |
| Coach replied | Client | `/client/checkin/{id}` |
| New message | Either | `/client` or `/coach` by role |

**Copy rule:** these are user-facing, so no em dashes (matches commit `160350c`).
Keep the message-preview snippet short (~120 chars) and escape it — message
bodies are user input going into HTML.

### W1.3 — Wire the triggers

Four routes, all after the DB write succeeds:

| Route | Handler | Notify |
| --- | --- | --- |
| `src/app/api/check-ins/route.ts` | `POST` | Client |
| `src/app/api/check-ins/[id]/client-respond/route.ts` | `POST` | Coach |
| `src/app/api/check-ins/[id]/coach-respond/route.ts` | `POST` | Client |
| `src/app/api/messages/route.ts` | `POST` (line 13) | Recipient |

**Send with `after()` from `next/server`, not a floating promise.** On Vercel the
serverless invocation can be frozen the moment the response returns, which
silently drops a bare `void send(...)`. `after()` is stable in Next 15 and keeps
the work alive past the response. A Resend outage must never fail the request.

Recipient email/name needs a join the routes don't currently do:
`CheckIn.clientId → ClientProfile.userId → User.email/name` (and the coach side
via `CoachProfile`). Add the `include` to the existing query rather than issuing
a second round trip. `Message` is simpler — `recipientId` is already a `User` id.

### W1.4 — Don't spam people

Chat is chatty; one email per message will get us marked as spam and will make
testers mute us.

- **Throttle new-message emails to one per (recipient, sender) per 30 minutes.** `@upstash/ratelimit` and `@upstash/redis` are already dependencies with a wired helper at `src/lib/rate-limit.ts`. Reuse it with a distinct key prefix. Check-in events are low-frequency and are not throttled.
- **Never email on self-send** (guard `senderId !== recipientId`).
- **Add `notifyByEmail Boolean @default(true)` to `User`** (Prisma migration) and honor it in every send path. These are transactional emails so no unsubscribe is legally required, but a tester who can't turn them off will just stop reading them. A minimal toggle in the client/coach settings surface is enough; a full preference center is Phase 2.

### W1.5 — Tests

- Unit: each template renders, escapes the message preview, and includes the right deep link.
- Unit: `sendEmail` no-ops (returns `false`, doesn't throw) when `RESEND_API_KEY` is unset.
- Unit: throttle allows the first message and suppresses the second inside the window.
- Route: a Resend failure still returns 200 from all four endpoints.

---

## W2 — Durable pending-set queue (ship gate)

**Why:** `pendingSetsRef` (`useWorkoutExecution.ts:17`) is memory-only. Gym
basement, dead signal, iOS kills the backgrounded PWA under memory pressure, and
the sets are gone with no on-disk trace. A stranger who loses a workout they just
finished doesn't file a bug, they leave. This is the single worst beta failure
mode and it's a contained fix.

All changes are inside `src/hooks/api/useWorkoutExecution.ts`.

- **Mirror the queue to `localStorage`** under `logbook:pending-sets:v1:{dayId}`, storing the serialized `Map` plus a `savedAt` timestamp.
  - Write in `enqueueSetWrite` (line 199) alongside the existing ref write.
  - Prune persisted entries in `flushSets` (line 126) using the same key-match logic the ref already uses, so writes enqueued mid-flight survive.
  - Clear the persisted entry on the 4xx deterministic-drop path (line 134).
- **Rehydrate on mount**, keyed by `dayId`, then flush once `completionId` resolves. The existing `ensureStarted` path already covers a null `completionId`.
- **Merge the rehydrated queue into the SWR data on load.** This is the part that's easy to miss: after a kill, the optimistic cache is gone, so the user would see their checkmarks unchecked and then pop back on flush. Overlay the queued sets on `data.exercises[].setCompletions` before first render.
- **Fail soft.** Wrap every storage access in try/catch. Private mode and quota-exceeded must degrade to exactly today's in-memory behavior, never throw.
- **TTL.** Drop persisted entries older than 7 days on read, so a stale queue can't resurrect against a since-completed workout. The 4xx path already handles the server rejecting it.

**Tests:** serialize → rehydrate round-trip; rehydrated sets overlay correctly on
fresh SWR data; storage-throws degrades silently; expired entries are dropped.

---

## W3 — Install affordance (recommended)

**Why:** iOS has no `beforeinstallprompt` and there's no instruction anywhere in
the app today. Installing is also what dodges Safari's ITP 7-day storage
eviction, so a tester who installs stays logged in for the full 30-day JWT
(`src/lib/auth.ts:66`) instead of getting bounced to a login screen after going
quiet for a week.

- **New** `src/components/pwa/InstallPrompt.tsx`:
  - Detect already-installed via `matchMedia('(display-mode: standalone)')` and `navigator.standalone` (iOS). Render nothing if installed.
  - **Android/desktop:** capture `beforeinstallprompt`, show an Install button, call `prompt()`.
  - **iOS Safari:** an instructional sheet — Share, then Add to Home Screen. There is no programmatic path.
  - **In-app browsers** (Instagram, Facebook, WhatsApp UA): Add to Home Screen isn't reachable at all. Show "Open in Safari" instead. Invite links get opened from DMs constantly, so this case is not an edge case.
  - Dismissal remembered in `localStorage`, re-offered after ~7 days.
- **Mount** in the authed shells only (`src/app/client/layout.tsx`, the coach equivalent), not on the marketing landing page.
- **Invite copy:** tell people up front it's a web app and to add it to the home screen. Setting the expectation costs nothing; a surprise costs a tester.

---

## W4 — Offline affordance (recommended)

The retry toast at `useWorkoutExecution.ts:150` says "Couldn't save your sets —
retrying. Check your connection." Without a connectivity indicator that reads as
*the app is broken* rather than *you're offline*.

- **New** small `useOnlineStatus` hook (`navigator.onLine` + `online`/`offline` listeners).
- Persistent banner in the workout execution shell while offline, stating that sets are saved locally and will sync. With W2 behind it, that statement is actually true.
- Suppress the retry toast while offline; the banner already says it.

---

## Sequencing

| Step | Work | Rough size |
| --- | --- | --- |
| 1 | W2 (durable queue) + W4 (offline banner) | Small, highest integrity payoff |
| 2 | W1.1–W1.2 (email service + templates) | Medium |
| 3 | W1.3–W1.5 (triggers, throttle, tests) | Medium |
| 4 | W3 (install prompt) | Small |
| 5 | QA pass, then open invites | — |

W2 and W4 are independent of W1 and can land first as their own PR.

**Ship gate for opening beta invites:** W1 and W2 merged and QA'd. W3 and W4
should make it but shouldn't hold the gate.

---

## QA before invites go out

Automated tests won't catch the failures that matter here. On a real iPhone:

1. **Kill test.** Start a workout, log 3 sets, force-quit the PWA from the app switcher, reopen. All 3 sets present and checked. *(W2 — this is the one that matters most.)*
2. **Airplane mode.** Log sets offline, confirm the banner, re-enable, confirm sync without a duplicate or lost set.
3. **Full check-in loop with two real accounts.** Coach sends, client gets email, client responds, coach gets email, coach replies, client gets email. Every deep link lands on the right screen while logged out and then logged in.
4. **Message throttle.** Ten messages in a row produce one email, not ten.
5. **Install paths.** Safari (instruction sheet), Chrome Android (`beforeinstallprompt`), Instagram in-app browser (Open in Safari fallback).
6. **Session survival.** Installed PWA, leave it 8+ days, reopen, still logged in.

---

## Phase 2 — after the beta opens

Not blockers, but this is where the beta feedback will point:

- **Service worker.** Unlocks web push (iOS 16.4+, home-screen-installed PWAs only, needs a user-gesture permission prompt) and an offline app shell. Push replaces email as the primary channel for the check-in loop; email stays as the fallback and the desktop channel. Note the CSP in `next.config.mjs` will need review when a service worker and push endpoint are added.
- **Background sync** for the set queue, replacing the timer-based retry in W2.
- **Notification preference center**, expanding the single `notifyByEmail` flag.
- **Native iOS**, once the beta has told us whether the client-side experience needs it. The coach surface likely never will.
