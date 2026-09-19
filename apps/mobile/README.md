# manejoai Mobile

React Native app (Expo, managed workflow) for iOS and Android. Talks to the
same `apps/api` the web app does — see `src/api/client.ts`. WO-0 (login,
nav shell, i18n) and most of WO-1 (Customers/Jobs/Quotes/Invoices, all
view-only) from the mobile build plan are done; see that plan for what's
left.

## Running it

From the repo root (this is an npm workspace, not a standalone project):

```
npm install               # from the repo root, not apps/mobile
cd apps/mobile
npx expo start
```

Scan the QR code with **Expo Go** (fastest way to try it) on a physical
iOS/Android device, or press `a`/`i` for an emulator/simulator if you have
one set up locally.

**It talks to staging by default** (`EXPO_PUBLIC_API_BASE_URL` defaults to
`manejoai-api-staging` in `src/api/client.ts`) — same rule as the rest of
this project: nothing touches production until that's explicitly asked
for. `eas.json`'s `production` build profile is the only place the real
API URL (`api.manejoai.cloud`) is configured, and that profile shouldn't
be built/submitted until told to.

## What's real vs. placeholder right now

- **Real:** Login, secure token storage, the bottom-tab + "More" navigation
  shell, i18n (EN/ES, ported from the web app), push-token registration
  (see below), and: Dashboard, Customers (list + detail), Jobs (list +
  detail, incl. photos - view-only, camera capture is WO-2), Quotes
  (list + detail), Invoices (list + detail) - all live against the real
  API, all read-only for now.
- **Placeholder:** Job Reports, Reports, Settings, Billing, Assistant -
  reachable in navigation, showing a "coming in WO-X" note. See the
  mobile build plan artifact for what lands in each phase.

## Push notifications - registration only, nothing sends one yet

`src/lib/pushNotifications.ts` requests permission and gets an Expo push
token after login; `AuthContext` POSTs it to `PATCH /users/me/push-token`
(stored on `User.expoPushToken`). It fails harmlessly (no token, nothing
sent) on a simulator, if permission is denied, or before `eas init` has
linked a project id - there's no urgency to any of that since nothing on
the backend actually sends a push yet.

## EAS - still needs a one-time setup, not done yet

Building (not the same as `npx expo start`, which doesn't need any of
this) requires an Expo account. **Use `eas-cli`, not `eas`** - `npx eas
login` fails ("could not determine executable to run") because npx looks
for a package literally named `eas`; the real package is `eas-cli` (its
bin happens to be called `eas`). Don't add `eas-cli` as a project
dependency either - `expo-doctor` flags that, and npx doesn't need it:

```
npx eas-cli login       # your own Expo account (or create one - it's free)
npx eas-cli init        # links this project to that account, writes a project id into app.json
npx eas-cli build --profile development --platform ios      # or android
```

That's a manual step (needs real account credentials), same as the Apple
Developer / Google Play enrollment in the build plan.

## Known, expected warning

`npx expo-doctor` flags a "duplicate react" warning: the web app pins
React 18 and this app needs React 19 (required by React Native 0.86+).
npm workspaces correctly nest a separate `react` under
`apps/mobile/node_modules` for exactly this reason — both `expo export
--platform ios` and `--platform android` bundle clean with no resolution
errors. This is a monorepo artifact, not a bug; don't "fix" it by forcing
either app onto the other's React version.
