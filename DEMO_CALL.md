# Demo account for coach calls

A ready-made coach account to open on a setup or sales call with a coach, so
the product can be shown with a real roster instead of an empty dashboard.
Everything in it is ordinary data going through the ordinary UI — nothing is
mocked, and anything done live on the call (replying to a check-in, assigning
a plan, sending a message) behaves exactly as it would for a paying coach.

## The account

| | |
|---|---|
| Coach | **Jamie Porter** — `jamie@demo.logbook.fit` |
| Client to show | **Daniel Kim** — `daniel@demo.logbook.fit`, also one click away via the account menu's *Switch to client* |
| Password | Set when the seed is run (`DEMO_CALL_PASSWORD`). It is never stored in this repo. Both accounts share it. |

These accounts are real, unlocked accounts — they are *not* the seeded
`coach@logbook.fit` demo, which is locked on every deployed build. They work
on production.

## Building or resetting it

```bash
DEMO_CALL_PASSWORD='<the password>' npm run seed:demo-call
```

against the database you want it in (`DATABASE_URL`/`DIRECT_URL` from `.env`).
Re-running **rebuilds the whole scenario**: the scenario's own accounts are
deleted (cascading their plans, workouts, check-ins and chat) and created
again with every timestamp anchored to today. Nothing outside those exact
emails is touched. So:

- Run it **the morning of a call**, so "2 hours ago" and "yesterday" read as such.
- Run it **again after the call** to wipe whatever was done live.

Plan weeks start on Mondays, so the seed works on any weekday: each client's
"current week" is exact, and the current week's workouts only exist for days
that have already happened.

## The story

Jamie is an independent online strength coach with a small roster. Opening
the dashboard, top to bottom:

| Client | Where they are | Dashboard state | What it demonstrates |
|---|---|---|---|
| **Priya Nair** | Signed up from an invite yesterday. No plan, no message from Jamie yet. | Needs plan · *Say hello* | Invite-based onboarding and the first-plan moment |
| **Tom Becker** | Finished the 8-week Hypertrophy Block on Saturday. Asked for the next one; unread message this morning. | Plan ended · *Assign Next Plan* | Catching the highest-churn moment after a block ends |
| **Marcus Reid** | Week 4 of the Strength Block. Nothing logged since week 2, a check-in he has ignored for 6 days, Jamie's last message unread. | At risk · *Send Reminder* | The quiet client — the whole reason the product exists |
| **Sofia Alvarez** | Week 3, trains every session. Answered her check-in 2 hours ago with a knee complaint; she also flagged Bulgarian split squats last week and cut the last set to 6 reps. Unread message. | Awaiting response · *Review Check-in* | The check-in loop, with the flag and the set data lined up next to her words |
| **Daniel Kim** | Week 2 of Foundations. Check-in sent this morning, not yet answered. | Check-in due | The client's side — this is the account to switch into |
| **Hannah Brooks** | Week 5 of 6, four clean weeks, a bench PR, four completed check-ins. | On track | Progress and history for a client who is doing well |
| **Leo Fischer** | Week 3 of Foundations, quietly consistent. | On track | A second on-track client so the list looks like a real roster |
| **Emily Sato** | Ended the relationship three weeks ago. | *Past clients* only | The archive |
| *Chris Doyle* | Invited two days ago, has not signed up. | Pending invite | The invite list |

Jamie's library is the 25 Quick Start exercises plus five of her own, several
with coaching cues. There are three plan templates — *Strength Block —
Upper/Lower* (6 weeks × 4 days), *Foundations — 3 days* (4 weeks) and
*Hypertrophy Block — 4 days* (8 weeks). Every client is on their own copy
(clone-on-assign), so editing a template on the call never touches anyone's
current plan.

## Run of show (about 15 minutes)

Log in as Jamie before the call. Keep the browser on the dashboard.

1. **Dashboard — "who needs you today"** (2 min). Read the list top to
   bottom without clicking: new client, ended plan, at-risk, check-in to
   review, check-in due, then everyone on track. Point at the unread chat
   badge (Tom and Sofia). The pitch: the app has already done the triage.

2. **Review a check-in** (4 min). Open Sofia → *Review Check-in*. Her effort
   rating, her words about the knee, and — right next to them — the flagged
   split squat and the set she cut short. Reply live ("swap split squats for
   leg press for two weeks, keep everything else"), tick *I'll adjust the
   plan*, send. Back on the dashboard she has dropped to on track.

3. **The quiet client** (2 min). Open Marcus. Six days of unanswered
   check-in, last workout two weeks ago, Jamie's last message unread. *Send
   Reminder*. This is the moment to say: every coach has a Marcus, and they
   usually find out when the payment fails.

4. **Plans** (3 min). Open Tom → *Assign Next Plan* → pick the Strength Block.
   Then *Plans*: open a template, show weeks and days, drag a couple of
   exercises, add a cue from the library. If the coach lives in spreadsheets,
   show *Import* on a plan.

5. **A new client** (2 min). Open Priya → *Say hello* sends the first
   message; then assign Foundations. Then *Invite Client* to show the link
   they would actually send (Chris's pending invite is already in the list).

6. **The client's app** (3 min). Account menu → *Switch to client*. Daniel's
   *Today*: the check-in card and the next workout. Start the workout, tick
   sets, override a weight, flag an exercise with a note. Answer the check-in.
   Switch back to coach: Daniel has moved up to *Review Check-in*. The loop
   closed in front of them.

7. **After the call** re-run the seed to reset.

## Known rough edges

- The scenario is time-relative but static: after a few days the on-track
  clients stop training, check-ins fall due, and the roster drifts. Reseed.
- Scheduled check-ins are real: opening Priya's workspace materialises her
  first weekly check-in even though she has no plan yet (the scheduler does
  not gate on a plan). Harmless, and Needs plan still outranks it.
- These accounts are not on the demo lock's list on purpose, so they are not
  excluded from `/admin` Overview counts the way `coach@logbook.fit` is.
