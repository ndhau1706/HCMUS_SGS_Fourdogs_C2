# Two-minute demonstration

**Status:** storyboard prepared; a genuine QEA recording has not yet been produced. Do not substitute an animation, mocked approval screen, or test JWT for this recording.

## Prerequisites

- Three different enrolled Tide realm administrators (A, B, C), each controlled independently; separate browser profiles/windows.
- A separate enrolled Employee with viewer access and initially no `infra-operator`.
- Licensed Tide realm, QEA enabled, `iga.attestor=tide`, effective threshold visibly confirmed as **2 with 3 enrolled admin-role holders**.
- CloudGuard at http://localhost:3000 and the genuine Tide Console for the realm selected by the app adapter. The original local service uses port 8080; the isolated candidate uses 8081. Confirm both target the same realm before filming.
- Employee DevTools Network tab filtered to `restart`; keep Authorization/DPoP headers closed. Capture status and sanitized response only. Disable notifications and avoid recording one-time links, personal credentials or raw tokens.

Pre-enroll and rehearse first. Recording is not the time to create accounts or activate the licence. Check that the employee is a non-admin and that no unrelated request is already approved. Keep each independent person's session ready, without sharing their credentials.

Run `npm run check:realm` and `npm run check:license` during preparation. A full remote allocation reading requires supported capacity recovery before further enrollment; local user deletion or realm reset is not a demonstrated remedy. Follow [RECOVERY.md](RECOVERY.md). The original deployment has one enrolled administrator; a separately licensed candidate has four local records awaiting human enrollment. The app still uses the original adapter, and neither environment has passed the live acceptance table below. Keep the initial Employee viewer-only until filming the genuine governed grant. Browser-profile directories are session storage and must stay private and Git-ignored.

## Storyboard

| Time | Screen actions and required evidence | Spoken narration |
|---|---|---|
| 00:00–00:15 | Landing → Infrastructure. Show three synthetic resource cards as Employee. | “CloudGuard lets teams share infrastructure operations without trusting one realm administrator to decide who gets elevated access. These three servers are fictional.” |
| 00:15–00:35 | Employee clicks Restart on web-prod-01. Show **HTTP 403** and infra-operator explanation. Governance shows verified viewer roles, no operator. | “The employee can inspect the fleet, but this restart reaches the backend and is denied. A role label edited in the browser cannot change that result.” |
| 00:35–01:00 | Admin A in the real console: People → Employee → role mappings → propose the **realm** role infra-operator. Open the actual pending request in QEA Approvals. Show actual policy threshold/holder evidence. | “Granting operating privileges is itself a governed change. TideCloak captures this request; our application has no role-grant or approval API.” |
| 01:00–01:20 | Admin A reviews the request in the genuine enclave and authorizes once. Show the service's actual authorization state below threshold and the pending role grant. Employee re-login/retry should still yield **403**. | “One administrator authorizes. With this realm's verified quorum of two, that is insufficient. The employee still cannot operate the resource.” |
| 01:20–01:40 | Admin B independently opens the same request and authorizes through their own enclave session. Show the real request applied/approved and actual role mapping. | “An independent second administrator reviews and authorizes. Tide's genuine quorum now applies the privilege change.” |
| 01:40–02:00 | Employee signs out/signs in; Governance shows server-verified infra-operator. Restart web-prod-01 → **HTTP 200**, synthetic uptime/reset and Activity allowed entry. | “A fresh Tide-issued token carries the governed role. Our API verifies its signature, audience and DPoP proof before the simulated restart. Tide protects the privilege assignment, not each fictional server restart.” |

Never claim one approval is insufficient unless you observed it against the actual running policy. If an approval auto-commits unexpectedly, stop recording, investigate the real configuration, and fix it through the genuine governance workflow. Do not hide that failure with editing.

## Manual acceptance record

Complete this table with actual observations before filming. No row below is pre-certified by automated tests.

| Check | Expected evidence | Current evidence |
|---|---|---|
| Genuine Employee login | Tide-issued token accepted with fresh DPoP proof; session API 200 | Not yet verified |
| Viewer denied | Restart 403 | Automated test keys only; live test pending |
| Real governed grant | Request pending in Tide Console | Pending human setup |
| Three enrolled admin-role holders | Actual console holders and effective threshold 2 | Not yet verified |
| Single approval insufficient | Pending grant, employee still lacks operator, restart 403 | Not yet verified |
| Independent second approval | Genuine enclave authorization, change applied | Not yet verified |
| Fresh Employee role | `/api/session` reports infra-operator from verified claims | Not yet verified |
| Protected synthetic restart | API 200, uptime reset, allowed application log | Automated test keys only; live test pending |

Also check missing token 401, missing proof 401, wrong audience/issuer/signature rejection, and refresh/re-login after governance. Automated checks cover these mechanics with ephemeral keys; they do not prove live Tide issuance.

## Recording and export

Use OBS Studio or your desktop recorder with a 1280×720 or 1920×1080 window capture, 24–30 fps, microphone narration and readable text. Use real browser interaction; rehearse so enclave latency fits. Faithful cuts may compress waiting, but preserve the fact that A and B acted independently. Target 1:55 for margin, maximum **2:00**.

Save the finished file as `docs/CloudGuard-demo.mp4`. H.264/AAC is broadly compatible; 2.5–4 Mbps video typically stays below 100 MB for two minutes. If ffmpeg is available:

```bash
ffmpeg -i recording.mkv -c:v libx264 -preset medium -crf 25 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart docs/CloudGuard-demo.mp4
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 docs/CloudGuard-demo.mp4
```

Inspect the whole output. Duration must be ≤120 seconds; file size must be **under 100,000,000 bytes**. Avoid trimming off needed security evidence. Check no enrollment links, headers with raw JWT/DPoP values, passwords, admin tokens, or personal recovery information are visible.

Commit the genuine MP4 only after review:

```bash
git check-ignore redo.md mota.md
git add docs/CloudGuard-demo.mp4
git diff --cached --name-only
# Confirm private docs, .env, databases, and enrollment links are absent.
git commit -m "docs: add genuine CloudGuard governance demo"
git push origin main
```

## Official submission

- Challenge and exact overview prompts: https://tide.org/unlocked/ (including its public `/unlocked/config.js`).
- Submission form: https://forms.gle/HRHYjnqB86j1LFS97
- Submit the public repository URL, team name and the team's own contact emails. Publication is not form submission.
- On 2026-10-22, the page's static HTML said “Submissions have closed” while its configuration listed Vietnam 22 October 18:00 +07:00, Malaysia 22 October 18:00 +08:00 and Melbourne 23 October 10:00 +11:00. Those deadlines are not the same instant. The form rendered its required fields at inspection; no form was submitted. Verify the applicable cutoff with organizers if needed: https://discord.gg/XBMd9ny2q5 (`#support`).
