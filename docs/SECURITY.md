# Security model

CloudGuard demonstrates **governed assignment of infrastructure privileges**, followed by resource-server enforcement. No restart is signed by Tide. Infrastructure, health checks, CPU, memory, uptime, and restart effects are synthetic. The telemetry trace is an illustration, not measured history.

## Trust boundary

1. A genuine licensed TideCloak realm uses the Tide identity provider and `iga.attestor=tide`.
2. QEA captures governed writes. Three separately enrolled `realm-management/tide-realm-admin` holders are intended to require two approvals. The current documented formula is `max(1, floor(0.7 × N))`; **observe the actual threshold on a live request**. Two admins require only one approval under this formula.
3. Independent administrators review and authorize in the genuine Tide enclave. There are no approval endpoints, counters, service-account grants, or admin tokens in the CloudGuard browser.
4. The employee signs in again to obtain a fresh Tide-issued access token with the governed **realm** role `infra-operator`.
5. Every protected route verifies the token and a fresh sender-bound proof. Only then can a restart mutate the fictional resource state.

The protected cryptographic assets are Tide's signing authority, attested identity/role configuration, resulting token signature, and the sender's DPoP proof. CloudGuard's operational log and simulated restarts do not acquire Tide cryptographic guarantees.

## JWT and DPoP enforcement

- The official `@tidecloak/verify` helper verifies the JWT against embedded public keys from a genuine vendor adapter. Config validation prevents the SDK's remote-key fallback. No key is fetched from a potentially compromised issuer at verification time.
- Exact issuer and authorized client (`azp`), the explicit CloudGuard audience (`aud`), required subject/expiry/issued-at claims, access-token type, and expiry are enforced. Zero expiration grace; future `iat` has 60 seconds of tolerance.
- The realm template maps `cloudguard-client` into `aud`. Exporting an adapter from a client without that mapper will fail authorization until its governed configuration is corrected.
- Only the **realm** role `infra-operator` authorizes restarts. A same-name role belonging to another client, a request header/body, or UI state cannot grant access.
- Strict DPoP is enabled in the SDK and realm template. Every protected route rejects unbound tokens and bound tokens sent as ordinary Bearer credentials. The official Tide Agent Pack verifier checks ES256 signature, public P-256 key, thumbprint, access-token hash, HTTP method, exact URL without query, timestamp, and unique `jti`.
- The signed DPoP relay is copied byte-for-byte from Tide's pack and matches the installed JS SDK. Its special CSP and wildcard rewrite preserve the official enclave behavior. General CSP allows arbitrary ORK frames for re-homing; this is a deliberate development tradeoff, not a complete hardened CSP.
- Forwarded host/protocol headers are not trusted. The local server is bound to loopback. A deployment behind a proxy must deliberately implement a fixed trusted public origin and test proof matching; it cannot enable blind forwarded-header trust.
- 401 = missing/invalid token or proof; 403 = valid identity without the required role; 503 = missing/invalid Tide configuration. Handler failures return a generic 500, without exposing verifier details.

## Prototype limitations

**The master realm is never governed by QEA.** Tide's documentation describes it as an administrative escape hatch for other realms. CloudGuard does not demonstrate resistance to master-administration capabilities. Protect and segregate master credentials; use enrolled realm administrators in the demonstration. Do not use a master token to manufacture QEA evidence.

An attacker controlling this application host can change its authorization code, synthetic state, or pinned configuration. A compromised browser/origin can act as that session and use its DPoP key. This app cannot promise absolute protection against system administrators, malicious frontend updates, colluding quorum members, all infrastructure attackers, or all network attacks.

Authorization is checked against a signed token, not live introspection. Previously issued access survives role revocation until token expiry (template: ten minutes). Refresh/re-login for new role claims. Revocation is not claimed to be instantaneous.

The DPoP replay cache, idempotency cache, resource state, and activity view use process memory. **Run one Node process.** Replay entries are bounded at 20,000 and fail closed when full; operation keys are retained for one hour, bounded at 10,000. Future-dated proofs remain cached through their full acceptance window. A process restart resets these caches and permits still-fresh proofs to be replayed. Multi-instance/serverless or durable deployment requires a shared atomic replay/idempotency store and coordinated expiry before use.

Operation cooldown is five seconds. Duplicate idempotency keys for the same subject/resource return the original result without another mutation. Key reuse for another resource returns 409. An expired idempotency key may execute again; the guarantee is scoped to one process and one hour.

Authenticated realm users can read the shared workspace application log (latest 300 process events). Actor is the verified subject, never a submitted username. Anonymous failures use `unverified`. Local JSONL files rotate at 2 MB to one previous file. Logs are best-effort, editable by the host, not durable or tamper-evident, and not reloaded into the view after restart. They contain allowlisted metadata only; no request bodies, authorization headers, passwords or raw tokens. Log persistence failure emits a generic operator warning, without secrets.

The HTTP loopback TideCloak container, H2 development storage, permissive ORK frame policy, and master-password bootstrap are development facilities. A production rollout needs TLS, hardened deployment, protected configuration, restricted operator access, shared replay protection, rate limiting, durable audit storage, and an independently reviewed threat model.

## Verification status

Automated tests use ephemeral locally generated keys, the real official verifier, signed DPoP proofs, and actual route handlers. They demonstrate rejection/authorization logic, **not** genuine Tide token issuance or quorum signatures. Browser tests exercise navigation, responsive layout, relay headers, and unauthenticated HTTP rejection.

A genuine local TideCloak instance and licensed QEA realm were provisioned. First-admin enrollment, fresh user tokens, and the live 2-of-3 acceptance sequence require human interaction and remain unverified until recorded. No MP4 or complete live-QEA demonstration is included yet.

## Dependency audit

At implementation validation, `npm audit --omit=dev` reported zero runtime vulnerabilities. The full audit reports five high-severity development dependency findings through Next's ESLint plugin → fast-glob → micromatch → braces (GHSA-vfj7-8cjw-p6xm). The registry's current braces release is still affected. No force downgrade or suppression was applied. Lint only trusted source trees; recheck the advisory and upgrade when a fixed compatible release exists.

## Sources

- https://docs.tide.org/Core-Concepts/iga-workflow
- https://docs.tide.org/Admin/SetupIGA
- https://docs.tide.org/ai-agent-pack
- Official Tide MCP pack v1.9.33, scaffold and JWT/DPoP playbooks, consulted 2026-10-22.
