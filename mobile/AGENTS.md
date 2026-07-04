# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Mobile app conventions

Expo Router (SDK 57), React Native 0.86, RN-web for the preview. Talks to
the Next.js backend in `../` via `src/lib/api.ts` (Bearer-token auth, not
cookies) — see the root [AGENTS.md](../AGENTS.md) for backend-side
conventions (core-logic split, manager aggregation pattern).

- **`src/lib/api.ts`** is the only place that calls `fetch()`. Every backend
  endpoint gets one typed wrapper function here (e.g. `getManagerSchedule()`,
  `offerShift()`) — don't call `fetch` directly from a screen component.
- **Role-aware tab screens**: there's no route-level role gating on mobile
  (unlike web's proxy). Shared tabs (`src/app/(app)/index.tsx`, `time-off.tsx`,
  `credentials.tsx`) check `useAuth().user?.accountType` at the top and
  render a completely different component for `WORKER` vs
  `MANAGER`/`ADMIN` — see any of those three files for the pattern before
  adding a new role-aware tab.
- **JSX truthiness bug to avoid**: `{someString && <Component/>}` renders a
  stray empty-string text node (React Native Web throws "Unexpected text
  node" errors for this) when `someString` is `""` rather than `undefined`/
  `null`/`false`. Always use `{someString ? <Component/> : null}` for
  string-valued conditionals — this bit us once already in
  `hospital-banner.tsx`.
- **Browser-preview click reliability**: the `preview_click` tool is flaky on
  this RN-web app. Reliable pattern for verification: use `preview_eval` to
  find the element by exact text/aria-label and call `.click()` on it
  directly, e.g.
  `[...document.querySelectorAll('[role="button"]')].find(e => e.getAttribute('aria-label') === '...').click()`.

## Running it

```bash
npm install
npm run web   # RN-web preview at http://localhost:8082, or: npm run ios
```

Needs the Next.js backend running (`npm run dev` in `../`) and
`EXPO_PUBLIC_API_URL` in `.env` pointing at it (defaults to
`http://localhost:3000`).
