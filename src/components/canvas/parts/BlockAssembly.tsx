'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { BASE_ENGINES } from '@/lib/physics';
import { useEngineStore } from '@/store/useEngineStore';
import { clip } from './materials';
import { OptionalModel, MODEL_PATHS } from './OptionalModel';
import { boreR, cylX, deckY, engineLength, CYL_SPACING } from './engineGeometry';

/**
 * Procedural whiteblock crankcase: bedplate, upper crankcase with open
 * cylinder liners, deck face, sump, timing cover, main caps + bolts.
 * All castings share the cut plane so the configurable cutaway reveals
 * the rotating assembly inside.
 */
export function BlockAssembly({ plane }: { plane: THREE.Plane }) {
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const cracked = useEngineStore((s) => s.status) === 'FAILED_CRACKED_BLOCK';

  const engine = BASE_ENGINES[engineId];
  const n = engine.cylinders;
  const len = engineLength(n);
  const deck = deckY(engineId, rodsId);
  const br = boreR(engineId);

  const mats = useMemo(() => {
    const m = {
      alu: clip(
        new THREE.MeshStandardMaterial({ color: cracked ? '#8a2a2a' : '#99a2ac', metalness: 0.7, roughness: 0.45 }),
        plane,
      ),
      deck: clip(new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 0.85, roughness: 0.3 }), plane),
      sump: clip(new THREE.MeshStandardMaterial({ color: '#2e3236', metalness: 0.6, roughness: 0.55 }), plane),
      liner: clip(
        new THREE.MeshStandardMaterial({ color: '#4b4f55', metalness: 0.9, roughness: 0.35 }),
        plane,
      ),
      hard: new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.9, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1f2124', metalness: 0.5, roughness: 0.6 }),
    };
    return m;
  }, [plane, cracked]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  const crankcaseH = deck - 0.12;
  const linerH = deck - 0.35;
  const frontX = len / 2;

  return (
    <OptionalModel path={MODEL_PATHS.block}>
      <group>
        {/* Upper crankcase */}
        <RoundedBox args={[len, crankcaseH, 1.15]} radius={0.04} smoothness={2} position={[0, 0.12 + crankcaseH / 2, 0]} material={mats.alu} />
        {/* Machined deck face */}
        <mesh position={[0, deck + 0.015, 0]} material={mats.deck}>
          <boxGeometry args={[len, 0.06, 1.18]} />
        </mesh>
        {/* Open cylinder liners */}
        {Array.from({ length: n }).map((_, i) => (
          <mesh key={i} position={[cylX(i, n), 0.35 + linerH / 2, 0]} material={mats.liner}>
            <cylinderGeometry args={[br + 0.018, br + 0.018, linerH, 24, 1, true]} />
          </mesh>
        ))}
        {/* Bedplate */}
        <mesh position={[0, 0.235, 0]} material={mats.alu}>
          <boxGeometry args={[len * 0.96, 0.23, 1.05]} />
        </mesh>
        {/* Sump: stepped oil pan + drain plug */}
        <RoundedBox args={[len * 0.9, 0.25, 0.95]} radius={0.05} smoothness={2} position={[0, -0.005, 0]} material={mats.sump} />
        <RoundedBox args={[len * 0.68, 0.25, 0.72]} radius={0.05} smoothness={2} position={[0, -0.25, 0]} material={mats.sump} />
        <mesh position={[0.3, -0.36, 0]} rotation={[0, 0, 0]} material={mats.hard}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
        </mesh>
        {/* Front timing cover */}
        <RoundedBox args={[0.18, deck - 0.15, 1.0]} radius={0.03} smoothness={2} position={[frontX + 0.09, (deck - 0.15) / 2 + 0.05, 0]} material={mats.alu} />
        {/* Rear plate (gearbox side) */}
        <mesh position={[-frontX - 0.05, deck / 2, 0]} material={mats.alu}>
          <boxGeometry args={[0.1, deck - 0.3, 1.0]} />
        </mesh>
        {/* Main bearing caps + bolts */}
        {Array.from({ length: n + 1 }).map((_, k) => {
          const x = cylX(0, n) - CYL_SPACING / 2 + k * CYL_SPACING;
          return (
            <group key={k} position={[x, 0, 0]}>
              <mesh position={[0, 0.2, 0]} material={mats.hard}>
                <boxGeometry args={[0.16, 0.18, 0.5]} />
              </mesh>
              {[-0.18, 0.18].map((z) => (
                <mesh key={z} position={[0, 0.2, z]} material={mats.dark}>
                  <cylinderGeometry args={[0.028, 0.028, 0.16, 10]} />
                </mesh>
              ))}
            </group>
          );
        })}
        {/* Freeze plugs on the exhaust face */}
        {[-0.7, 0, 0.7].map((x, k) => (
          <mesh key={k} position={[x, 0.8, -0.578]} rotation={[Math.PI / 2, 0, 0]} material={mats.dark}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
          </mesh>
        ))}
        {/* Crack scar on failure */}
        {cracked && (
          <mesh position={[-0.3, 0.9, 0.585]} rotation={[0, 0, 0.5]} material={mats.dark}>
            <boxGeometry args={[0.05, 0.9, 0.012]} />
          </mesh>
        )}
      </group>
    </OptionalModel>
  );
}
