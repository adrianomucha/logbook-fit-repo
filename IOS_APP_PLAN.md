# iOS App — Plan

How to get Logbook.fit onto the App Store without forking the product.
Written 2026-09-01 from a code-level read of `main` (9307c13). Companion to
`FIX_PLAN.md` and `COACH_UX_BACKLOG.md`; same effort scale (S < half day,
M 1–2 days, L multi-day).

---

## 0. Where we stand

What already exists and carries over:

- **A complete JSON API.** 57 route handlers under `src/app/api`, every one
  role-scoped through `withCoach` / `withClient` (36 routes) or a direct
  `getServerSession` call (14 routes). Zod validation on writes. Nothing in
  the client journey needs a new data endpoint.
- **Auth is JWT already** — NextAuth credentials provider, `session.strategy:
  "jwt"`, 30-day tokens. The only web-ism is that the token travels in a
  cookie. A native app needs the same token in an `Authorization` header.
- **Push exists, but Web Push only.** `lib/push.ts` has six `notify*` entry
  points (message, check-in sent/response/feedback, plan assigned, client
  joined) fanning out over `PushSubscription` rows. The transport is VAPID /
  service worker; a native app needs an APNs path through the same entry
  points.
- **A mobile-shaped client UI.** The client role is the phone user: Today
  view, weekly overview, live workout execution (debounced set upsert with an
  offline-tolerant queue in `useWorkoutExecution`), check-in response, chat,
  progress. All of it already fights iOS Safari: `useKeyboardInset`, the
  `no-store` fetch workaround, `visibilitychange` re-polling, the one-shot
  install banner in `InstallPrompt`.
- **Shareable pure logic** (~1,100 lines, all unit-tested): `types/api.ts`
  (22 response types), `types/index.ts`, `lib/reps.ts`, `lib/superset.ts`,
  `lib/workout-week-helpers.ts`, `lib/timezone.ts`, `lib/feeling-display.ts`,
  `lib/checkin-display.ts`, `lib/adapters/api.ts`, `lib/validations/schemas.ts`.

What is missing for an App Store submission, regardless of stack:

- Token-based login for non-browser clients.
- APNs delivery.
- **Account deletion.** App Store guideline 5.1.1(v) requires in-app account
  deletion for any app with account creation. Backlog #30: soft-delete infra
  exists, no endpoint.
- A reviewer account that works against production. The seeded demo logins
  are locked on deployed builds (`NEXT_PUBLIC_DEMO_MODE`), so App Review would
  get "demo sign-in is off".

---

## 1. Decisions

### 1.1 Who the iOS app is for: the client, first

The coach workspace (plan builder, exercise drawers, Excel import, 1,031-line
`UnifiedClientProfile`) is desktop work. The client's entire product is
phone-in-hand at the gym plus a check-in on the couch. Push notifications are
the retention loop's delivery mechanism, and Web Push on iOS only reaches
people who installed the PWA — which most never do. That is the gap a native
app closes.

**v1 = client app.** A coach who signs in sees a short "your workspace is on
the web" screen with a link. A coach *triage* companion (urgency list, chat,
check-in review — all read endpoints exist) is a later phase, not v1.

### 1.2 Stack: Expo (React Native) + EAS, not SwiftUI, not Capacitor

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Expo / React Native** | Shares TS types, zod schemas, adapters, helpers and the SWR hook pattern. EAS Build compiles iOS in the cloud, so Claude Code sessions (this repo's whole workflow) can ship builds without a Mac in the loop. Android comes nearly free later. | Screens are rewrites (DOM/Tailwind → RN). One more toolchain. | **Recommended** |
| SwiftUI | Best native feel. | Second language; duplicates every helper and validator; every change needs Xcode on a Mac; nothing Claude can build or test from here. | Not now |
| Capacitor wrapping the deployed site | Days, not weeks. | It's the PWA in a box: same Safari keyboard/cache quirks, and a remote-URL wrapper is an App Review 4.2 ("minimum functionality") risk. Doesn't fix the reasons to go native. | No |
| Stay PWA | Zero cost. | No store presence, no reliable push, no home-screen default. | Already where we are |

Styling: **NativeWind** so `tailwind.config.js` tokens (colors, IBM Plex
faces, spacing) port as-is and the two apps stay visually one product.

### 1.3 Repo shape: one repo, npm workspaces, web stays at the root

Moving the Next app to `apps/web` would churn every doc, the CI file and the
Vercel root directory on an active codebase. Instead the root `package.json`
becomes a workspace root that is *also* the web app:

```
/                     Next.js web app (unchanged location, unchanged Vercel config)
├── packages/shared/  @logbook/shared — pure TS moved out of src/ (see §3.1)
└── mobile/           Expo app
```

`"workspaces": ["packages/*", "mobile"]`. Vercel keeps building the root.
Files moved into `packages/shared` leave a one-line re-export shim at their
old `src/` path, so the web app does not change a single import.

---

## 2. Phase 1 — Backend prerequisites (no Xcode needed)

Everything here is server-side TypeScript with vitest coverage, and unblocks
the app work. Do it first; it is also independently useful to the web app.

- [x] **1.1 Bearer-token sessions.** New `src/lib/session.ts` exporting
      `getSession(req)`: when an `Authorization: Bearer <jwt>` header is
      present, `decode()` it with `next-auth/jwt` (same `NEXTAUTH_SECRET`,
      same claims `userId`/`role`/`email`/`name`) and return a `Session`-shaped
      object; otherwise fall back to `getServerSession(authOptions)`. Switch
      `withAuth.ts` and the 14 direct `getServerSession` callers to it
      (mechanical). `src/middleware.ts` only matches pages, so it is untouched.
      Reject soft-deleted and demo-locked users exactly as the cookie path
      does. — M
- [x] **1.2 `POST /api/auth/mobile/login`.** `{email, password}` →
      `{token, expiresAt, user}`. Extract the credential checks from the
      NextAuth `authorize` (demo lock, `loginLimiter` by IP+email, bcrypt,
      `deletedAt: null`) into a shared `lib/credentials.ts` so web and mobile
      cannot drift. Mint with `encode()` from `next-auth/jwt`, 30 days like
      the web. — S
- [x] **1.3 `POST /api/auth/mobile/refresh`.** Valid token in → fresh token
      out (sliding expiry), so a daily user is never logged out. Same
      demo/deleted checks. — S
- [x] **1.4 APNs via Expo push.** Migration: `PushSubscription` gains
      `provider PushProvider @default(WEB)` (`WEB | EXPO`); `p256dh`/`auth`
      become nullable; `endpoint` holds the Expo push token for `EXPO` rows
      (its `@unique` still dedupes per device). `sendPushToUser` fans out per
      provider — `web-push` as today, `expo-server-sdk` for `EXPO`, chunked,
      with `DeviceNotRegistered` receipts deleting the row like 404/410 do.
      `PushPayload.url` becomes `data.url` so the app can deep-link; `tag`
      becomes the thread id. `POST/DELETE /api/push/subscription` accept
      `{provider: "EXPO", token}`. `GET /api/push/config` reports Expo push as
      always-enabled (no VAPID needed for that path). Extend
      `lib/__tests__/push.test.ts`. — M
- [x] **1.5 `DELETE /api/me` (account deletion).** Soft-delete the user
      (`deletedAt`), end the coaching relationship through
      `lib/relationship-termination.ts`, delete push subscriptions, invalidate
      the session (auth already refuses `deletedAt != null`). Password
      re-entry in the body for confirmation. Expose it in the web account menu
      too — it is a backlog item (#30) anyway. — M
- [x] **1.6 Reviewer accounts.** Seed script (not the demo seeder) that
      creates a real coach + client pair with an assigned plan, a pending
      check-in and a message thread, for App Review notes. Run once against
      production; document the credentials in the App Store Connect review
      notes only, never in the repo. — S
- [x] **1.7 CI.** Add `mobile` typecheck + jest + eslint to `ci.yml`; add
      `packages/shared` tests to the existing vitest run. — S

Deliverable: the web app is unchanged for users, every API route accepts a
bearer token, and the check-in loop can reach a phone through APNs.

---

## 3. Phase 2 — The client app

### 3.1 Extract `@logbook/shared` — M ✅ done

Move, with re-export shims left behind:

| From `src/` | Why the app needs it |
|-------------|----------------------|
| `types/api.ts`, `types/index.ts` | Every response type |
| `lib/reps.ts`, `lib/superset.ts` | Prescription formatting, superset grouping in the workout screen |
| `lib/workout-week-helpers.ts`, `lib/timezone.ts` | Current-week math must agree with the server |
| `lib/feeling-display.ts`, `lib/checkin-display.ts` | Check-in labels |
| `lib/adapters/api.ts` | API → domain mapping |
| `lib/validations/schemas.ts` | Client-side validation mirrors the server |
| `lib/api-client.ts` | Split: keep the `ApiError` + response handling shared, inject the base URL and auth header per platform |

Rule for what goes in: pure TS, no `window`, no `next/*`, no React DOM.
Anything with a test file in `lib/__tests__` moves with its test.

### 3.2 Scaffold — S ✅ done (`mobile/`, see its README)

`npx create-expo-app mobile` with expo-router, TypeScript, NativeWind, SWR,
`expo-secure-store` (token), `expo-notifications`, `expo-haptics`. Three EAS
build profiles: `development` (dev client, staging API), `preview`
(TestFlight, staging API), `production`. API base URL is a per-profile env,
never hard-coded.

**Route parity rule:** the expo-router file tree mirrors the web's
`/client/*` paths (`/client`, `/client/workout/[dayId]`,
`/client/checkin/[id]`). Push payloads already carry web paths in `url`;
mirroring means the same payload deep-links both apps with no translation
table.

### 3.3 Screens, in build order

Each maps 1:1 onto endpoints that exist today.

| # | Screen | Endpoints | Web source to port | Effort |
|---|--------|-----------|--------------------|--------|
| 1 | Sign in / session gate ✅ | `POST /api/auth/mobile/login`, `/refresh`, `GET /api/me` | `app/login/page.tsx`, `useCurrentUser` | S |
| 2 | Today + weekly overview (tab 1) ✅ | `GET /api/client/week-overview`, `/plan`, `/coach` | `views/ClientDashboard.tsx`, `components/client/today/*`, `weekly/*` | M |
| 3 | Workout execution (route stub in place) | `GET /api/client/workout/day/[id]`, `POST /workout/start`, `PUT /workout/[id]/sets`, `POST /finish`, `/restart`, `/flag` | `views/ClientWorkoutExecution.tsx`, `components/client/execution/*`, `hooks/api/useWorkoutExecution.ts` | L |
| 4 | Check-in respond + history | `GET /api/client/check-ins`, `GET /api/check-ins/[id]`, `PUT /api/check-ins/[id]/client-respond` | `views/ClientCheckIn.tsx`, `ClientCheckInForm.tsx` | M |
| 5 | Chat with coach (tab 2) | `GET /api/messages/[userId]`, `POST /api/messages`, `GET /api/messages/unread` | `components/chat/ChatView.tsx`, `hooks/api/useMessages.ts` | M |
| 6 | Progress (tab 3) | `GET /api/client/progress` | `components/client/progress/*` | S |
| 7 | Account: timezone sync, notifications toggle, feedback, sign out, **delete account** | `PUT /api/account/timezone`, `POST/DELETE /api/push/subscription`, `POST /api/feedback`, `DELETE /api/me` | `AccountMenu.tsx`, `NotificationToggle.tsx` | M |
| 8 | Empty / edge states: no coach yet, awaiting plan, plan ended | already in the `week-overview` payload (`planEnded`) and `/api/me` | `WelcomeAwaitingPlan.tsx`, `SessionCompleteCard.tsx` | S |

Port the *hook logic* nearly verbatim — `useWorkoutExecution`'s single-flight
start, pending-set queue and serialized flush are exactly what a flaky gym
connection needs — and rewrite only the render layer. Replace `sonner` with
a native toast, `visibilitychange` with `AppState`, `useKeyboardInset` with
`KeyboardAvoidingView` (this is one of the things going native fixes for
free).

Coach role: one screen, "Your coaching workspace lives at logbook.fit", with
an open-in-browser link. No coach UI in v1. ✅

Toolchain notes from the scaffold (2026-09-02): Expo SDK 57, expo-router,
NativeWind 4, TypeScript 6. `npx expo install` can't reach Expo's API from a
Claude Code session (proxy), so dependency versions come from
`node_modules/expo/bundledNativeModules.json` and are installed with plain
npm. `babel-preset-expo` and `@expo/metro-runtime` must be top-level deps.
`npm run export:ios` is the no-Xcode build check and runs in CI.

---

## 4. Phase 3 — Push, deep links, TestFlight

- [ ] **4.1 Permission flow.** Ask on the first meaningful moment (after the
      first workout is finished or the first check-in answered), never on
      launch. Register the Expo token with `POST /api/push/subscription`;
      unregister on sign-out and on account deletion. — S
- [ ] **4.2 Deep links.** `expo-notifications` response listener → router push
      to `data.url`. Universal links for `https://logbook.fit/client/*`
      (apple-app-site-association served by Next from `public/.well-known`),
      so a link in an email opens the app when installed. — M
- [ ] **4.3 Foreground refresh.** On `AppState` → active, revalidate the
      week overview, unread count and the open thread — the native equivalent
      of the `visibilitychange` fix. — S
- [ ] **4.4 Haptics + keyboard.** Set toggle and finish get `expo-haptics`;
      weight/reps inputs use `KeyboardAvoidingView` with numeric pads. — S
- [ ] **4.5 First TestFlight.** `eas build --profile preview` +
      `eas submit`. Needs (owner, on a Mac once): Apple Developer enrollment,
      bundle id `fit.logbook.app`, EAS project, credentials generated by EAS.
      After that first setup, builds run from CI/cloud. — M

---

## 5. Phase 4 — App Store readiness

- [ ] Account deletion reachable in-app (§2 1.5) — hard requirement.
- [ ] Privacy nutrition labels: email, name, health & fitness (workout logs),
      user content (messages). No tracking SDKs — `@vercel/analytics` is
      web-only and does not ship in the app.
- [ ] Privacy policy and terms URLs → existing `/privacy`, `/terms`.
- [ ] Review notes with the §2 1.6 reviewer credentials and a two-line
      description of the coach/client relationship (reviewers cannot invite
      themselves).
- [ ] Screenshots for 6.7" and 6.1" from the preview build.
- [ ] App name "Logbook.fit", subtitle from `SITE_DESCRIPTION`.
- [ ] Sign in with Apple is **not** required: the app offers no third-party
      social login, only email/password.

---

## 6. Later (explicitly out of v1)

- **Coach triage app**: urgency-sorted roster (`GET /api/coach/dashboard`),
  chat, inline check-in review. Every endpoint exists; it is UI work.
- **Offline workout logging**: persist the pending-set queue to disk
  (`expo-sqlite` or MMKV) and replay on reconnect. The current in-memory
  queue already survives a request failure, so this is an upgrade, not a fix.
- **Android**: same codebase, `eas build -p android`.
- **Live Activity / Dynamic Island** for an in-progress workout.
- Retire `InstallPrompt` on iOS once the store listing exists (point at the
  App Store instead of the Share sheet).

---

## 7. What can run where

| Work | From a Claude Code cloud session | Needs the owner's Mac |
|------|----------------------------------|-----------------------|
| Phase 1 (all backend), §3.1 shared package, CI | ✅ full, with vitest | — |
| Phase 2 screens | ✅ code, typecheck, jest, lint | Simulator/device run to check feel |
| EAS builds | ✅ once the EAS project exists | First-time Apple credentials, `eas login` |
| TestFlight, screenshots, App Store Connect | — | ✅ |

---

## 8. Suggested order of PRs

1. `feat(api): bearer sessions + mobile login/refresh` (1.1–1.3)
2. `feat(push): Expo push provider` (1.4)
3. `feat(api): account deletion` (1.5) — also ships to web
4. `chore: npm workspaces + @logbook/shared` (3.1) — pure move, zero behavior change
5. `feat(mobile): Expo scaffold + sign-in + Today` (3.2, screens 1–2)
6. `feat(mobile): workout execution` (screen 3)
7. `feat(mobile): check-ins, chat, progress, account` (screens 4–7)
8. `feat(mobile): push + deep links` (Phase 3)
9. TestFlight → iterate → submit.

Rough calendar for one person plus Claude: Phase 1 in a week, Phase 2 in
three, Phase 3 in one, review turnaround one more. **~6–8 weeks to a
submitted build**, with the first TestFlight around week four.

---

## 9. Decisions (2026-09-02)

1. **Expo** (§1.2). Confirmed.
2. **Client-only v1** (§1.1). Confirmed; coach triage is a later phase.
3. **Apple Developer account exists.** Bundle id still to pick; the plan
   assumes `fit.logbook.app`.
4. **No staging database.** The only Logbook Supabase project is production
   (`logbook-fit`, us-east-1). Until a staging project exists, the
   `preview` build profile points at production and the reviewer accounts
   (§2 1.6) live there. Adding a staging project is a §2-sized task on its
   own: a second Supabase project, a Vercel preview env with its own
   `DATABASE_URL`/`DIRECT_URL`, and `MIGRATE_ON_PREVIEW=true`.
