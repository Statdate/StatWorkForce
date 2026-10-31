# Stat Workforce — mobile

Expo Router (SDK 58) app for workers, managers, and administrators. Talks
to the same backend as the web app (`../`) via a small token-based API layer
— see the root [README's "Mobile app" section](../README.md#mobile-app-expo--react-native)
for the full picture (auth flow, API routes, what's verified, known gaps).

## Run it

```bash
npm install
npm run ios   # or: npm run web
```

Requires the Next.js backend running (`npm run dev` in the parent directory)
and `EXPO_PUBLIC_API_URL` in `.env` pointing at it — defaults to
`http://localhost:3000`, which works for the iOS Simulator.

## Managed test and store builds

The stable iOS bundle and Android package identifier is
`com.statworkforce.mobile`. EAS `preview` builds use internal distribution;
`production` builds use the production update channel and remote build-number
management. Configure `EXPO_PUBLIC_API_URL` in the matching EAS `preview` and
`production` environments before building.

```bash
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile production --platform all
```

Creating or submitting builds changes external state and requires the Stat
Workforce Expo, Apple, and Google Play accounts. Run the preview build through
the physical-device regression plan before authorizing production submission.
