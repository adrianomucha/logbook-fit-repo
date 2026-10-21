# TestFlight: getting the iOS app to testers

The code side is ready (see "What's already done" at the bottom). What's
left needs your Apple and Expo accounts, so it can't run from a cloud
session the first time. After step 4, every later build is one click.

Time: about an hour the first time, most of it waiting on the build.

## 1. First build (from your computer)

Any machine with Node 22. A Mac isn't required, EAS builds in the cloud.

```bash
cd mobile
npm ci
npx eas-cli@latest login            # the logbook-fit Expo account
npx eas-cli@latest build --platform ios --profile production
```

Answer the prompts:

- **Log in to your Apple account?** Yes. EAS registers the bundle id
  `fit.logbook.app`, creates the distribution certificate and provisioning
  profile, and stores them on Expo.
- **Set up Push Notifications?** Yes. EAS creates the APNs key that Expo
  push uses. Without it, alerts won't arrive on device.

The build takes 15–25 minutes; the link it prints shows progress.

## 2. One-time: App Store Connect

1. Sign in at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   with the Apple Developer account.
2. **Apps → + → New App**: platform iOS, name **Logbook.fit**, language
   English, bundle id **fit.logbook.app** (registered by step 1; the list is
   empty before that), SKU `logbook-fit-ios`, full access.
3. Note the app's **Apple ID** (a number, under App Information). That's
   the `ascAppId` in step 4.

The build from step 1 can keep running while you do this.

## 3. First upload to TestFlight

```bash
npx eas-cli@latest submit --platform ios --latest
```

- Pick the app from step 2 when asked.
- When it offers to create an **App Store Connect API key**, say yes. EAS
  stores it, and that's what lets later builds upload themselves.

Apple processes the build for 5–30 minutes, then it appears under
**TestFlight** in App Store Connect.

## 4. Make later builds one click

1. The Apple ID from step 2 goes in `mobile/eas.json` →
   `submit.production.ios.ascAppId`. Done: it's `6824789302` (Logbook Fit).
2. Create an Expo access token at
   [expo.dev → Account settings → Access tokens](https://expo.dev/settings/access-tokens)
   and add it to the GitHub repo as the secret **EXPO_TOKEN**
   (Settings → Secrets and variables → Actions).
3. From then on: **Actions → TestFlight → Run workflow**. It builds on EAS
   and uploads to TestFlight on its own (`.github/workflows/testflight.yml`).
   The build number goes up automatically each time.

## 5. Testers

**Internal testers** (you, up to 100 people on the App Store Connect team):
TestFlight → Internal Testing → add a group → add people. No Apple review;
they get the build as soon as processing finishes.

**External testers** (real coaches' clients): TestFlight → External
Testing → add a group. The first build needs a short **Beta App Review**
(usually under a day), which asks for:

- **Test information**: what to test, plus a feedback email.
- **Sign-in details**: the reviewer client account. Create it on
  production with
  ```bash
  REVIEWER_COACH_EMAIL=… REVIEWER_CLIENT_EMAIL=… REVIEWER_PASSWORD='…' \
    npx tsx prisma/seed_reviewer.ts
  ```
  and give Apple the **client** login. Never commit the credentials.
- **Notes for the reviewer** (Apple can't invite itself):
  > Logbook.fit is a coaching app. A coach builds plans on the web and
  > invites clients; this iOS app is the client's side. The account above
  > is a client already connected to a demo coach, with a plan, a pending
  > check-in and messages. Accounts are created from a coach's invite link,
  > so the app has no sign-up screen.

## 6. Check on the first build

Install it from the TestFlight app on a phone and check:

- [ ] Sign in with a real client account; Today shows the plan.
- [ ] Log a set in a workout; it survives closing and reopening the app.
- [ ] Settings → Preferences → Alerts on; have the coach send a message.
      The push arrives, and tapping it opens the chat. This is the one
      thing only a real build can show (the simulator and Expo Go can't).
- [ ] Settings → Account → Privacy Policy and Terms open.
- [ ] Settings → Account → Delete account is there (don't press it on a
      real account).

## What's already done

- Bundle id `fit.logbook.app`, EAS project linked (`app.json` →
  `extra.eas.projectId`), production profile with remote auto-incrementing
  build numbers (`eas.json`).
- Export compliance answered in the app (`ITSAppUsesNonExemptEncryption:
  false`), so uploads don't stop on the encryption question.
- The only iOS permission prompt is the photo library, with a specific
  reason. Unused camera, microphone and Face ID prompts are switched off;
  App Review rejects generic ones.
- In-app account deletion (guideline 5.1.1(v)) and in-app privacy policy
  and terms links (5.1.1(i)).
- Icon is 1024×1024 with no transparency.
- Push, deep links from notification taps, haptics and number keypads.

## Before the App Store submission (after TestFlight)

Tracked in `IOS_APP_PLAN.md` §5: privacy nutrition labels, screenshots
from this build (6.7" and 6.1") and subtitle. `version` in `app.json` is
`1.0` to match the version App Store Connect created; keep the two equal
for every release (the build number counts up on its own).
