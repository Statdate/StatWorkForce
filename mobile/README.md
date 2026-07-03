# Stat Workforce — mobile

Expo Router (SDK 57) app for workers: view schedule, view credentials. Talks
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
