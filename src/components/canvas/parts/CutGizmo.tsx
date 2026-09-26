'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useEngineStore } from '@/store/useEngineStore';

/**
 * Translucent in-scene marker showing exactly where the cutaway plane
 * slices the model. Visible only while cutaway mode is on.
 */
export function CutGizmo() {
  const cutaway = useEngineStore((s) => s.cutaway);
  const axis = useEngineStore((s) => s.cutawayAxis);
  const offset = useEngineStore((s) => s.cutawayOffset);

  if (!cutaway) return null;

  const size: [number, number] =
    axis === 'x' ? [2.4, 3.0] : axis === 'y' ? [3.8, 2.4] : [3.8, 3.0];
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size[0], size[1])), [size[0], size[1]]);

  useEffect(() => () => edges.dispose(), [edges]);

  if (!cutaway) return null;
  const position: [number, number, number] =
    axis === 'x' ? [offset, 1.1, 0] : axis === 'y' ? [0, offset, 0] : [0, 1.1, offset];
  const rotation: [number, number, number] =
    axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [-Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#fbbf24" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}
