# Security Policy

## Supported Versions

TwoFold is an open-source Expo (React Native) application. The current
revision of the `main` branch is the supported version. We do not maintain
long-lived release branches; security fixes land on `main` and are released
with the next app build.

| Source                      | Supported          |
| --------------------------- | ------------------ |
| `main` branch (latest)      | :white_check_mark: |
| Older release builds        | :x:                |

## Reporting a Vulnerability

Security issues should be reported privately via **GitHub Security Advisories**
(repository: `guangyou0716/TwoFold` → *Security* → *Report a vulnerability*),
or by contacting the maintainers directly if you have a private channel.

**Scope.** This project is developed by a student as a portfolio/FYP project.
It is not a commercial product, and there is no dedicated security team.

**Response expectations.**
- Acknowledgment of the report: within 5 business days.
- Triage and a yes/no security impact decision: within 14 business days.
- If accepted: a fix is targeted within 30 days where feasible, shipped on
  `main`, and the advisory is published after a release.
- If declined: you will receive a written explanation.

## Security-relevant guidance

- Do **not** embed any third-party secrets in the app bundle. The receipt OCR
  Gemini key is server-side only (`firebase functions:secrets:set GEMINI_API_KEY`).
- Runtime configuration (Firebase project credentials) is loaded from the
  gitignored `.env.local`; treat it as non-secret but development-only.
- Firestore and Storage access are governed by `firestore.rules` and
  `storage.rules`; changes must be covered by the emulator tests under
  `tests/rules/`.
- Callables require a signed-in Firebase user. App Check enforcement is off
  until the Expo client can attach a device token; turning it on with no
  provider rejects every callable.
- If a vulnerability requires secret rotation (e.g., a leaked API key), rotate
  the affected key immediately, then report the issue.