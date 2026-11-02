# Mobile Dependency Risk and Upgrade Gate

Last updated: October 31, 2026

The mobile app has been migrated as one compatible set to Expo SDK 58 (`expo` 58.0.22, `expo-router` 58.0.29, React Native 0.88.1, and React 19.3.0). Package versions were reconciled against Expo 58's installed `bundledNativeModules.json`. Lint, TypeScript, Metro bundling, and all 18 static web routes pass.

The migration removed all critical and high advisories. The production dependency audit is down from 44 findings (1 critical, 14 high) to 13 moderate findings. The full development-tree audit reports 26 moderate findings and no high/critical findings.

## Remaining advisory families

The remaining report is inherited through Expo/Metro/ESLint build tooling and is limited to `glob`/`minimatch` denial-of-service advisories. npm does not offer a compatible patched Expo release; its forced suggestion is an unsupported downgrade to Expo 51. That downgrade was not applied.

These findings are not accepted as permanent risk. Exposure is limited to trusted build/lint inputs and reduced through lockfile-only CI installation, no untrusted native assets/configuration during builds, and isolated CI runners. Dependabot will surface the upstream Expo patch when available.

## Production mobile release gate

Before App Store/managed Play distribution:

1. Recreate native development builds and review generated iOS/Android project changes.
2. Run API regression, deep-link tests, document/calendar/notification permissions, biometric lock, push-token registration, and sign-in/session-revocation checks.
3. Test supported physical iOS and Android versions through managed pre-production tracks.
4. Triage residual moderate build-tool advisories with a security owner and expiry date; any new critical/high reachable finding blocks release.

The web application release is evaluated separately; its full and production dependency audits currently report zero vulnerabilities.
