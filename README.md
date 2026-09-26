# The Whiteblock Visualizer & Tuning Configurator

Interactive 3D Volvo Whiteblock tuning simulator: configure block, internals, head,
turbo, transmission and ECU — watch the live dyno, telemetry and failure physics
in your browser at `http://localhost:8099`.

## 30-second start (Docker, recommended)

Requires Docker. Pulls the latest release container and runs it on port 8099:

```bash
curl -sL https://github.com/NemesTom/whiteblock/releases/latest/download/whiteblock-docker.tar.gz \
  | docker load && docker run -d --name whiteblock --restart unless-stopped -p 8099:8099 whiteblock
```

Then open http://localhost:8099. Update later with `docker stop whiteblock && docker rm whiteblock`
and the same line again.

> While this repo is **private**, GitHub requires a token for release downloads.
> Create a classic personal access token with **read** access and use it once:
>
> ```bash
> curl -sL -H "Authorization: Bearer YOUR_TOKEN" \
>   https://github.com/NemesTom/whiteblock/releases/latest/download/whiteblock-docker.tar.gz \
>   | docker load && docker run -d --name whiteblock --restart unless-stopped -p 8099:8099 whiteblock
> ```
>
> Once the repo is public, the plain one-liner above works with no token.

## Install options

| Method | Steps |
|---|---|
| Docker one-liner | Command above. Zero Node tooling needed. |
| Release zip (no Docker) | Download `whiteblock-app-vX.Y.Z.zip` from [Releases](../../releases), unzip, then `PORT=8099 node server.js` (needs Node 22+, no `npm install`). |
| From source | `git clone` → `npm install` → `npm run dev` (port 8099). Production: `npm run build && npm run start`. |

## Run from source (developers)

```bash
npm install
npm run dev      # http://localhost:8099 with hot reload
npm run build
npm run start    # production preview on http://localhost:8099
npm run lint     # eslint (rules-of-hooks enforced — it catches real crashes)
npm run build:package  # local timestamped tarball in builds/ (dev artifact, not a release)
```

Requirements: Node 22+, npm. No environment files, secrets, or external services.

## Self-hosting on a VPS

```bash
docker build -t whiteblock .
docker run -d --name whiteblock --restart unless-stopped -p 8099:8099 whiteblock
```

Put Caddy/Nginx in front for HTTPS (example Caddyfile):

```caddy
visualizer.example.com {
  reverse_proxy localhost:8099
}
```

Security notes for public exposure: the image contains no secrets (there are none
in the repo — enforced by `.gitignore` + the no-hardcoded-secrets rule); all user
content (saved builds, imports, share links, uploads) runs through the strict
`parseBuildJson` validator, and imported strings render via React escaping. There
are no API routes to rate-limit — the server only serves the app.

## Configuration

- **Port:** dev and prod both default to `8099` (`next dev -p 8099` /
  `next start -p 8099`). Change the `-p` flag or set `PORT=xxxx node server.js`
  for the standalone zip.
- **No auth, no sessions by design:** all setups live client-side
  (`localStorage`), so there is nothing to configure server-side.

## Sharing builds (no accounts, no server state)

- **Share link** — "Share link" copies a URL with the validated 21-field build
  embedded in the location hash (`#b=…`, ~1 KB). Opening it loads the exact
  build; corrupt links are ignored with a console warning.
- **Files** — download any saved build or the current setup as
  `.whiteblock.json`; upload reuses the same strict import validator.
- **Saved builds** — named slots in `localStorage` (`whiteblock-configs-v1`,
  max 20), validated again on load so old saves migrate instead of breaking.

Deliberately no cookies/sessions: cookies are per-browser like `localStorage`
but capped at ~4 KB and sent on every request — they cannot share anything
between people or devices.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Port busy (`EADDRINUSE`) | Another instance is running: `kill $(lsof -ti:8099)` or pick another `-p` port. |
| Blank/frozen 3D view | Hard-refresh (`Ctrl+Shift+R`) to drop a cached bundle; check the browser console; the canvas error boundary shows a Reset button instead of killing the page. |
| Cutaway looks stuck | The cut applies only while Cutaway is ON; the amber gizmo marks the plane. Toggle OFF for the whole engine. |
| Dyno reads 0 | Read the status banner — it names the exact failed rule. Lower the rpm or fit the missing mod; use "Copy build JSON" to report it. |
| WebGL unavailable | Needs a GPU-capable browser; headless/old drivers fall back to the error panel. |

## Architecture

- `src/types/engine.ts` — strict TS interfaces for engines, components, metrics
- `src/lib/physics.ts` — hardcoded Whiteblock lore DB, torque-first dyno model
  (`TQ = k·disp·VE·PR·timing`, `HP = T·rpm/5252`, dual-anchor factory calibration),
  per-turbo boost curves with spool, choke and top-end decay
- `src/lib/animClock.ts` — mutable animation clock (no render storm) for crank/cursor sync
- `src/lib/configIO.ts` — build validation, share-link codec, saved-build storage
- `src/store/useEngineStore.ts` — Zustand state + Volvospeed failure evaluator
- `src/components/ui/` — Sidebar configurator, cutaway panel, playback/sweep
  controls, lineart overlays, status banner
- `src/components/canvas/` — R3F scene split into `parts/`: Block, Head (cams/valves/
  intake), RotatingAssembly (slider-crank kinematics), Turbo (spinning wheel),
  Transmission, CutGizmo; shared cut plane in `parts/materials.ts`
- `src/components/charts/DynoChart.tsx` — dual-axis WHP/Nm graph with stock
  baseline ghost, peak markers and a clickable RPM sweep cursor

## Asset pipeline

Drop user scans/CAD (converted to `.glb`) into `public/models/`:

| Part | Path |
|---|---|
| B5234T3 block (MakerWorld ZECIORTECH) | `public/models/b5234t3_block.glb` |
| Intake/exhaust flanges (GrabCAD) | `public/models/b523_flanges.glb` |
| TD04 turbo (GrabCAD T3 flange) | `public/models/td04_19t.glb` |
| S60R/Japanifold manifold (Cults3D/Yeggi) | `public/models/t5_exhaust_manifold.glb` |

`OptionalModel` HEAD-checks each path: placeholders render until the file lands,
then the real model loads with zero code changes. Raw CAD (`.step/.stp/.stl.raw`)
is git-ignored; commit only optimized `.glb`.

## Simulation rules

- **Torque-first dyno:** stock tune + factory turbo reproduces the lore ratings
  within ±3% (torque from cylinder pressure, power derived — no fudge factors).
  The boost slider locks to factory boost on the stock tune and takes effect
  on Stage 1/2. Small turbos spool early and die up top; the K24 holds.
- **Failures** (banner names the rule; dyno zeroes; motion freezes; camera shakes;
  controls stay live so you can fix the build in place):
  - **Rule A (torque spike):** 18T/19T/21H + effective boost >18psi + stock rods → `FAILED_BENT_RODS`
  - **Rule B (cracked sleeve):** tiered WHP ceiling per block prep on 83mm+ bores — stock 350 / shims 450 / billet guard 600 / Darton unlimited → `FAILED_CRACKED_BLOCK`
  - **Rule C (T6 glass cannon):** T6 + stock 4T65-E + Stage 2 → `FAILED_EXPLODED_GEARBOX`
  - Overrev past the weakest link (rods/head/oil pump), turbo overspeed past 100% shaft, lean fuel, lifted head past 24 psi on stock bolts, AW55 heat ladder, clutch slip — all with dedicated statuses.
- **Cutaway:** master toggle + axis (X along crank / Y deck height / Z bank side),
  plane position slider, flip toggle, and an amber gizmo plane marking the cut.
- **Animation:** play/pause + true-rev RPM slider (100 rpm steps, tune limiter),
  slow-mo inspect toggle, sweep mode, 4-stroke cycle highlight.
