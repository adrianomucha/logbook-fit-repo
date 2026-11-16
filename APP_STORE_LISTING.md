# App Store listing

Text to paste into App Store Connect for version 1.0 of the client app.
Drafted 2026-11-16 against the build's actual features. Character limits are
Apple's; `src/lib/__tests__/app-store-listing.test.ts` fails if a field here
goes over, so edit freely.

The app is the client's side only. Nothing below promises coach features,
sign-up in the app, iPad or Android support, or a price.

## Name

Limit 30. "Logbook" alone is very likely taken, and the name must be unique
on the store. The home-screen name stays "Logbook" (`mobile/app.json`).

```name
Logbook.fit: Coached Training
```

## Subtitle

Limit 30.

```subtitle
Your coach's plan, in hand
```

## Promotional text

Limit 170. Can be changed at any time without a new build.

```promotional
Train from the plan your coach wrote for you. Log every set, see what you lifted last time, answer check-ins and message your coach, all in one place.
```

## Description

Limit 4000.

```description
Logbook.fit is where you train with your coach. Your coach writes the plan on the web; this app puts it in your hand at the gym.

You need an invite from a coach who uses Logbook.fit. Open their invite link to create your account, then sign in here. There is no sign-up inside the app.

TRAIN
• Today shows the workout that is next, with every exercise, set and target.
• Tick off sets as you go. Change the weight or reps when the day calls for it.
• See what you lifted last time next to each set.
• A countdown for timed exercises like planks and holds, and a clock for the session.
• Flag an exercise that did not feel right, with a note. Your coach sees it.
• Missed a workout last week? Step back to an earlier week and finish it.

STAY IN TOUCH
• Answer your coach's check-ins in under a minute: how training felt, how your body feels, anything they should know.
• Read their reply when it lands.
• Message your coach from the app.
• Turn on alerts to hear when your coach writes or sends a check-in.

SEE YOUR PROGRESS
• Every finished workout, with what you logged.
• Personal bests, picked out automatically.
• Your week at a glance: what is done and what is left.

YOURS
• Weights in kilograms or pounds.
• Your data is seen by you and your coach, and nobody else. No ads, no trackers.
• Delete your account from Settings at any time.

Coaches: Logbook.fit for coaches runs in the browser at logbook.fit.
```

## Keywords

Limit 100, comma separated, no spaces after commas. Words already in the
name or subtitle are left out: Apple indexes those anyway.

```keywords
workout,gym,log,tracker,personal trainer,strength,lifting,sets,reps,check-in,program,fitness,client
```

## URLs

| Field | Value |
|---|---|
| Support URL | Not decided yet. It has to be a page with a way to reach you: see "Support path" in `JANUARY_RELEASE.md` section 3. Until there is one, `https://logbook.fit/legal` is not enough for review. |
| Marketing URL | `https://logbook.fit` |
| Privacy Policy URL | `https://logbook.fit/privacy` |

## Categories and rating

- Primary category: Health & Fitness. Secondary: none needed.
- Age rating: answer "None" to every content question. The chat is between a
  client and their own coach, not user-generated content open to the public.
- Price: Free. No in-app purchases.
- Availability: iPhone only (`supportsTablet` is false).

## What's New (version 1.0)

Limit 4000.

```whatsnew
The first release of Logbook.fit for clients. Train from your coach's plan, log your sets, answer check-ins and message your coach.
```

## App Review notes

Limit 4000. Paste into App Review Information, with the reviewer client
login from `prisma/seed_reviewer.ts` in the sign-in fields (never in this
file).

```reviewnotes
Logbook.fit is a coaching app. A coach builds training plans on the web (logbook.fit) and invites clients. This iOS app is the client's side.

SIGNING IN
Use the account in the sign-in fields above. It is a client already connected to a demo coach, with a plan, a pending check-in and messages. Accounts are created from a coach's invite link on the web, so the app has no sign-up screen. This is the same model as other invite-only client apps.

WHAT TO TRY
1. Today tab: open the workout, tick a set, change a weight. Close and reopen the app: it is still there.
2. Open the pending check-in from Today and answer it.
3. Chat tab: send the coach a message.
4. Progress tab: workout history and personal bests.

ACCOUNT DELETION (5.1.1(v))
Settings, then Account, then Delete account. It deletes the account from inside the app.

PRIVACY AND TERMS (5.1.1(i))
Settings, then Account, then Privacy Policy and Terms. They open in an in-app browser.

PERMISSIONS
Notifications (optional, asked only when the client turns alerts on in Settings) and the photo library (only when choosing a profile picture). No camera, microphone, location, contacts, tracking or health data access.

PAYMENTS
The app is free and has no purchases. Clients pay their coach outside the app, if at all; Logbook.fit takes no payments.
```
