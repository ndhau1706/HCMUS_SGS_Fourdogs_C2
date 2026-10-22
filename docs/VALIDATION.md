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

## Preserved original Tide service evidence

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

## Isolated replacement evidence

A subsequent authorized staging run on the same date preserved the original service and application configuration:

- A second official TideCloak 0.14.41 container runs on a separate loopback port with independent persistent H2 data and random private bootstrap credentials. The latest official amd64 image was checked; it resolves to the same inspected image ID as the original service.
- Exactly one supported realm/licence setup returned HTTP 200. Authoritative billing and licence-detail reads confirm an active Free licence: **capacity 5, usage 0, available 5** at inspection. This is a separately issued replacement licence; the original **5/5** allocations have not been reclaimed or identified.
- Four authorized local records were committed through FirstAdmin bootstrap and private enrollment links prepared. None is yet Tide-linked or an admin-role holder. Employee has effective `viewer`, no `infra-operator` and no management roles. There are no pending changes at this checkpoint.
- IGA is enabled with the Tide attestor. The signed admin-policy endpoint returns 404 before the first enrolled admin grant; the full replacement `check:realm` therefore does not yet pass. Read-only inventory confirms the separate user/role facts above. The original `npm run check:realm` passes as a diagnostic and continues to report one enrolled admin with threshold 1, below acceptance.
- The genuine candidate adapter contains embedded public keys and a signed origin entry. Tide doctor reports **18 passes, 0 warnings, 0 failures** on a clean source snapshot with the candidate configuration and staged realm, checking the existing app's served relay at the candidate issuer/client path. This is wiring evidence, not a fresh authenticated app session. CloudGuard still uses the original adapter.
- A newer cold backup under private `.data/old-tide-backup/` passed archive readability, stopped-source H2/environment byte comparison, exact saved-image config matching and all archive checksums. The earlier independent H2 logical recovery/restore check remains valid for its earlier snapshot; that logical check was not repeated on the newer archive.
- Lint, type checking, the production build, 52 unit/security/diagnostic tests, 7 HTTP tests and 5 browser tests passed during this run on the unchanged application. These automated tests do not establish live Tide enrollment or QEA.

## Pending human evidence

1. Independently enroll all four intended identities in the licensed replacement. Complete first-admin bootstrap, then subsequent admin grants and policy regeneration through genuine enclave authorization. Verify actual holders and the effective request threshold.
2. Validate candidate sign-in and configuration, then switch the application adapter with rollback preserved and verify live callback/logout. Investigate the original allocation roster/reclaim separately with Tide support; the original allocation count remains unresolved. See [RECOVERY.md](RECOVERY.md).
3. Observe a real governed role change: pending → one approval insufficient → second independent enclave approval applies.
4. Obtain a fresh Employee Tide token and observe actual backend 403 before the grant and 200 after it.
5. Record and publish the genuine MP4, then submit the official form.

Use the manual acceptance table in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Until these checks are completed, describe this deliverable as implemented application code with a provisioned Tide realm and **pending live enrollment/QEA acceptance**, not a fully verified hackathon submission.
