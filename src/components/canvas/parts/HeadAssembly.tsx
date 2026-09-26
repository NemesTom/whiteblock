'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BASE_ENGINES } from '@/lib/physics';
import { useEngineStore } from '@/store/useEngineStore';
import { animClock } from '@/lib/animClock';
import { clip } from './materials';
import { OptionalModel, MODEL_PATHS } from './OptionalModel';
import { cylX, deckY, engineLength, firingPhase } from './engineGeometry';

/**
 * Procedural whiteblock top end: head casting, signature wide alloy cam
 * cover with plug wells + coils, twin camshafts with per-cylinder lobes
 * rotating at half crank speed, valves + springs, and the curved intake
 * plenum with individual runners. The exhaust runners live in
 * TurboAssembly (heat-mapped) — the flange slot stays here.
 */
export function HeadAssembly({ plane }: { plane: THREE.Plane }) {
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const cutaway = useEngineStore((s) => s.cutaway);
  const isRN = useEngineStore((s) => s.headId) === 'rn-swap';

  const engine = BASE_ENGINES[engineId];
  const n = engine.cylinders;
  const len = engineLength(n);
  const deck = deckY(engineId, rodsId);
  const headBase = deck + 0.05;

  const lobeRefs = useRef<Array<THREE.Group | null>>([]);
  const cut = cutaway ? plane : null;

  const mats = useMemo(
    () => ({
      head: clip(new THREE.MeshStandardMaterial({ color: '#a7aeb6', metalness: 0.7, roughness: 0.42 }), cut),
      cover: clip(
        new THREE.MeshStandardMaterial({ color: isRN ? '#b9bec5' : '#c8ccd2', metalness: 0.8, roughness: 0.32 }),
        cut,
      ),
      cam: new THREE.MeshStandardMaterial({ color: '#7d838b', metalness: 0.95, roughness: 0.22 }),
      valve: new THREE.MeshStandardMaterial({ color: '#d9dee3', metalness: 0.95, roughness: 0.2 }),
      spring: new THREE.MeshStandardMaterial({ color: '#3a3d42', metalness: 0.85, roughness: 0.35 }),
      plastic: new THREE.MeshStandardMaterial({ color: '#1d1f22', metalness: 0.2, roughness: 0.6 }),
      plenum: clip(new THREE.MeshStandardMaterial({ color: '#8f979f', metalness: 0.75, roughness: 0.4 }), cut),
      brass: new THREE.MeshStandardMaterial({ color: '#b08d3f', metalness: 0.9, roughness: 0.3 }),
    }),
    [cut, isRN],
  );

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  // Camshafts turn at half crank speed; lobes keep valve-timing phasing.
  useFrame(() => {
    const a = animClock.angle / 2;
    for (let i = 0; i < engine.cylinders; i++) {
      const g = lobeRefs.current[i];
      if (g) g.rotation.x = a + firingPhase(i, engine.cylinders) / 2;
    }
  });

  // Intake runner tubes: plenum → head flange S-curves.
  const plenumY = headBase + 0.52;
  const plenumZ = 0.66;
  const runners = useMemo(() => {
    const geos: THREE.TubeGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const x = cylX(i, n);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, plenumY - 0.08, plenumZ - 0.05),
        new THREE.Vector3(x, plenumY - 0.3, plenumZ - 0.12),
        new THREE.Vector3(x, headBase + 0.18, 0.55),
        new THREE.Vector3(x, headBase + 0.12, 0.5),
      ]);
      geos.push(new THREE.TubeGeometry(curve, 20, 0.075, 10, false));
    }
    return geos;
  }, [n, plenumY, plenumZ, headBase]);

  useEffect(
    () => () => {
      runners.forEach((g) => g.dispose());
    },
    [runners],
  );

  return (
    <group>
      {/* Head casting */}
      <RoundedBox args={[len, 0.5, 1.1]} radius={0.04} smoothness={2} position={[0, headBase + 0.25, 0]} material={mats.head} />
      {/* Cam cover — the wide silver whiteblock signature */}
      <RoundedBox args={[len * 0.94, 0.26, 0.95]} radius={0.06} smoothness={2} position={[0, headBase + 0.5 + 0.13, 0]} material={mats.cover} />
      {/* Cover bolts */}
      {[-len * 0.42, -len * 0.14, len * 0.14, len * 0.42].map((x) => (
        <mesh key={x} position={[x, headBase + 0.78, 0.32]} material={mats.spring}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 10]} />
        </mesh>
      ))}
      {/* Plug wells + coil packs */}
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[cylX(i, n), headBase + 0.76, 0]}>
          <mesh material={mats.spring}>
            <cylinderGeometry args={[0.058, 0.058, 0.1, 14]} />
          </mesh>
          <mesh position={[0, 0.09, 0]} material={mats.plastic}>
            <boxGeometry args={[0.13, 0.1, 0.13]} />
          </mesh>
        </group>
      ))}
      {/* Oil filler */}
      <group position={[len / 2 - 0.25, headBase + 0.78, -0.25]}>
        <mesh material={mats.head}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 14]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={mats.plastic}>
          <cylinderGeometry args={[0.075, 0.075, 0.04, 14]} />
        </mesh>
      </group>

      {/* Twin camshafts + lobes */}
      {[-0.22, 0.22].map((z, cam) => (
        <group key={cam} position={[0, headBase + 0.34, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mats.cam}>
            <cylinderGeometry args={[0.045, 0.045, len * 0.92, 12]} />
          </mesh>
          {Array.from({ length: n }).map((_, i) => (
            <group
              key={i}
              position={[cylX(i, n), 0, 0]}
              ref={(g) => {
                lobeRefs.current[cam * n + i] = g;
              }}
            >
              <mesh position={[0, 0.055, 0]} material={mats.cam}>
                <boxGeometry args={[0.06, 0.075, 0.05]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Valves + springs (static; lift animation is out of scope) */}
      {Array.from({ length: n }).map((_, i) =>
        [-0.13, 0.13].map((z) => (
          <group key={`${i}-${z}`} position={[cylX(i, n), headBase + 0.02, z]}>
            <mesh position={[0, 0.12, 0]} material={mats.valve}>
              <cylinderGeometry args={[0.016, 0.016, 0.34, 8]} />
            </mesh>
            {[0.16, 0.21, 0.26].map((y) => (
              <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.spring}>
                <torusGeometry args={[0.045, 0.012, 8, 16]} />
              </mesh>
            ))}
            <mesh position={[0, -0.05, 0]} material={mats.valve}>
              <cylinderGeometry args={[0.05, 0.032, 0.04, 12]} />
            </mesh>
          </group>
        )),
      )}

      {/* Intake plenum + throttle body */}
      <mesh position={[0, plenumY, plenumZ]} rotation={[0, 0, Math.PI / 2]} material={mats.plenum}>
        <cylinderGeometry args={[0.16, 0.16, len * 0.88, 20]} />
      </mesh>
      {[len * 0.44, -len * 0.44].map((x) => (
        <mesh key={x} position={[x, plenumY, plenumZ]} material={mats.plenum}>
          <sphereGeometry args={[0.16, 16, 12]} />
        </mesh>
      ))}
      <group position={[len * 0.44 + 0.28, plenumY, plenumZ]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={mats.plenum}>
          <cylinderGeometry args={[0.11, 0.13, 0.3, 16]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} material={mats.brass}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 16]} />
        </mesh>
      </group>
      {runners.map((geo, i) => (
        <mesh key={i} geometry={geo} material={mats.plenum} />
      ))}

      {/* Intake/exhaust flange slot (user GLB overrides the intake flange) */}
      <OptionalModel path={MODEL_PATHS.flanges}>
        <mesh position={[0, headBase + 0.1, 0.6]}>
          <boxGeometry args={[len * 0.92, 0.24, 0.07]} />
          <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.4} />
        </mesh>
      </OptionalModel>
    </group>
  );
}
