# Reproducible local setup

Use Node >=20.19, npm, Git, Docker Engine/Compose, curl, jq, and an Internet connection to Tide's network. Run commands at the repository root. Keep port 3000 for CloudGuard and 8080 for TideCloak. The frontend origin is **http://localhost:3000**, not 127.0.0.1: Tide's signed origin capability and redirect registration must match.

```bash
npm ci
cp .env.example .env
chmod 600 .env
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```

Put the generated password in `KC_BOOTSTRAP_ADMIN_PASSWORD` using your editor. Set `TIDE_LICENSE_EMAIL` to an email you control. Read https://tide.org/legal and set `TIDE_TERMS_ACCEPTED=yes` only if you personally agree. The bootstrap rejects missing agreement/email and never invents them. The licence service may require a plan/payment or human service configuration; follow its genuine response. No paid purchase is automated.

The default `DOCKER_HOST` in the sample points at the system daemon. If your Docker socket differs, set it in `.env`. This environment had a stale Podman socket override; using the actual system socket resolved it without a global configuration change.

## Start the identity service and provision the realm

```bash
npm run init
```

The script is adapted from Tide's official customer portal starter. It starts a loopback-only `cloudguard-tidecloak` development container, imports the CloudGuard realm/client, activates the licence, sets the Tide attestor, enables QEA, and prepares the first administrator. The image is pinned to the inspected official digest (server 0.14.41); JS SDK 0.14.41, Next SDK 0.14.40 and verification SDK 0.14.33 are the current published package versions used by the lockfile.

Open the **one-time enrollment URL printed by the script**. It is also saved to ignored `.data/enrollment-url.txt`. Complete your own Tide account creation/sign-in in the enclave. Never commit, record publicly, or share the enrollment URL as a submission artifact. The script waits for your account to link, finishes signed IdP configuration, grants the first real admin role, and exports `data/tidecloak.json`. Keep the terminal running until it reports completion. This initial setup occurs before the multi-admin governance boundary; it is not evidence of multi-admin QEA.

If interrupted at enrollment, rerun `npm run init`: `.data/bootstrap-waiting` resumes the existing process. Do not run two initializers at once. The script refuses to overwrite other existing container/database state. If the marker is absent and an installation exists, preserve it and use its console and `npm run export:adapter`; do not delete the realm to fix an enrollment issue. An interrupted import/licence failure before enrollment requires inspecting the original console/container state, not repeating activation blindly.

To re-export the genuine public adapter using the existing operator credentials:

```bash
npm run export:adapter
npm run check:realm
npm run check:license
```

These are local operator commands. Administrator tokens exist only in command memory and are never returned to the browser. `check:realm` is read-only. It paginates users, checks effective roles (including inherited roles), requires both the Tide user attribute and an actual Tide IdP link for enrollment, and detects repeated admin identities without printing identifiers or emails. For the suggested `cloudguard-employee` username, it checks enrollment, viewer access, separation from admins and absence of infrastructure/operator or realm-management privileges. It also reports the stored signed admin-policy threshold and pending-request count. `identityAndRolePreconditionsMet` covers identity/role prerequisites only; **it does not mark H2 complete or prove live quorum enforcement**. Verify that behavior in an actual governed request.

`check:license` reports remote license status/capacity/usage separately from local users. It prints only allowlisted fields; failed or empty readings remain unknown. See [recovery and backup guidance](RECOVERY.md) before any cleanup, container replacement or reset. For an authorized isolated replacement, follow its staging and cutover sequence; do not run initial setup over an existing database or replace the app adapter before candidate verification. For a new installation only, optional `TIDECLOAK_DNS` configures tested resolver IPs per container without changing global Docker settings.

The vendor adapter includes embedded public JWKS and signed `client-origin-auth-*` capabilities. CloudGuard serves only allowlisted public SDK inputs at `/api/config`. Never use a confidential client or put secrets in this adapter. Never replace it with a handcrafted mock or a generic Keycloak adapter.

## Run CloudGuard

```bash
npm run dev
# Or: npm run build && npm start
```

Open http://localhost:3000. Click **Sign in with TideCloak** and use an enrolled identity. The official provider performs the authorization-code/PKCE flow; `/auth/redirect` processes the callback. DPoP stays strict. `secureFetch` sends an absolute URL, the access token and its proof to the backend.

If Tide is unconfigured, public pages and navigation still render an explicit setup notice. Protected APIs fail closed. There is no preview authentication or fallback identity.

## Configure real 2-of-3 governance

Console: http://localhost:8080/realms/cloudguard/tide-console/

1. Complete the first administrator (Admin A) enrollment above. Use an enrolled realm admin for subsequent steps, not the master identity.
2. In **People → Add a user**, create Admin B. Give their one-time enrollment link to that independent person. They complete their own Tide identity in an isolated browser profile.
3. With **Advanced** enabled, assign `realm-management/tide-realm-admin` in their role mappings. Approve the governed grant in **QEA Approvals** using the genuine enclave. Repeat for Admin C. The documented threshold for two holders is still one; three holders are required for the intended threshold of two.
4. Confirm all three distinct people are enrolled and hold the admin role. Check that `isIGAEnabled` is true and `iga.attestor` is `tide`. Observe the effective threshold in the console; do not infer successful enforcement from the intended UI illustration.
5. Create Employee in People and complete separate Tide enrollment. Default roles include `viewer` and Tide/app prerequisites. Ensure the Employee has no `infra-operator`, no admin role, and no composite/default role granting operator indirectly.
6. Confirm the `cloudguard-client` client uses standard code flow, is public, has password grants disabled, includes an audience mapper for itself, has `dpop.bound.access.tokens=true`, the exact localhost origin, `/auth/redirect`, and `/silent-check-sso.html`. Existing-client changes are governed and may need enclave approvals.
7. Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Grant the **realm** role `infra-operator`, not a same-name client role. A viewer restart must return 403; one approval at a verified threshold of two must not grant the role; independent second approval applies it; fresh employee claims must enable a 200 synthetic restart.

CloudGuard intentionally links to Tide Console instead of mirroring approval status with privileged credentials. No application endpoint can grant roles, approve requests, or change governance policy.

## Stop and restart without losing Tide enrollment

```bash
npm stop
# Later:
DOCKER_HOST=unix:///var/run/docker.sock docker start cloudguard-tidecloak
npm run dev
```

`npm stop` terminates only the recorded CloudGuard process after checking its working directory/command, and stops the named Tide container. It does not remove the container or database. Ctrl+C also stops the current app terminal. If the bootstrap is waiting in another terminal, Ctrl+C that terminal before stopping Tide.

Synthetic resources, replay/idempotency caches and activity view reset when the app process restarts. Tide state persists in ignored `data/`. Local logs are in ignored `.data/`.

## Troubleshooting

- Docker unavailable: `DOCKER_HOST=unix:///var/run/docker.sock docker info`. Start your own daemon or correct the socket; do not overwrite unrelated configuration.
- Enrollment unfinished: reopen the original local link, keep bootstrap running, inspect `.data/tide-bootstrap.log` if output was redirected. Expired links must be regenerated for the same user in the genuine Tide console.
- Config 503: finish licence/enrollment and run `npm run export:adapter`; reload the browser. Never paste secrets into a public support report.
- Valid identity but 403: inspect the **realm** role in Governance, complete genuine QEA approvals, sign out and sign in again. Frontend edits cannot grant permission.
- Token 401: use localhost consistently; confirm issuer/audience mapper/client, freshness, strict DPoP, and system clock. Bare curl Bearer calls are expected to fail. Do not copy tokens into logs to debug.
- DPoP popup fails: verify relay SHA-256 `9d7844b938f0a2565fa910d3d30e9b8797cbfd6e0b73d59d804169a089aea757`, wildcard rewrite, CSP, popups and browser storage permissions. Keep the SDK asset byte-exact.
- Build: use the supplied webpack scripts. Tide's package compatibility aliases are in `next.config.ts`.
- QEA 412: quorum not met. QEA 409 requiring enclave: use independent human approval in the console, never script around it.
- Blank licensing cards: inspect the supported `vendorResources/getLicenseDetails`, `getSubscriptionStatus` and `billing/summary` responses and matching sanitized TideCloak logs. An empty HTTP 200 response or a failed active-license lookup is not proof of expiry; remote lookup failures can produce empty data. Do not activate another subscription to diagnose it. See [Tide's licensing guide](https://docs.tide.org/Admin/license).
- ORK errors: compare DNS and HTTPS from the host, the existing container, and the browser. A successful ORK homepage does not prove signing, enrollment or billing routes work. Preserve data before container changes; avoid global Docker DNS changes. Local Network Access permission is a separate browser checkpoint: follow [Tide's browser guide](https://docs.tide.org/FAQ/chromium-error) for the actual enclave origin without disabling security checks.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
npm run test:browser
npm audit --omit=dev
```

Playwright uses installed Chrome when available (`CHROME_PATH` can override); otherwise install its Chromium with `npx playwright install chromium`. Browser tests are unauthenticated and do not count as live Tide or QEA evidence. See [SECURITY.md](SECURITY.md) for deployment limits and the known development dependency advisory.
