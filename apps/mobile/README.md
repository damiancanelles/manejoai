# manejoai Mobile

React Native app (Expo, managed workflow) for iOS and Android. Talks to the
same `apps/api` the web app does — see `src/api/client.ts`. This is WO-0
from the mobile build plan: a real login → API → render pipeline on a real
device, plus the full navigation shell with placeholder screens for
everything WO-1+ fills in.

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
  shell, i18n (EN/ES, ported from the web app), and the Dashboard screen
  (fetches `/businesses/me` live - this is what actually proves the
  pipeline works end to end).
- **Placeholder:** Jobs, Invoices, Customers, Quotes, Job Reports, Reports,
  Settings, Billing, Assistant - all reachable in navigation, all showing
  a "coming in WO-X" note. See the mobile build plan artifact for what
  lands in each phase.

## EAS - still needs a one-time setup, not done yet

`eas.json` has build profiles configured, but actually building requires
an Expo account:

```
npx eas login       # your own Expo account (or create one - it's free)
npx eas init        # links this project to that account, writes a project id into app.json
npx eas build --profile development --platform ios      # or android
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
