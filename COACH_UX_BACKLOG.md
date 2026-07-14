# Coach Experience — UX Edge-Case Backlog

Findings from a full walkthrough of the coach journey (dashboard → check-in loop →
plan builder → messaging → client lifecycle), prioritized by impact on the product's
core promise: *"your quietest client is your next cancellation — we surface them first."*

Effort: S (&lt; half day) · M (1–2 days) · L (multi-day / needs design)
Status: ✅ fixed on this branch · ⬜ open

---

## P0 — The retention loop is broken in places

| # | Status | Item | Impact | Effort |
|---|--------|------|--------|--------|
| 1 | ✅ | **Exercise flags never reach the coach.** The client "flag + message coach" send is rejected by the API (missing `recipientId`, unknown `exerciseContext`), and the coach review UI is fed a hardcoded empty `exerciseFlags={[]}`. The README's north-star loop (review response *alongside flagged exercises*) doesn't work end-to-end. | Critical | M |
| 2 | ✅ | **An unanswered check-in freezes the loop forever.** No expiry/reminder; a stale `PENDING` check-in permanently blocks the auto-scheduler (`checkin-schedule.ts`). The exact client you're worried about stops being checked on. | Critical | M |
| 3 | ✅ | **UI promises notifications that don't exist.** "They'll get a notification…" — there is no notification system of any kind. | High (trust) | S |
| 4 | ✅ | **API failures render as empty states.** Dashboard fetch error → "Getting Started" onboarding screen; client-profile fetch error → "Can't find this client". Most mutations swallow errors silently (`catch {}` + misleading "handled by apiFetch" comments). | High | S–M |
| 5 | ⬜ | **Plans are assigned by reference, not cloned.** Editing a plan mutates it live for every assigned client; deleting an exercise mid-workout cascade-deletes the client's logged sets. Needs clone-on-assign (real templates vs instances). | Critical | L |
| 5a | ✅ | *Stopgap for #5:* block deleting a plan while it's assigned, and fix the false confirm copy ("client plans will not be affected"). | High | S |

## P1 — High-impact gaps in daily coaching

| # | Status | Item | Impact | Effort |
|---|--------|------|--------|--------|
| 6 | ⬜ | **Two divergent urgency systems.** Dashboard ranks by last *workout* (7d); the profile ranks by last *check-in* (5–6d / 7d+). Same client, different status per screen. Consolidate on one definition. | High | M |
| 7 | ✅ | "Check-in ready to review" ranks *below* "check-in due" on the dashboard — a client waiting on the coach sorts lower than one who hasn't answered. Also: at-risk masks a waiting response (only 1 check-in fetched per client). | High | S |
| 8 | ✅ | **No "plan ended" state.** Client UI repeats the last week forever; week-overview API 404s and is swallowed; coach gets no "plan ends soon" warning. Highest-churn moment, unhandled. Now: `PLAN_ENDED` urgency + "Assign Next Plan" CTA, "final week" signal, client plan-complete celebration, unified week math. | High | M |
| 9 | ✅ | **Coach can't see what actually happened.** Now: started-but-unfinished workouts appear in history ("Not finished"), and weight/rep deviations from the prescription show per workout ("Adjusted: Deadlift 185→155"). Flags on abandoned sessions surface in check-in review too. | High | M |
| 10 | ✅ | **Double-send creates stacked check-ins.** `POST /api/check-ins` never checks for an open check-in; duplicates become invisible (UI shows only newest). Add a server-side guard. | High | S |
| 11 | ⬜ | **No edit/delete/cancel on check-ins.** Typos in coach feedback are permanent; a mistakenly sent check-in can't be withdrawn. | Medium | M |
| 12 | ⬜ | **"I'll adjust the plan" is untracked.** Client copy softened to "is adjusting" ✅; tracking actual follow-through (link the flag to a real plan edit, remind the coach) still open. | Medium | S–M |
| 13 | ✅ | Silent message-send failure: input cleared before the request resolves, no maxLength (server caps 5000 → 400), no error toast. | High | S |
| 14 | ✅ | **Coach app never refreshes.** No polling, `revalidateOnFocus: false` — urgency and new messages go stale in an open tab. (Client app polls every 30s.) | High | S |
| 15 | ⬜ | Unread-message tracking neutralized: fetching a thread marks everything read, so "N unread" ~never triggers. | Medium | M |
| 16 | ⬜ | **Churned clients can't come back.** Re-signup 409s, no re-invite-existing-account flow — a returning client loses all history. "Win-back" is a core retention journey. | High | L |
| 17 | ⬜ | **No invite revocation/resend**; invite email is decorative (anyone with the link can redeem under any address); existing users can't accept an invite at all. | Medium | M |

## P2 — Scale, correctness, and polish

| # | Status | Item | Effort |
|---|--------|------|--------|
| 18 | ⬜ | No pagination/search/filter anywhere; All Clients sorted by urgency not name; no tie-break within urgency buckets (order shuffles between loads). | M |
| 19 | ⬜ | Timezone-naive "N days silent" math (raw ms from `Date.now()`), server/client disagree at the 7-day boundary. | M |
| 20 | ✅ | "+ Invite Client" button on the empty roster state has no `onClick`. | S |
| 21 | ✅ | Re-assigning a plan silently resets `planStartDate` (restarts week 1, no warning). Same-plan re-assign is now a no-op; switching plans still restarts intentionally. | S |
| 22 | ⬜ | Library exercises can't be deleted/archived (no DELETE endpoint); case-sensitive DB uniqueness vs case-insensitive picker allows near-duplicates. | M |
| 23 | ⬜ | Plan card Duplicate/Archive/Restore menu items exist but are never wired; `isTemplate`/`archivedAt` aren't DB fields; no way to copy a plan. | M |
| 24 | ⬜ | No UI to add/remove weeks or reorder/delete days (`POST /plans/[id]/weeks` has no caller); can assign a fully empty plan with no warning. ("Rest days auto-calculated" copy fixed ✅.) | M |
| 25 | ⬜ | Server validation looser than UI on check-ins (empty responses accepted, arbitrary body-feeling strings, mismatched length caps); several PUTs (`plans/[id]`, `days/[id]`, `workout-exercises/[id]`) skip zod entirely. | M |
| 26 | ⬜ | Auto check-ins default OFF per client with no cron (lazy materialization only) — coaches likely assume weekly check-ins just happen. | S–M |
| 27 | ⬜ | Concurrent plan edits are last-write-wins (no version check); sample client pollutes roster counts server-side; invite list capped at 20 with no pagination; "expired" invites never persisted (dead enum value). | M |
| 28 | ⬜ | Termination is silent for the client (plan/chat vanish, no explanation); no read-only view of past-client conversation history despite "nothing is deleted" copy. | M |
| 29 | ⬜ | Loading states are bare spinners (no skeletons); success/error feedback inconsistent across mutations. | M |
| 30 | ⬜ | No account deletion (soft-delete infra exists, no endpoint); one account can't be both coach and client; in-memory per-IP rate limiting resets per deploy. | M–L |

## P3 — Dead code & drift (cleanup)

| # | Status | Item |
|---|--------|------|
| 31 | ⬜ | Entire orphaned exercise-library UI (`ExerciseLibraryPage`, `ExerciseOnboarding`, `EnhancedExercisePicker`, `ExerciseForm`): unreachable route, hardcoded `coachId: 'coach-1'` TODO, taxonomy incompatible with the DB enum, advertises "44 exercises" vs the real 25. Delete or finish. |
| 32 | ⬜ | Three exercise datasets (`quick-start-exercises.ts`, `common-exercises.ts`, `exercise-library.ts`) with no single source of truth; the in-editor "Library" tab shows the static list, not the coach's real library. |
| 33 | ⬜ | Two parallel coach check-in review UIs (standalone page vs inline workspace) with divergent status vocabularies and 4 copies of the feeling-label maps; two parallel status systems (`client-status.ts` vs dashboard route). Consolidate. |
| 34 | ⬜ | Dead code: `EmptyStateNoneNeedAttention`/`EmptyStateAllNeedAttention`, `RecentMessagesSection` (superseded by ChatView), `plan-generator.ts` deep-copy util, `Plan.editedAt` written but never read, `ChatView` exercise-context card never populated. |
| 35 | ⬜ | `TEST_CASES_PHASE_3_4.md` largely describes the orphaned localStorage-era UI — retire or rewrite against the shipped product. |

---

*Generated from a code-level audit on 2026-07-13. Items marked ✅ were fixed on
branch `claude/coach-experience-edge-cases-opcvgj`.*
