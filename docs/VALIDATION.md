# Validation evidence

Observed locally on 2026-10-22 (Asia/Ho_Chi_Minh). No real user credentials, tokens, enrollment links or private identity records are included in this report.

| Check | Observed result | Scope |
|---|---|---|
| npm installation / lockfile | Dependencies installed | Node 20.19.2 |
| Lint | Pass | Next/TypeScript rules; no disabled auth/security checks |
| Type checking | Pass | Strict TypeScript |
| Unit/security/diagnostic tests | 52 passed | Ephemeral signing keys, actual handlers, enrollment/identity separation, effective roles and remote-license reporting regressions |
| Built HTTP integration | 7 passed | Separate production Next server, test public-key configuration, signed JWT/DPoP; no authentication bypass |
| Browser tests | 5 passed | Desktop/mobile navigation, protected unauthenticated HTTP calls, public configuration, exact DPoP relay |
| Production build | Pass | Next.js 16.4.2 / webpack |
| Clean staged public checkout | npm ci and build pass | No .env, adapter, database, private notes or pre-existing dependencies |
| Local shutdown and resume | Pass | App and named Tide container stop, data preserved, enrollment bootstrap resumes |
| Tide doctor | RESULT: OK, 17 passes, one pending-request warning | Clean source snapshot, actual served relay and live realm; no security changes |
| Cold H2 recovery backup | Verified; logical recovery and restore into isolated H2 succeeded | Original stopped DB, full image/container archives and private configuration preserved locally |
| Official relay | Matching SDK and pack hash | `9d7844b938f0a2565fa910d3d30e9b8797cbfd6e0b73d59d804169a089aea757` |
| Runtime dependency audit | 0 vulnerabilities | `npm audit --omit=dev` |
| Full dependency audit | 5 high development-tool findings | Unfixed braces advisory in lint tooling; see SECURITY.md |
| TruffleHog public-source scan | 0 findings | Local scan, verification/network checks disabled |
| README overview | 295 words including prompts/headings | Five exact official prompts from Tide's public config.js |

The signed-input tests cover missing/fabricated/invalid/expired tokens, issuer/azp/audience/type/time checks, tampered roles, missing pinned configuration, private-key/master config rejection, role spoofing, same-name client roles, DPoP binding/signature/method/URL/token hash/time/replay checks, 401/403/503, health/unknown IDs, idempotency, cooldown, logging and generic handler failures. Test JWTs are created with ephemeral local keys. **They are not tokens issued by Tide and do not establish live governance.**

The HTTP suite confirms that separate built route handlers share synthetic state and journal in one process. It also verifies an API-backed viewer 403 and operator 200, duplicate handling with fresh proofs, proof replay rejection, frontend header/body spoofing rejection, and absence of a role-grant endpoint. It uses the registered `localhost` origin: Next's internal request origin differs when clients address 127.0.0.1. This app does not weaken proof validation by trusting arbitrary forwarded headers.

On the recovery run, lint, type checking, all 52 unit/diagnostic tests, production build, 7 HTTP tests and all 5 browser tests passed. Earlier development-server runs had a hot-reload error (`Router action dispatched before initialization`); the recovery run used the production build. No browser assertion or security control was relaxed. License tests validate diagnostic handling and privacy, not live enrollment.

## Genuine local Tide service evidence

- Tide MCP tools responded; official pack v1.9.33 was consulted and copied.
- Official development container inspected: TideCloak 0.14.41, image digest pinned in the bootstrap.
- CloudGuard realm and public client were created using official bootstrap endpoints.
- Licence setup succeeded; the genuine vendor endpoint exported an adapter with embedded JWKS, vendor and signed origin fields.
- Read-only realm inspection reports `isIGAEnabled=true`, `iga.attestor=tide`, and both required realm roles present.
- The first administrator is now verified as enabled, Tide IdP-linked and holding the effective `realm-management/tide-realm-admin` role. There is **one distinct enrolled admin identity**, and the stored signed policy threshold is **1**. This does not establish a 2-of-3 realm.
- Fresh remote billing and license-detail reads now succeed: an active free license has exhausted remote capacity. `billing/summary` and `getLicenseDetails` agree on usage. Earlier empty HTTP 200 bodies coincided with remote 404/502/503/504 and timeouts; they were not evidence of expiry. The allocation roster and supported per-identity release semantics remain unavailable through the documented APIs inspected. No local users were deleted, no new enrollment attempted, and no license activation/purchase or realm reset performed during recovery. Aggregate operator readings stay in private local diagnostics.
- The original container was stopped at the start of recovery. Its consistent offline H2 backup was verified before starting it. Docker regenerated DNS from the working host resolver. Six ORK roots returned verified HTTPS 200 from both host and container, and two from the browser. This confirms current transport reachability only; it does not certify token/signing/enrollment functionality. The original container, realm, keys, data and first admin are preserved.
- A genuine `CREATE_USER` request for the ordinary Employee was captured with HTTP 202 and remains pending at 0/1 authorizations. It has not been approved or committed by automation. Additional-admin enrollment, role grants and live quorum acceptance remain incomplete.
- The sign-in action reaches Tide's genuine ORK enclave. The fresh headless probe displays the login form without the earlier generic error, but Chromium still blocks local branding images and the DPoP relay under Local Network Access checks. The owner must handle the normal per-origin permission in their actual browser. No security setting was bypassed, credentials entered or successful authenticated user session claimed; callback, logout and live token issuance still need human verification.

## Pending human evidence

1. Obtain the actual allocation roster and a supported capacity-recovery procedure from Tide support; preserve the existing active realm. A local reset is not a demonstrated way to release remote allocations. See [RECOVERY.md](RECOVERY.md).
2. Independently enroll the additional admins and Employee, approve the intended provisioning and role grants through genuine enclave authorization, and verify actual holders and the effective request threshold.
3. Observe a real governed role change: pending → one approval insufficient → second independent enclave approval applies.
4. Obtain a fresh Employee Tide token and observe actual backend 403 before the grant and 200 after it.
5. Record and publish the genuine MP4, then submit the official form.

Use the manual acceptance table in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Until these checks are completed, describe this deliverable as implemented application code with a provisioned Tide realm and **pending live enrollment/QEA acceptance**, not a fully verified hackathon submission.
