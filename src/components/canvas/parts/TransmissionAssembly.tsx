'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { BASE_ENGINES } from '@/lib/physics';
import { useEngineStore } from '@/store/useEngineStore';
import { engineLength } from './engineGeometry';

/**
 * Gearbox: tapered bellhousing off the rear plate, ribbed case, end
 * cover and axle flanges. Exploded-gearbox failure blows the case red.
 */
export function TransmissionAssembly() {
  const engineId = useEngineStore((s) => s.engineId);
  const exploded = useEngineStore((s) => s.status) === 'FAILED_EXPLODED_GEARBOX';

  const len = engineLength(BASE_ENGINES[engineId].cylinders);
  const rearX = -len / 2;

  const mats = useMemo(
    () => ({
      bell: new THREE.MeshStandardMaterial({ color: exploded ? '#7f1d1d' : '#3b4250', metalness: 0.65, roughness: 0.45 }),
      case: new THREE.MeshStandardMaterial({
        color: exploded ? '#7f1d1d' : '#333a47',
        emissive: exploded ? '#ff0000' : '#000000',
        emissiveIntensity: exploded ? 1.2 : 0,
        metalness: 0.6,
        roughness: 0.5,
      }),
      hard: new THREE.MeshStandardMaterial({ color: '#565d68', metalness: 0.85, roughness: 0.35 }),
    }),
    [exploded],
  );

  return (
    <group position={[rearX - 0.85, 0.55, 0]}>
      {/* Bellhousing (tapered, crank axis) */}
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.bell}>
        <cylinderGeometry args={[0.3, 0.44, 0.55, 20]} />
      </mesh>
      {/* Case */}
      <RoundedBox args={[1.0, 0.85, 0.85]} radius={0.08} smoothness={2} position={[-0.3, 0, 0]} material={mats.case} />
      {/* Ribs */}
      {[-0.5, -0.3, -0.1].map((x) => (
        <mesh key={x} position={[x, 0, 0]} material={mats.hard}>
          <boxGeometry args={[0.05, 0.9, 0.9]} />
        </mesh>
      ))}
      {/* End cover */}
      <mesh position={[-0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hard}>
        <cylinderGeometry args={[0.32, 0.32, 0.12, 20]} />
      </mesh>
      {/* Axle flanges */}
      {[0.45, -0.45].map((z) => (
        <mesh key={z} position={[-0.3, 0, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.hard}>
          <cylinderGeometry args={[0.12, 0.12, 0.14, 14]} />
        </mesh>
      ))}
      {/* Shifter tower */}
      <mesh position={[-0.3, 0.55, 0]} material={mats.hard}>
        <boxGeometry args={[0.16, 0.25, 0.16]} />
      </mesh>
    </group>
  );
}
