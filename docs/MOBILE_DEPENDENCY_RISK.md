# Mobile Dependency Risk and Upgrade Gate

Last updated: October 31, 2026

The mobile app is pinned to the latest compatible Expo SDK 57 core/router patches (`expo` 57.0.31 and `expo-router` 57.0.29). This removed the critical `shell-quote` advisory and reduced npm's report from 44 findings to 19 while preserving successful lint, TypeScript, and web export checks.

## Remaining advisory families

The remaining report is inherited through Expo/Metro build and routing dependencies: `decode-uri-component`, `deepmerge`, `glob`/`minimatch`, `image-size`, and Expo CLI's Zod 3 line. npm does not offer a compatible SDK 57 remediation. Its forced suggestions include downgrading Expo to 51, downgrading ESLint to 4, or partially installing SDK 58 packages; those combinations are unsupported and were not applied.

These findings are not accepted as permanent risk. Build-tool exposure is reduced by using trusted repository inputs, lockfile-only CI installation, no untrusted native assets/configuration during builds, and isolated CI runners. The router/query-string finding can process externally supplied navigation input and therefore remains a mobile release concern even though the tested application routes do not intentionally deserialize arbitrary query objects.

## Production mobile release gate

Before App Store/managed Play distribution:

1. Upgrade the complete Expo stack to SDK 58 using Expo's compatibility installer; do not update isolated native packages independently.
2. Recreate native development builds and review generated iOS/Android project changes.
3. Run lint, TypeScript, web export, dependency audit, API regression, deep-link tests, document/calendar/notification permissions, biometric lock, push-token registration, and sign-in/session-revocation checks.
4. Test supported physical iOS and Android versions through managed pre-production tracks.
5. Triage any residual advisories for reachability and obtain explicit security-owner approval with an expiry date; critical/high reachable findings block release.

The web application release is evaluated separately; its full and production dependency audits currently report zero vulnerabilities.
