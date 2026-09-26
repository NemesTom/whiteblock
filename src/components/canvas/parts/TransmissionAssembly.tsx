'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { BASE_ENGINES } from '@/lib/physics';
import { useEngineStore } from '@/store/useEngineStore';
import { engineLength } from './engineGeometry';

/**
 * Four visibly distinct gearboxes sharing one mount point:
 * - M56 5-spd manual: compact ribbed case, shifter tower + linkage,
 *   clutch slave cylinder on the bellhousing.
 * - M66 6-spd manual: larger case, bigger end cover, twin shift cables.
 * - AW55 5-spd auto: torque-converter bulge, sump pan with drain,
 *   cooler fittings, selector lever (no clutch, no tower).
 * - GM 4T65-E transverse auto: wide case, big side cover, converter
 *   bulge, cooler fittings, dipstick tube.
 * Exploded boxes glow red; overheated autos glow orange.
 */
export function TransmissionAssembly() {
  const engineId = useEngineStore((s) => s.engineId);
  const transmissionId = useEngineStore((s) => s.transmissionId);
  const status = useEngineStore((s) => s.status);
  const exploded = status === 'FAILED_EXPLODED_GEARBOX';
  const overheated = status === 'FAILED_OVERWHELMED_TRANS';

  const len = engineLength(BASE_ENGINES[engineId].cylinders);
  const rearX = -len / 2;

  const mats = useMemo(
    () => ({
      bell: new THREE.MeshStandardMaterial({ color: exploded ? '#7f1d1d' : '#3b4250', metalness: 0.65, roughness: 0.45 }),
      case: new THREE.MeshStandardMaterial({
        color: exploded ? '#7f1d1d' : '#333a47',
        emissive: exploded ? '#ff0000' : overheated ? '#ff6600' : '#000000',
        emissiveIntensity: exploded || overheated ? 1.2 : 0,
        metalness: 0.6,
        roughness: 0.5,
      }),
      hard: new THREE.MeshStandardMaterial({ color: '#565d68', metalness: 0.85, roughness: 0.35 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b08d3f', metalness: 0.9, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: '#26282c', metalness: 0.7, roughness: 0.45 }),
    }),
    [exploded, overheated],
  );

  return (
    <group position={[rearX - 0.85, 0.55, 0]}>
      {transmissionId === 'm56' && <M56 mats={mats} />}
      {transmissionId === 'm66' && <M66 mats={mats} />}
      {transmissionId === 'aw55' && <AW55 mats={mats} />}
      {transmissionId === 'gm-4t65e' && <GM4T65E mats={mats} />}
    </group>
  );
}

type Mats = {
  bell: THREE.MeshStandardMaterial;
  case: THREE.MeshStandardMaterial;
  hard: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
};

function AxleFlanges({ mats, x, r = 0.12 }: { mats: Mats; x: number; r?: number }) {
  return (
    <>
      {[0.45, -0.45].map((z) => (
        <mesh key={z} position={[x, 0, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.hard}>
          <cylinderGeometry args={[r, r, 0.14, 14]} />
        </mesh>
      ))}
    </>
  );
}

function M56({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Bellhousing */}
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.bell}>
        <cylinderGeometry args={[0.3, 0.44, 0.55, 20]} />
      </mesh>
      {/* Compact case */}
      <RoundedBox args={[0.9, 0.8, 0.8]} radius={0.08} smoothness={2} position={[-0.28, 0, 0]} material={mats.case} />
      {/* Ribs */}
      {[-0.45, -0.28, -0.11].map((x) => (
        <mesh key={x} position={[x, 0, 0]} material={mats.hard}>
          <boxGeometry args={[0.05, 0.85, 0.85]} />
        </mesh>
      ))}
      {/* End cover + drain + fill plugs */}
      <mesh position={[-0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hard}>
        <cylinderGeometry args={[0.3, 0.3, 0.12, 20]} />
      </mesh>
      <mesh position={[-0.28, -0.44, 0.2]} material={mats.dark}>
        <cylinderGeometry args={[0.035, 0.035, 0.06, 10]} />
      </mesh>
      <AxleFlanges mats={mats} x={-0.28} />
      {/* Shifter tower + linkage rods forward */}
      <mesh position={[-0.28, 0.52, 0]} material={mats.hard}>
        <boxGeometry args={[0.16, 0.25, 0.16]} />
      </mesh>
      {[-0.07, 0.07].map((z) => (
        <mesh key={z} position={[0.35, 0.55, z]} rotation={[0, 0, Math.PI / 2]} material={mats.hard}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
        </mesh>
      ))}
      {/* Clutch slave cylinder on the bellhousing */}
      <mesh position={[0.45, 0.32, 0.25]} rotation={[0.4, 0, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.05, 0.05, 0.18, 10]} />
      </mesh>
    </group>
  );
}

function M66({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Larger bellhousing */}
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.bell}>
        <cylinderGeometry args={[0.33, 0.48, 0.6, 20]} />
      </mesh>
      {/* Bigger 6-speed case */}
      <RoundedBox args={[1.1, 0.9, 0.9]} radius={0.08} smoothness={2} position={[-0.35, 0, 0]} material={mats.case} />
      {/* Heavy ribs */}
      {[-0.6, -0.35, -0.1].map((x) => (
        <mesh key={x} position={[x, 0, 0]} material={mats.hard}>
          <boxGeometry args={[0.06, 0.96, 0.96]} />
        </mesh>
      ))}
      {/* Big end cover */}
      <mesh position={[-0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hard}>
        <cylinderGeometry args={[0.36, 0.36, 0.14, 20]} />
      </mesh>
      <AxleFlanges mats={mats} x={-0.35} r={0.14} />
      {/* Shifter tower + twin cables */}
      <mesh position={[-0.35, 0.58, 0]} material={mats.hard}>
        <boxGeometry args={[0.18, 0.28, 0.18]} />
      </mesh>
      {[-0.08, 0.08].map((z) => (
        <mesh key={z} position={[0.3, 0.5, z]} rotation={[0, 0, Math.PI / 2 - 0.15]} material={mats.dark}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 8]} />
        </mesh>
      ))}
      {/* Clutch slave cylinder */}
      <mesh position={[0.5, 0.35, 0.28]} rotation={[0.4, 0, 0]} material={mats.dark}>
        <cylinderGeometry args={[0.05, 0.05, 0.18, 10]} />
      </mesh>
    </group>
  );
}

function AW55({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Bellhousing */}
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.bell}>
        <cylinderGeometry args={[0.32, 0.44, 0.5, 20]} />
      </mesh>
      {/* Torque converter bulge */}
      <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.case}>
        <cylinderGeometry args={[0.36, 0.36, 0.3, 22]} />
      </mesh>
      <mesh position={[-0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.hard}>
        <torusGeometry args={[0.36, 0.025, 8, 26]} />
      </mesh>
      {/* Auto case (smoother, fewer ribs) */}
      <RoundedBox args={[0.85, 0.82, 0.82]} radius={0.1} smoothness={2} position={[-0.55, 0.02, 0]} material={mats.case} />
      {/* Sump pan + drain */}
      <mesh position={[-0.55, -0.46, 0]} material={mats.dark}>
        <boxGeometry args={[0.75, 0.16, 0.66]} />
      </mesh>
      <mesh position={[-0.55, -0.56, 0.15]} material={mats.hard}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 10]} />
      </mesh>
      {/* Cooler line fittings + selector lever (no tower, no clutch) */}
      {[0.12, 0.22].map((x) => (
        <mesh key={x} position={[x - 0.5, 0.25, 0.42]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass}>
          <cylinderGeometry args={[0.025, 0.025, 0.1, 8]} />
        </mesh>
      ))}
      <mesh position={[-0.55, 0.5, -0.1]} rotation={[0, 0, -0.5]} material={mats.hard}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
      </mesh>
      <AxleFlanges mats={mats} x={-0.55} />
    </group>
  );
}

function GM4T65E({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Bellhousing */}
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.bell}>
        <cylinderGeometry args={[0.34, 0.46, 0.55, 20]} />
      </mesh>
      {/* Torque converter bulge */}
      <mesh position={[0.0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.case}>
        <cylinderGeometry args={[0.38, 0.38, 0.3, 22]} />
      </mesh>
      {/* Wide transverse case */}
      <RoundedBox args={[0.95, 0.9, 1.0]} radius={0.1} smoothness={2} position={[-0.55, 0, 0]} material={mats.case} />
      {/* Big side cover on the -Z face */}
      <mesh position={[-0.55, 0, -0.52]} rotation={[Math.PI / 2, 0, 0]} material={mats.hard}>
        <cylinderGeometry args={[0.38, 0.38, 0.08, 24]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, k) => {
        const a = (k / 8) * Math.PI * 2;
        return (
          <mesh key={k} position={[-0.55 + Math.cos(a) * 0.3, Math.sin(a) * 0.3, -0.57]} material={mats.dark}>
            <cylinderGeometry args={[0.022, 0.022, 0.04, 8]} />
          </mesh>
        );
      })}
      {/* Sump pan + dipstick tube + cooler fittings */}
      <mesh position={[-0.55, -0.5, 0]} material={mats.dark}>
        <boxGeometry args={[0.85, 0.16, 0.8]} />
      </mesh>
      <mesh position={[-0.9, 0.5, 0.35]} rotation={[0, 0, 0.15]} material={mats.hard}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
      </mesh>
      {[0.15, 0.25].map((x) => (
        <mesh key={x} position={[x - 0.5, 0.28, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass}>
          <cylinderGeometry args={[0.025, 0.025, 0.1, 8]} />
        </mesh>
      ))}
      <AxleFlanges mats={mats} x={-0.55} r={0.13} />
    </group>
  );
}
