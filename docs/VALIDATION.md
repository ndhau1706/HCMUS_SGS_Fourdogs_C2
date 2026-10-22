# Validation evidence

Observed locally on 2026-10-22 (Asia/Ho_Chi_Minh). No real user credentials, tokens, enrollment links or private identity records are included in this report.

| Check | Observed result | Scope |
|---|---|---|
| npm installation / lockfile | Dependencies installed | Node 20.19.2 |
| Lint | Pass | Next/TypeScript rules; no disabled auth/security checks |
| Type checking | Pass | Strict TypeScript |
| Unit/security/diagnostic tests | 46 passed | Ephemeral signing keys, actual handlers, enrollment/identity separation and effective-role diagnostic regressions |
| Built HTTP integration | 7 passed | Separate production Next server, test public-key configuration, signed JWT/DPoP; no authentication bypass |
| Browser tests | 5 passed | Desktop/mobile navigation, protected unauthenticated HTTP calls, public configuration, exact DPoP relay |
| Production build | Pass | Next.js 16.4.2 / webpack |
| Clean staged public checkout | npm ci and build pass | No .env, adapter, database, private notes or pre-existing dependencies |
| Local shutdown and resume | Pass | App and named Tide container stop, data preserved, enrollment bootstrap resumes |
| Tide doctor | RESULT: OK, 18 passes before account provisioning | Static wiring, served relay bytes/CSP/headers and read-only realm checks |
| Official relay | Matching SDK and pack hash | `9d7844b938f0a2565fa910d3d30e9b8797cbfd6e0b73d59d804169a089aea757` |
| Runtime dependency audit | 0 vulnerabilities | `npm audit --omit=dev` |
| Full dependency audit | 5 high development-tool findings | Unfixed braces advisory in lint tooling; see SECURITY.md |
| TruffleHog public-source scan | 0 findings | Local scan, verification/network checks disabled |
| README overview | 295 words including prompts/headings | Five exact official prompts from Tide's public config.js |

The signed-input tests cover missing/fabricated/invalid/expired tokens, issuer/azp/audience/type/time checks, tampered roles, missing pinned configuration, private-key/master config rejection, role spoofing, same-name client roles, DPoP binding/signature/method/URL/token hash/time/replay checks, 401/403/503, health/unknown IDs, idempotency, cooldown, logging and generic handler failures. Test JWTs are created with ephemeral local keys. **They are not tokens issued by Tide and do not establish live governance.**

The HTTP suite confirms that separate built route handlers share synthetic state and journal in one process. It also verifies an API-backed viewer 403 and operator 200, duplicate handling with fresh proofs, proof replay rejection, frontend header/body spoofing rejection, and absence of a role-grant endpoint. It uses the registered `localhost` origin: Next's internal request origin differs when clients address 127.0.0.1. This app does not weaken proof validation by trusting arbitrary forwarded headers.

On the follow-up run, lint, type checking, all 46 unit/diagnostic tests, production build and 7 HTTP tests passed. The first browser run hit a Next development hot-reload error (`Router action dispatched before initialization`); after the development server settled, the unchanged browser suite passed all 5 tests. No browser assertion or security control was relaxed.

## Genuine local Tide service evidence

- Tide MCP tools responded; official pack v1.9.33 was consulted and copied.
- Official development container inspected: TideCloak 0.14.41, image digest pinned in the bootstrap.
- CloudGuard realm and public client were created using official bootstrap endpoints.
- Licence setup succeeded; the genuine vendor endpoint exported an adapter with embedded JWKS, vendor and signed origin fields.
- Read-only realm inspection reports `isIGAEnabled=true`, `iga.attestor=tide`, and both required realm roles present.
- The first administrator is now verified as enabled, Tide IdP-linked and holding the effective `realm-management/tide-realm-admin` role. There is **one distinct enrolled admin identity**, and the stored signed policy threshold is **1**. This does not establish a 2-of-3 realm.
- Further enrollment is blocked by a plan/subscription message. Local licence material exists, but licensing details/subscription lookups returned empty HTTP 200 bodies while corresponding remote calls logged HTTP 404. Earlier remote failures included 502/503 and timeouts. Active status, expiry, tier and licensed user count remain unverified; blank cards are not evidence of expiry.
- A genuine `CREATE_USER` request for the ordinary Employee was captured with HTTP 202 and remains pending at 0/1 authorizations. It has not been approved or committed by automation. Additional-admin enrollment, role grants and live quorum acceptance remain incomplete.
- The sign-in action reaches Tide's genuine ORK enclave. Headless sign-in then displayed “An unexpected error occurred”; Chromium also reported loopback branding-image access blocked by Local Network Access/CORS. The latter observation alone does not establish the cause of the sign-in failure. No security setting was bypassed and no successful authenticated user session is claimed.

## Pending human evidence

1. Resolve the external enrollment/licensing failures using official Tide support or service recovery; preserve the existing realm.
2. Independently enroll the additional admins and Employee, approve the intended provisioning and role grants through genuine enclave authorization, and verify actual holders and the effective request threshold.
3. Observe a real governed role change: pending → one approval insufficient → second independent enclave approval applies.
4. Obtain a fresh Employee Tide token and observe actual backend 403 before the grant and 200 after it.
5. Record and publish the genuine MP4, then submit the official form.

Use the manual acceptance table in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Until these checks are completed, describe this deliverable as implemented application code with a provisioned Tide realm and **pending live enrollment/QEA acceptance**, not a fully verified hackathon submission.
