# CloudGuard

CloudGuard lets teams share infrastructure operations while requiring independent approval before anyone gains operating privileges.

[Watch the CloudGuard Demo](./demo.mp4) · [Run the prototype](#running-the-application)

## Project overview

### 1. Vision & originality

A shared infrastructure workspace where access to sensitive operations is a governed decision: two of three administrators must approve an employee’s privilege request.

### 2. Trust constraint insight

Ordinary IAM concentrates permission-changing power in an administrator. That account can become a shortcut around shared oversight. CloudGuard demonstrates how requiring independent authority can make joint operations credible.

### 3. Value & impact

Platform teams and partner organizations can delegate incident response with shared oversight. For example, an employee can restart a gateway only after two administrators approve operating access; one compromised approver remains insufficient under the modeled policy.

### 4. Why TideCloak matters

The live integration preserves TideCloak sign-in, server-verified JWTs and DPoP. Tide’s Emergent Authority would cryptographically govern the privilege grant through independent enclave approvals and ORK-backed proofs. The submitted demo uses a clearly labeled, server-enforced simulation under [Tide’s official network-load allowance](https://tide.org/unlocked/#plan-c). The simulator trusts its application host and does not implement Tide’s cryptographic guarantees.

### 5. Prototype & storytelling

Watch Employee receive HTTP 403, request infra-operator, and remain blocked after Admin A approves. A duplicate approval returns 409 without increasing the count. Admin B approves from a separate browser session, satisfying 2-of-3 governance. The backend grants the role, permits the synthetic restart and records the audit trail. No real infrastructure is operated.

## Architecture

Next.js 16, React, TypeScript, Tailwind CSS and Lucide. Server route handlers enforce permissions; the UI displays actual HTTP results.

- `/demo` → isolated `/api/demo/*` → synthetic session, quorum policy, resource and audit state.
- Live workspace → official Tide Next.js SDK → JWT, issuer, audience, expiry, DPoP and realm-role verification → synthetic resource store.

Demo state is bounded, in memory and shared by one application process. A restart resets it. The repository includes the complete application, dependency lockfile, focused authorization tests and reproducible recording script.

## Features

- Employee viewer baseline, explicit privilege requests and two distinct administrator approvals.
- Server rejection before quorum, duplicate-vote rejection and immediate role readback after authorization.
- Synthetic resource operations and an audit journal reflecting actual state transitions.
- Preserved live infrastructure, governance and activity pages, including strict JWT/DPoP enforcement.

## TideCloak Integration / Simulation

**Submission mode: TideCloak Protection Simulation.** Synthetic identities are selected without real credentials and receive separate HttpOnly browser sessions. They model identities, not proof of distinct humans. Roles and approvals are enforced by the demo backend. Direct client role assertions are ignored.

Demo endpoints are disabled unless the server explicitly sets `CLOUDGUARD_DEMO_MODE=true`. Demo sessions never authenticate live APIs. `npm run demo` enables only its own process. No Tide licence or Docker instance is required for the submission demo.

The real integration remains in `src/lib/auth`, `src/app/providers.tsx` and the live API routes. Live privilege grants belong in Tide Console, with approvals sent directly from each administrator’s enclave session. See [live setup](docs/SETUP.md) and [security boundaries](docs/SECURITY.md). Live 2-of-3 cryptographic QEA is not claimed as verified.

## Trust and Authorization Workflow

1. Employee signs in as a synthetic viewer; restart returns **403**.
2. Employee requests infra-operator. The server creates a pending grant.
3. Admin A approves. **1/2** remains pending; restart still returns **403**.
4. Admin A repeats approval. **409**; the count stays one.
5. Admin B approves in another session. **2/2**, from three eligible identities, authorizes the grant.
6. Employee refreshes role state and retries. **200**; the audit records the grant and restart.

The simulation protects this workflow through backend logic, not cryptographic separation from the application operator. The live Tide design adds that external trust boundary within its documented scope.

## Installation

Requires Node.js ≥20.19 and npm. From this repository:

```bash
npm ci
```

No credentials or environment file are needed for the simulation. For optional live mode, copy `.env.example` to private `.env`, configure your own deployment, and follow [setup](docs/SETUP.md). Never commit credentials or a local Tide adapter.

## Running the Application

```bash
npm run demo
```

Open **http://localhost:3001/demo**. Use separate browser profiles/private sessions for Employee, Admin A and Admin B. An administrator can select “Reset synthetic demo” to restore the viewer baseline. Stop the app with Ctrl+C.

For the production-built simulation:

```bash
npm run build
npm run demo -- --production
```

For the separately configured live workspace: `npm run dev`, or `npm run build` followed by `npm start`, at http://localhost:3000.

Validation:

```bash
npm run lint
npm test
npm run build
npm run typecheck
npm run test:integration
npm run test:browser
npm run test:demo
```

## Demo Video

[Watch the CloudGuard Demo](./demo.mp4)

The video records the running application and real backend workflow using isolated synthetic sessions. It visibly discloses simulation; no Tide signatures are fabricated. To reproduce, start the production-built simulation, then run:

```bash
npm run record:demo
```

The recording script requires local Chrome/Chromium and FFmpeg. See the [recording workflow](docs/DEMO_SCRIPT.md).

Submit the public repository through the [official Google Form](https://forms.gle/HRHYjnqB86j1LFS97). Publishing to GitHub does not submit the form.
