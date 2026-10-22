# Reproducible two-minute demonstration

The submitted video uses the officially permitted **TideCloak Protection Simulation**. It records a running Next.js application with real backend authorization decisions. It does not establish live Tide enrollment, signatures or cryptographic quorum.

## Record automatically

Requires Node.js ≥20.19, npm, Chrome/Chromium, FFmpeg and ffprobe. Install dependencies and build:

```bash
npm ci
npm run build
npm run demo -- --production
```

In a second terminal:

```bash
npm run test:demo
npm run record:demo
```

The server runs at http://localhost:3001/demo. `CHROME_PATH` can select a Chrome executable. The recorder uses three isolated Playwright browser contexts for Employee, Admin A and Admin B. It resets only synthetic demo state; it never alters a Tide realm, licence or Docker data. Do not interact with this demo instance while recording.

## Actual workflow

| Time | Running application evidence |
|---|---|
| 00:00–00:15 | CloudGuard introduction, trust constraint and visible simulation disclosure |
| 00:15–00:35 | Employee selects viewer identity; restart reaches the backend and returns 403 |
| 00:35–00:55 | Employee requests infra-operator; pending grant requires two distinct approvals |
| 00:55–01:10 | Admin A approves from a separate browser session; request stays pending at 1/2 |
| 01:10–01:16 | Employee retries; backend still returns 403 |
| 01:16–01:20 | Duplicate Admin A approval returns 409 without changing the count |
| 01:20–01:40 | Admin B approves from another session; 2/2 authorizes the role grant |
| 01:40–01:56 | Employee reads granted role, restarts with 200 and displays actual audit events |

English captions describe the observed workflow. Edits switch between real recorded sessions; they do not fabricate responses or approval state. The script asserts the actual HTTP sequence before export.

## Export and verification

The script writes root `demo.mp4`: H.264, yuv420p, 1280×720, 30 fps, approximately 116 seconds, no audio, fast-start metadata. It checks duration, codec, dimensions and the strict 100 MB maximum. Raw recordings are deleted after successful export. Private logs and evidence stay under ignored `.data/`.

```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,pix_fmt,r_frame_rate -of json demo.mp4
ffmpeg -v error -i demo.mp4 -f null -
```

Inspect representative frames and the full playback before publication. Public export metadata is in [demo-metadata.json](demo-metadata.json). The public [demo.mp4](../demo.mp4) contains synthetic identities and no real credentials.

Live Tide setup remains separately documented in [SETUP.md](SETUP.md). The simulation trusts its host; selecting separate identities does not prove separate human owners.
