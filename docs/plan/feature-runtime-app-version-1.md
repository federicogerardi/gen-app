---
goal: Frontend runtime app release version and non-production visual chrome
version: 1.2
date_created: 2026-04-15
last_updated: 2026-04-15
owner: GitHub Copilot
status: Completed
tags: [feature, frontend, release-version, runtime, ui]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan introduces a deterministic frontend runtime indicator that shows the active app release version and adds a compact non-production visual treatment so development and preview environments are immediately distinguishable from production.

## 1. Requirements & Constraints

- **REQ-001**: Show the current app release version (semantic version) in authenticated frontend chrome on every page that renders the shared application navigation.
- **REQ-002**: Keep the app version indicator visible on both desktop and mobile navigation states.
- **REQ-003**: Derive runtime metadata without exposing secret environment variables to the client bundle.
- **REQ-006**: The displayed version must represent the app release number, not commit hash, build id, or deployment id.
- **REQ-008**: Production release contract is deterministic: `NEXT_PUBLIC_APP_VERSION` must be present and semver-compatible, with hard-fail enforced in [../.github/workflows/ci.yml](../.github/workflows/ci.yml) and at runtime when `VERCEL_ENV=production`.
- **REQ-004**: Add a small but obvious non-production visual treatment that does not materially alter production styling.
- **REQ-007**: Define DEV recognition with a redundant visual system (textual + chromatic) so environment identification never depends on color alone.
- **REQ-005**: Preserve the current information architecture, admin badge behavior, and sign-out controls in the shared navbar.
- **SEC-001**: Do not import the existing server env validator from client code paths because it validates secrets at import time.
- **SEC-002**: Do not add filesystem reads or runtime network calls to resolve app version metadata.
- **SEC-003**: Sanitize and normalize displayed version labels to avoid rendering arbitrary strings from environment input.
- **CON-001**: [src/components/layout/PageShell.tsx](../src/components/layout/PageShell.tsx) is imported by client components, so server-only logic must not be introduced there.
- **CON-002**: [src/lib/env.ts](../src/lib/env.ts) must continue validating only globally required environment variables and must not gain optional endpoint- or UI-only app version metadata requirements.
- **CON-003**: The implementation must remain compatible with Next.js 16 app router and current React 19 client/server boundaries.
- **GUD-001**: Use the existing shared chrome surfaces in [src/components/layout/Navbar.tsx](../src/components/layout/Navbar.tsx) and [src/app/globals.css](../src/app/globals.css) instead of creating a second application header.
- **GUD-002**: Prefer the app semantic version from `NEXT_PUBLIC_APP_VERSION` when provided by CI/CD and fall back deterministically to `package.json.version` when absent.
- **GUD-003**: Use a dual-signal environment marker as the default UX pattern: `explicit text label` (`DEV`/`PREVIEW`/`PROD`) + `persistent but low-noise chrome accent` in non-production.
- **GUD-004**: Keep the visual hierarchy deterministic across breakpoints: the textual label must always be visible in navbar desktop and mobile; chromatic accent must be global and passive.
- **GUD-005**: Restrict non-production chromatic changes to shell/chrome layers only (navbar top stripe + shell tint), never to semantic UI colors (errors, warnings, success) to avoid meaning collisions.
- **GUD-006**: On malformed version input, use hard-fail in Vercel production (`VERCEL_ENV=production`); allow safe fallback label (`v0.0.0-unknown`) in non-production and log server-side warnings for observability.
- **PAT-001**: Resolve runtime metadata once in the root server layout, distribute it through a client-safe provider, and consume it via a narrow hook in UI components.

### Acceptance Criteria (non-negotiable)

- **AC-001**: In production runtime, navbar badge always shows `PROD • vX.Y.Z` (or valid semver prerelease/build variant) with no missing label states.
- **AC-002**: In development and preview runtime, navbar badge always shows `DEV/PREVIEW • v...` and non-production accent is visibly present.
- **AC-003**: Environment recognition remains correct using text-only cues (badge label) across desktop and mobile.
- **AC-004**: If `NEXT_PUBLIC_APP_VERSION` is malformed or missing in non-release contexts, UI shows fallback safe version label and app remains usable.
- **AC-005**: CI release pipeline fails on `push` to `main` if configured app version is missing or semver-invalid.
- **AC-006**: In Vercel production runtime (`VERCEL_ENV=production`), fallback label `v0.0.0-unknown` must never be rendered.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Introduce a deterministic runtime metadata model centered on app release version and make it available to all client-rendered layout components without breaking existing client imports.

#### Runtime Version Contract (authoritative)

- STD-VERS-001: In Vercel production (`VERCEL_ENV=production`), `appVersion` must come only from `NEXT_PUBLIC_APP_VERSION` and be semver-valid. Outside Vercel production, source priority is `NEXT_PUBLIC_APP_VERSION` (if provided and valid) -> `package.json.version` -> `0.0.0-unknown`.
- STD-VERS-002: `versionLabel` format is always `v${appVersion}` and never empty.
- STD-VERS-003: `appVersion` must match a semver-compatible pattern before display; malformed values are downgraded to fallback.
- STD-VERS-004: Runtime metadata computation stays server-side; UI receives only resolved, safe fields.

| Task     | Description           | Completed | Date       |
| -------- | --------------------- | --------- | ---------- |
| TASK-001 | Create [src/lib/runtime-info.ts](../src/lib/runtime-info.ts) with a pure `getRuntimeInfo(source = process.env)` function and exported `RuntimeInfo` type. The function must return `channel`, `channelLabel`, `appVersion`, `versionLabel`, and `isNonProduction`. Map `channel` from `VERCEL_ENV` when present, otherwise from `NODE_ENV`; map labels exactly as `production -> PROD`, `preview -> PREVIEW`, `development/test/other -> DEV`; in production require semver-valid `NEXT_PUBLIC_APP_VERSION` and throw on missing/invalid input; in non-production compute `appVersion` from `NEXT_PUBLIC_APP_VERSION` when present, otherwise from `package.json.version`, then fallback to `0.0.0-unknown`; compute `versionLabel` exactly as `v${appVersion}`. Add semver-compatible validation/sanitization before returning public fields. | ✅ | 2026-04-15 |
| TASK-002 | Create [src/components/layout/RuntimeInfoProvider.tsx](../src/components/layout/RuntimeInfoProvider.tsx) as a client component exporting `RuntimeInfoProvider` and `useRuntimeInfo()`. The provider must accept a `RuntimeInfo` value prop, store it in React context, and throw a descriptive error if the hook is used outside the provider. | ✅ | 2026-04-15 |
| TASK-003 | Update [src/app/layout.tsx](../src/app/layout.tsx) to call `getRuntimeInfo()` on the server, set `data-runtime-env={runtimeInfo.channel}` on the `body`, and wrap the existing `Providers` tree with `RuntimeInfoProvider value={runtimeInfo}`. Keep the current fonts, metadata generation, skip link, and body layout unchanged apart from the new runtime metadata wiring. | ✅ | 2026-04-15 |
| TASK-012 | Add release-pipeline guardrails so production release jobs fail if `NEXT_PUBLIC_APP_VERSION` is missing or semver-invalid. Implement in [package.json](../package.json) scripts and in canonical workflow [../.github/workflows/ci.yml](../.github/workflows/ci.yml) (no alternative workflow for this gate). | ✅ | 2026-04-15 |

### Implementation Phase 2

- GOAL-002: Surface the app release version in shared frontend chrome and add a compact non-production visual marker that is immediately recognizable.

#### DEV Visual Recognition Standard (authoritative)

- STD-001: Recognition must be immediate in under 1 second via two simultaneous cues:
	- cue A (text): runtime badge includes environment label (`DEV`/`PREVIEW`/`PROD`).
	- cue B (chrome): non-production-only accent stripe and shell tint.
- STD-002: Badge remains the primary semantic cue; chromatic accent is secondary reinforcement.
- STD-003: For accessibility and reliability, no flow may rely on color-only recognition.
- STD-004: Production has no accent stripe and no extra tint boost, preserving current brand baseline.
- STD-005: Preview follows the same non-production visual family as DEV, but keeps explicit `PREVIEW` label in text.

| Task     | Description           | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-004 | Create [src/components/layout/RuntimeStatusBadge.tsx](../src/components/layout/RuntimeStatusBadge.tsx) as a presentational client component that reads `useRuntimeInfo()` and renders a compact badge with exact text structure `<CHANNEL_LABEL> • <VERSION_LABEL>`. The badge must expose an accessible label describing environment and app release version. | ✅ | 2026-04-15 |
| TASK-005 | Update [src/components/layout/Navbar.tsx](../src/components/layout/Navbar.tsx) to render `RuntimeStatusBadge` in the desktop user area next to the existing role badge and email, and to render the same indicator at the top of the mobile menu. Preserve all current links, active-state logic, and admin visibility rules. | ✅ | 2026-04-15 |
| TASK-006 | Update [src/app/globals.css](../src/app/globals.css) to add non-production-only styling keyed off `body[data-runtime-env='development']`, `body[data-runtime-env='preview']`, and `body[data-runtime-env='test']`. Apply exactly two global chrome deltas in non-production: (1) a thin top accent stripe (2px) on the sticky navbar, and (2) a shell tint boost (max +15% opacity on existing decorative layers). Do not alter production selectors, semantic status colors, or base typography. | ✅ | 2026-04-15 |
| TASK-010 | Update [tests/unit/Navbar.test.tsx](../tests/unit/Navbar.test.tsx) to assert explicit textual environment label visibility (`DEV`, `PREVIEW`, `PROD`) in desktop and mobile states, guaranteeing non-color recognition. | ✅ | 2026-04-15 |
| TASK-011 | Add [tests/unit/runtime-env-visual-contract.test.ts](../tests/unit/runtime-env-visual-contract.test.ts) to assert CSS contract selectors for non-production chrome accents exist and production selector remains unmodified (no accent class/attribute path). | ✅ | 2026-04-15 |

### Implementation Phase 3

- GOAL-003: Validate app-version mapping, provider wiring, and navbar rendering so the feature remains stable across production and non-production runtimes.

| Task     | Description           | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-007 | Add [tests/unit/runtime-info.test.ts](../tests/unit/runtime-info.test.ts) covering four deterministic cases: production with `NEXT_PUBLIC_APP_VERSION`, preview with `NEXT_PUBLIC_APP_VERSION`, local development fallback to `package.json.version`, and test environment fallback. Assert exact `channelLabel`, `appVersion`, `versionLabel`, and `isNonProduction` outputs. | ✅ | 2026-04-15 |
| TASK-008 | Add [tests/unit/RuntimeInfoProvider.test.tsx](../tests/unit/RuntimeInfoProvider.test.tsx) covering successful context consumption through the provider and the thrown error message when `useRuntimeInfo()` is invoked outside the provider. | ✅ | 2026-04-15 |
| TASK-009 | Update [tests/unit/Navbar.test.tsx](../tests/unit/Navbar.test.tsx) to mock `useRuntimeInfo()` and assert that the runtime badge renders in desktop chrome, remains present in the mobile menu after opening it, and shows the correct environment and app version label for both a production and a non-production scenario. | ✅ | 2026-04-15 |
| TASK-013 | Extend [tests/unit/runtime-info.test.ts](../tests/unit/runtime-info.test.ts) with malformed-version scenarios (`NEXT_PUBLIC_APP_VERSION` empty/invalid) asserting safe fallback `v0.0.0-unknown` and stable environment labels. | ✅ | 2026-04-15 |

### As-Is Notes (Implemented Behavior)

- PROD hard-fail for missing/invalid `NEXT_PUBLIC_APP_VERSION` is enforced in Vercel production runtime (`VERCEL_ENV=production`) and in CI release gate on `push` to `main`.
- Local `next build` (production-like without `VERCEL_ENV=production`) falls back to `package.json.version` with warning logs to preserve developer usability while keeping release strictness.

## 3. Alternatives

- **ALT-001**: Read runtime app version metadata directly inside [src/components/layout/PageShell.tsx](../src/components/layout/PageShell.tsx). Rejected because [src/app/admin/AdminClientPage.tsx](../src/app/admin/AdminClientPage.tsx) and [src/app/artifacts/ArtifactsClientPage.tsx](../src/app/artifacts/ArtifactsClientPage.tsx) import PageShell from client code paths, making server-only env resolution unsafe there.
- **ALT-002**: Use commit hash (`VERCEL_GIT_COMMIT_SHA`) as the displayed version. Rejected because the requirement is to show app release version number, not deployment metadata.
- **ALT-003**: Add a dedicated floating environment ribbon outside the existing navbar. Rejected because it creates a second persistent chrome element and duplicates space already available in the shared navigation.

## 4. Dependencies

- **DEP-001**: Runtime variables `VERCEL_ENV` (channel mapping) and `NEXT_PUBLIC_APP_VERSION` (release override), with deterministic fallback to `package.json.version`.
- **DEP-002**: Existing client provider stack in [src/components/layout/Providers.tsx](../src/components/layout/Providers.tsx), which remains the anchor point for application-wide client context.
- **DEP-003**: Existing shared navigation component in [src/components/layout/Navbar.tsx](../src/components/layout/Navbar.tsx) and shared global styles in [src/app/globals.css](../src/app/globals.css).
- **DEP-004**: CI/CD workflow gate in [../.github/workflows/ci.yml](../.github/workflows/ci.yml) validates `NEXT_PUBLIC_APP_VERSION` for release context (`push` to `main`).

## 5. Files

- **FILE-001**: [src/lib/runtime-info.ts](../src/lib/runtime-info.ts) — pure runtime metadata resolver and exported types.
- **FILE-002**: [src/components/layout/RuntimeInfoProvider.tsx](../src/components/layout/RuntimeInfoProvider.tsx) — client context bridge for runtime app-version metadata.
- **FILE-003**: [src/components/layout/RuntimeStatusBadge.tsx](../src/components/layout/RuntimeStatusBadge.tsx) — app version/environment badge renderer.
- **FILE-004**: [src/app/layout.tsx](../src/app/layout.tsx) — root wiring for provider injection and body data attribute.
- **FILE-005**: [src/components/layout/Navbar.tsx](../src/components/layout/Navbar.tsx) — visible indicator placement in desktop and mobile chrome.
- **FILE-006**: [src/app/globals.css](../src/app/globals.css) — non-production visual accent selectors.
- **FILE-007**: [tests/unit/runtime-info.test.ts](../tests/unit/runtime-info.test.ts) — metadata resolution tests.
- **FILE-010**: [package.json](../package.json) — source of fallback app release version (`version` field).
- **FILE-012**: [../.github/workflows/ci.yml](../.github/workflows/ci.yml) — canonical version contract gate for release pipeline.
- **FILE-013**: [../scripts/check-app-version.mjs](../scripts/check-app-version.mjs) — semver guard script used by CI release gate.
- **FILE-008**: [tests/unit/RuntimeInfoProvider.test.tsx](../tests/unit/RuntimeInfoProvider.test.tsx) — provider contract tests.
- **FILE-009**: [tests/unit/Navbar.test.tsx](../tests/unit/Navbar.test.tsx) — UI rendering assertions for the indicator.
- **FILE-011**: [tests/unit/runtime-env-visual-contract.test.ts](../tests/unit/runtime-env-visual-contract.test.ts) — non-production visual contract assertions.

## 6. Testing

- **TEST-001**: Run `npm run test -- runtime-info.test.ts RuntimeInfoProvider.test.tsx Navbar.test.tsx` and require all new or updated unit tests to pass.
- **TEST-002**: Run `npm run lint` and confirm no client/server boundary errors or unused imports are introduced in layout components.
- **TEST-003**: Run `npm run typecheck` and confirm the new provider types serialize cleanly through the root layout boundary.
- **TEST-004**: Manually verify one production-like render and one development-like render by setting `VERCEL_ENV` and `NEXT_PUBLIC_APP_VERSION`, then confirm the navbar badge text and non-production accent behavior match the resolved metadata.
- **TEST-005**: Manual UX check on desktop and mobile viewport: environment must be correctly identified using text only (badge label visible) with color perception disabled or ignored.
- **TEST-006**: Manual visual regression check: production has no top accent stripe; development/preview/test show stripe and stronger shell tint only.
- **TEST-007**: CI check: fail build when `NEXT_PUBLIC_APP_VERSION` is empty or semver-invalid in release context.
- **TEST-008**: Unit check: invalid version input renders fallback `v0.0.0-unknown` and does not break navbar rendering.
- **TEST-009**: Production path check: runtime-info resolver throws when `VERCEL_ENV=production` and `NEXT_PUBLIC_APP_VERSION` is missing/invalid and never emits fallback label.

## 7. Risks & Assumptions

- **RISK-001**: If CI/CD does not set `NEXT_PUBLIC_APP_VERSION`, the UI falls back to `package.json.version`; this is acceptable but requires disciplined version bumping before release.
- **RISK-002**: Excessive non-production styling could reduce the deliberate visual language already defined in [src/app/globals.css](../src/app/globals.css); keep the accent small and limited to existing surfaces.
- **RISK-004**: If accent intensity is too subtle, DEV recognition may still be missed; if too strong, perceived quality of non-production environment may degrade during demos. Keep stripe thickness and tint boost within the limits in TASK-006.
- **RISK-003**: If future layout code starts consuming the provider outside the root layout tree, the hook guard will throw; this is desired fail-fast behavior and must be preserved.
- **RISK-005**: Version mismatch between `NEXT_PUBLIC_APP_VERSION` and `package.json.version` may generate support confusion; mitigate with CI gate and release checklist.
- **RISK-006**: Allowing fallback in production can mask release misconfiguration, weaken incident triage, and break auditability of the running version; this is mitigated by hard-fail policy in [../.github/workflows/ci.yml](../.github/workflows/ci.yml).
- **ASSUMPTION-001**: All authenticated application pages continue to render through the shared navbar, so one badge placement there is sufficient to satisfy the visibility requirement.
- **ASSUMPTION-002**: Preview environments should be treated as non-production for visual differentiation, even though the requested wording focused on DEV.

## 8. Related Specifications / Further Reading

[.github/copilot-instructions.md](../.github/copilot-instructions.md)
[docs/implement-index.md](../docs/implement-index.md)
[docs/adrs/001-modular-llm-controller-architecture.md](../docs/adrs/001-modular-llm-controller-architecture.md)