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
- `src/lib/physics.ts` — hardcoded Whiteblock lore DB, VE/BSFC-style formulas,
  `Max_HP = Turbo_Flow_Limit · (VE/100) · Fuel_Mod`, bezier dyno curves
- `src/store/useEngineStore.ts` — Zustand state + Volvospeed failure evaluator
- `src/components/ui/` — Sidebar configurator, cutaway toggle, status banner
- `src/components/canvas/EngineScene.tsx` — R3F scene, clipping plane, placeholders
- `src/components/charts/DynoChart.tsx` — Chart.js WHP / torque graph + telemetry

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

- **Rule A (torque spike):** 19T + boost >18psi + stock rods → `FAILED_BENT_RODS`
- **Rule B (cracked sleeve):** 83mm bore + >350 WHP + stock sleeves → `FAILED_CRACKED_BLOCK`
- **Rule C (T6 glass cannon):** T6 + stock 4T65-E + Stage 2 → `FAILED_EXPLODED_GEARBOX`
- AW55 >320 WHP without cooler, M56 >400 WHP on stock clutch also fail.
- Failures zero the dyno, flash the banner, highlight rods red + shake the camera.
- Manifold glows (`emissiveIntensity 2`) above 400 WHP.
