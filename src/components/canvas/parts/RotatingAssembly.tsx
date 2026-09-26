'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BASE_ENGINES } from '@/lib/physics';
import { useEngineStore } from '@/store/useEngineStore';
import { animClock } from '@/lib/animClock';
import {
  boreR,
  crankThrow,
  cylX,
  engineLength,
  firingPhase,
  pinTopY,
  rodUnits,
  strokeOf,
  CYL_SPACING,
  SLOWMO,
  STROKE_COLORS,
  Y_CRANK,
} from './engineGeometry';
import { maxRpm } from '@/lib/physics';

/**
 * The moving heart of the whiteblock: a real crankshaft (main journals,
 * webs, offset crank pins, counterweights, pulley, flywheel) driving
 * pistons through true slider-crank kinematics, with I-beam rods re-aimed
 * between crank pin and wrist pin every frame.
 *
 * Animation state lives in the mutable animClock (no React re-renders);
 * the store is mirrored at ~4 Hz for the chart cursor + telemetry.
 * A failed engine seizes: motion freezes and bent rods cant sideways.
 */
export function RotatingAssembly() {
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const rodsFailed = useEngineStore((s) => s.status === 'FAILED_BENT_RODS' || s.status === 'FAILED_THROWN_ROD');

  const engine = BASE_ENGINES[engineId];
  const n = engine.cylinders;
  const len = engineLength(n);
  const r = crankThrow(engineId);
  const rodL = rodUnits(rodsId);
  const br = boreR(engineId);
  const forged = rodsId === 'forged-h';

  const crankRef = useRef<THREE.Group>(null);
  const pistonRefs = useRef<Array<THREE.Group | null>>([]);
  const rodRefs = useRef<Array<THREE.Group | null>>([]);
  const crownRefs = useRef<Array<THREE.Mesh | null>>([]);
  const angleRef = useRef(0);
  const lastMirror = useRef(0);

  const mats = useMemo(
    () => ({
      crank: new THREE.MeshStandardMaterial({ color: '#5b6067', metalness: 0.9, roughness: 0.3 }),
      rod: new THREE.MeshStandardMaterial({ color: '#d7dce1', metalness: 0.95, roughness: 0.25 }),
      rodFail: new THREE.MeshStandardMaterial({ color: '#ff2222', emissive: '#ff0000', emissiveIntensity: 1.4, metalness: 0.7, roughness: 0.35 }),
      piston: new THREE.MeshStandardMaterial({ color: '#e8e4de', metalness: 0.85, roughness: 0.28 }),
      ring: new THREE.MeshStandardMaterial({ color: '#2a2d31', metalness: 0.8, roughness: 0.4 }),
      dark: new THREE.MeshStandardMaterial({ color: '#26282c', metalness: 0.7, roughness: 0.45 }),
      // Shared 4-stroke highlight materials (swapped onto crowns, never rebuilt)
      stroke: ([0, 1, 2, 3] as const).map(
        (s) =>
          new THREE.MeshStandardMaterial({
            color: '#e8e4de',
            emissive: STROKE_COLORS[s],
            emissiveIntensity: 1.1,
            metalness: 0.6,
            roughness: 0.3,
          }),
      ),
    }),
    [],
  );

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => {
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      });
    },
    [mats],
  );

  // Bent-rod cant: applied once per failure change, preserved by useFrame
  // (which only touches rotation.x on rods).
  useEffect(() => {
    rodRefs.current.forEach((g, i) => {
      if (g) g.rotation.z = rodsFailed ? (i % 2 === 0 ? 0.35 : -0.3) : 0;
    });
  }, [rodsFailed, engineId, rodsId]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useEngineStore.getState();
    const eng = BASE_ENGINES[st.engineId];
    const failedNow = st.status !== 'OK';
    const cap = maxRpm(st);
    let angle = angleRef.current;
    let rpm = animClock.rpm;

    if (st.animPlaying && !failedNow) {
      if (st.sweepEnabled) {
        rpm += (dt * (cap - 800)) / 22; // full sweep ≈ 22 s, to the limiter
        if (rpm > cap) rpm = 800;
      }
      // True crank revs by default (slider 6000 = 100 rev/s); the inspect
      // toggle renders an honest visible fraction instead.
      const visualRev = (rpm / 60) * (st.slowMo ? SLOWMO : 1);
      angle += dt * visualRev * Math.PI * 2;
      angleRef.current = angle;
      animClock.advance(angle, rpm);
      const now = performance.now();
      if (now - lastMirror.current > 250 && Math.abs(st.animRpm - rpm) > 1) {
        lastMirror.current = now;
        st.set({ animRpm: Math.round(rpm) });
      }
    }

    if (crankRef.current) crankRef.current.rotation.x = angle;

    const rr = crankThrow(st.engineId);
    const ll = rodUnits(st.rodsId);
    const highlight = st.cycleHighlight && !failedNow;
    for (let i = 0; i < eng.cylinders; i++) {
      const th = angle + firingPhase(i, eng.cylinders);
      const top = pinTopY(th, rr, ll);
      const py = Y_CRANK + rr * Math.cos(th);
      const pz = rr * Math.sin(th);
      const piston = pistonRefs.current[i];
      const rod = rodRefs.current[i];
      if (piston) piston.position.set(cylX(i, eng.cylinders), top, 0);
      if (rod) {
        rod.position.set(cylX(i, eng.cylinders), (top + py) / 2, pz / 2);
        rod.rotation.x = -Math.asin(Math.max(-1, Math.min(1, pz / ll)));
      }
      const crown = crownRefs.current[i];
      if (crown) crown.material = highlight ? mats.stroke[strokeOf(th, firingPhase(i, eng.cylinders))] : mats.piston;
    }
  });

  const phases = useMemo(() => Array.from({ length: n }).map((_, i) => firingPhase(i, n)), [n]);
  const rodMat = rodsFailed ? mats.rodFail : mats.rod;

  return (
    <group key={`${engineId}-${rodsId}`}>
      {/* ===== Crankshaft (rigid group, rotates about X) ===== */}
      <group ref={crankRef} position={[0, Y_CRANK, 0]}>
        {/* Main journals */}
        {Array.from({ length: n + 1 }).map((_, k) => (
          <mesh key={k} position={[cylX(0, n) - CYL_SPACING / 2 + k * CYL_SPACING, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.crank}>
            <cylinderGeometry args={[0.07, 0.07, 0.14, 14]} />
          </mesh>
        ))}
        {/* Per-cylinder throws: webs + pin + counterweight */}
        {Array.from({ length: n }).map((_, i) => {
          const x = cylX(i, n);
          const ph = phases[i];
          const cy = Math.cos(ph);
          const sz = Math.sin(ph);
          return (
            <group key={i}>
              {[-0.095, 0.095].map((dx) => (
                <mesh key={dx} position={[x + dx, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.crank}>
                  <cylinderGeometry args={[0.15, 0.15, 0.05, 20]} />
                </mesh>
              ))}
              <mesh position={[x, r * cy, r * sz]} rotation={[0, 0, Math.PI / 2]} material={mats.crank}>
                <cylinderGeometry args={[0.058, 0.058, 0.2, 14]} />
              </mesh>
              <mesh position={[x, -0.15 * cy, -0.15 * sz]} rotation={[ph, 0, 0]} material={mats.dark}>
                <boxGeometry args={[0.15, 0.2, 0.1]} />
              </mesh>
            </group>
          );
        })}
        {/* Front snout + harmonic pulley */}
        <mesh position={[len / 2 + 0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.crank}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
        </mesh>
        <mesh position={[len / 2 + 0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
          <cylinderGeometry args={[0.2, 0.2, 0.09, 24]} />
        </mesh>
        {/* Rear flange + flywheel + ring gear */}
        <mesh position={[-len / 2 - 0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
          <cylinderGeometry args={[0.28, 0.28, 0.08, 28]} />
        </mesh>
        <mesh position={[-len / 2 - 0.14, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.ring}>
          <torusGeometry args={[0.28, 0.025, 10, 32]} />
        </mesh>
      </group>

      {/* ===== Pistons (positioned every frame) ===== */}
      {Array.from({ length: n }).map((_, i) => (
        <group
          key={`p${i}`}
          ref={(g) => {
            pistonRefs.current[i] = g;
          }}
        >
          {/* Crown */}
          <mesh
            position={[0, 0.145, 0]}
            material={mats.piston}
            ref={(g) => {
              crownRefs.current[i] = g;
            }}
          >
            <cylinderGeometry args={[br * 0.97, br * 0.97, 0.09, 24]} />
          </mesh>
          {/* Ring lands */}
          {[0.115, 0.09].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={mats.ring}>
              <cylinderGeometry args={[br * 0.975, br * 0.975, 0.016, 24]} />
            </mesh>
          ))}
          {/* Skirt */}
          <mesh position={[0, -0.03, 0]} material={mats.piston}>
            <cylinderGeometry args={[br * 0.95, br * 0.93, 0.22, 24, 1, true]} />
          </mesh>
          {/* Wrist pin + bosses */}
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.crank}>
            <cylinderGeometry args={[0.034, 0.034, br * 1.3, 12]} />
          </mesh>
        </group>
      ))}

      {/* ===== Rods (positioned + aimed every frame) ===== */}
      {Array.from({ length: n }).map((_, i) => (
        <group
          key={`r${i}`}
          ref={(g) => {
            rodRefs.current[i] = g;
          }}
        >
          {/* Big-end ring around the crank pin */}
          <mesh position={[0, -rodL / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={rodMat}>
            <torusGeometry args={[0.085, forged ? 0.04 : 0.032, 10, 20]} />
          </mesh>
          {/* I-beam */}
          <mesh position={[0, 0, 0]} material={rodMat}>
            <boxGeometry args={[forged ? 0.095 : 0.07, rodL - 0.12, forged ? 0.06 : 0.05]} />
          </mesh>
          {/* Small end around the wrist pin */}
          <mesh position={[0, rodL / 2, 0]} rotation={[0, 0, Math.PI / 2]} material={rodMat}>
            <cylinderGeometry args={[0.05, 0.05, 0.1, 14]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
