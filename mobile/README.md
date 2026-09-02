# Logbook — iOS app

The client's Logbook: today's session, the week around it, check-ins and
chat with their coach. Expo (React Native) with expo-router and NativeWind;
talks to the same API as the web app using a bearer token
(`DEVELOPMENT.md` → "Native app auth"). Plan and status: `IOS_APP_PLAN.md`.

## Run it

Needs Node 22 or newer (React Native 0.87's Metro refuses older Node).

```bash
cd mobile
npm install
cp .env.example .env      # point EXPO_PUBLIC_API_URL at a dev server if you like
npx expo start            # then press i for the iOS simulator, or scan with Expo Go
```

Expo Go can't load `expo-secure-store`/`expo-notifications` native code in
every case — a development build (`npx expo run:ios`, or an EAS development
build) is the reliable path once notifications land.

## Check it without a device

```bash
npm run typecheck         # tsc
npm run export:ios        # full Metro bundle for iOS; catches config and import errors
```

## Push notifications

The opt-in (account screen, chat header) registers an Expo push token with
`POST /api/push/subscription`. Expo can only mint a token when the app has
an EAS project id, so until `eas init` has run and written
`extra.eas.projectId` into `app.json`, the toggle reports "Available in the
App Store build" and hides itself. Tapping a notification opens the screen
its `url` names (`src/lib/push.ts` maps the web paths).

## Layout

```
app/                 expo-router routes — mirrors the web's /client/* paths so
                     push deep links resolve in both apps
  _layout.tsx        fonts, auth provider, root stack
  index.tsx          front door: login / coach / client
  login.tsx
  coach.tsx          "your workspace is on the web"
  client/            tabs: Today, Chat, Progress; workout/[dayId] is the live session
src/
  lib/auth.tsx       session provider (keychain, refresh, 401 → sign out) + SWR config
  lib/api.ts         @logbook/shared API client with origin + bearer
  hooks/             SWR hooks, same keys as the web's
  components/        NativeWind components
tailwind.config.js   the web's tokens as literal colors and per-weight font faces
```

`@logbook/shared` (types, schemas, adapters, helpers) is consumed as source
via `metro.config.js`'s monorepo settings.
