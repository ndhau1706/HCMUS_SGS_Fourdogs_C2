# Submission validation

Observed locally on 2026-10-22. Submission mode: **TideCloak Protection Simulation**, as explicitly permitted by the [official competition page](https://tide.org/unlocked/#plan-c).

| Check | Result | Scope |
|---|---|---|
| Lint | Pass | ESLint / Next.js |
| Strict type checking | Pass | TypeScript |
| Unit, security and diagnostic tests | 57 passed | Live token/DPoP checks plus isolated simulation policy and handlers |
| Production build | Pass | Next.js 16.4.2 / webpack |
| Built HTTP integration | 7 passed | Real production HTTP with ephemeral JWT/DPoP test keys |
| Existing browser suite | 5 passed | Desktop/mobile navigation, denied unauthenticated requests, public configuration and exact official DPoP relay |
| Simulation browser suite | 1 passed | Employee, Admin A and Admin B in isolated contexts; actual 403 → pending → 1/2 → duplicate409 → still403 → 2/2 → role grant → 200 and audit |
| Clean public-source checkout | Pass | Fresh `npm ci`, production build and `npm run demo` with no environment file; HTTP quorum workflow verified separately |
| Source/history secret scan | 0 findings | TruffleHog with credential verification disabled; additional private-key, token and owner-credential pattern review |
| MP4 export/playback | Pass | 114.43 s; 1.09 MB; H.264/yuv420p, 1280×720, 30 fps; complete decode and representative frames checked |
| README overview | 246 words | Includes title, description, navigation and five official headings; setup is separate |
| Runtime dependency audit | 0 vulnerabilities | `npm audit --omit=dev` |

The simulator rejects client-supplied roles and approval counts, ties votes to the session principal, rejects repeated votes even across multiple sessions for the same principal, and never grants demo access to live APIs. Demo routes return 404 by default and require server opt-in. Mutations require same-origin JSON; cookies are HttpOnly and SameSite=Strict.

The existing live integration tests use ephemeral signing keys. They verify enforcement, not Tide-issued production sessions. No successful live 2-of-3 cryptographic governance is claimed. Live infrastructure remains preserved and separate from the submitted demonstration.

The automated recorder operates the real demo backend and asserts restart statuses `[403, 403, 200]` and approval statuses `[200, 409, 200]`. The final H.264 MP4 has English captions and visible simulation labeling. Exact export properties are in [demo-metadata.json](demo-metadata.json). Reproduce using [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

Source and relevant Git history are scanned locally before publication. Real emails, passwords, licence data, adapters, enrollment links, browser profiles, databases and backups remain private and Git-ignored. Automated scanning supplements review; it is not a guarantee that every possible secret detector exists.

The public repository and downloadable video are verified after push. GitHub publication does not submit the official Google Form. The form's availability is checked separately; no form submission is claimed.
