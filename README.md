# The Whiteblock Visualizer & Tuning Configurator

Interactive 3D Volvo Whiteblock tuning simulator: configure block, internals, head,
turbo, transmission and ECU — watch the live dyno, telemetry and failure physics.

## Setup

```bash
npm install
npm run dev      # http://localhost:8099
npm run build
npm run start    # http://localhost:8099 (production preview)
npm run build:package  # build + timestamped tarball in builds/
```

## Architecture

- `src/types/engine.ts` — strict TS interfaces for engines, components, metrics
- `src/lib/physics.ts` — hardcoded Whiteblock lore DB, torque-first dyno model
  (`TQ = k·disp·VE·PR·timing`, `HP = T·rpm/5252`, dual-anchor factory calibration),
  per-turbo boost curves with spool, choke and top-end decay
- `src/lib/animClock.ts` — mutable animation clock (no render storm) for crank/cursor sync
- `src/store/useEngineStore.ts` — Zustand state + Volvospeed failure evaluator
- `src/components/ui/` — Sidebar configurator, cutaway toggle + axis/offset/flip panel,
  playback/sweep controls, status banner
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
- **Cutaway:** master toggle + axis (X along crank / Y deck height / Z bank side),
  plane position slider, flip toggle, and an amber gizmo plane marking the cut.
- **Animation:** play/pause + slow-motion crank speed; Sweep mode drives the
  crank and the chart cursor through 800 rpm → redline together. Failed
  engines seize (motion freezes).

- **Rule A (torque spike):** 19T + boost >18psi + stock rods → `FAILED_BENT_RODS`
- **Rule B (cracked sleeve):** 83mm bore + >350 WHP + stock sleeves → `FAILED_CRACKED_BLOCK`
- **Rule C (T6 glass cannon):** T6 + stock 4T65-E + Stage 2 → `FAILED_EXPLODED_GEARBOX`
- AW55 >320 WHP without cooler, M56 >400 WHP on stock clutch also fail.
- Failures zero the dyno, flash the banner, highlight rods red + shake the camera.
- Manifold glows (`emissiveIntensity 2`) above 400 WHP.

## Sharing builds (no accounts, no server state)

Setups stay 100% client-side. To send someone an exact build:

- **Share link** — "Share link" copies a URL with the validated 21-field build
  embedded in the location hash (`#b=…`, ~1 KB). Opening it loads the build
  after strict validation; corrupt links are ignored with a console warning.
- **Files** — download any saved build or the current setup as
  `.whiteblock.json`; upload reuses the same strict import validator.
- **Saved builds** — named slots in `localStorage` (`whiteblock-configs-v1`,
  max 20), validated again on load so old saves migrate instead of breaking.

Deliberately no cookies/sessions: cookies are per-browser like `localStorage`
but capped at ~4 KB and sent on every request — they cannot share anything
between people or devices, so they add nothing here.

## Self-hosting on a VPS (Docker)

```bash
docker build -t whiteblock .
docker run -d --name whiteblock --restart unless-stopped -p 8099:8099 whiteblock
# → http://YOUR-SERVER:8099
```

Put Caddy/Nginx in front for HTTPS (example Caddyfile):

```caddy
visualizer.example.com {
  reverse_proxy localhost:8099
}
```

Security notes for public exposure: the image contains no secrets (there are
none in the repo — enforced by `.gitignore` + the no-hardcoded-secrets rule);
all user content (saved builds, imports, share links, uploads) runs through
the strict `parseBuildJson` validator, and imported strings render via React
escaping, so there is no injection sink. There are no API routes to rate-limit —
the server only serves the app.
