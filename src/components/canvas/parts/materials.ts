import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useEngineStore } from '@/store/useEngineStore';
import type { CutawayAxis } from '@/types/engine';

/**
 * The single shared clipping plane. Mutated in place from cutaway state,
 * so no material ever needs to be rebuilt when the cut moves.
 * Kept region: normal·p + constant ≥ 0.
 */
export function useCutPlane(): THREE.Plane {
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.55), []);
  const axis = useEngineStore((s) => s.cutawayAxis);
  const offset = useEngineStore((s) => s.cutawayOffset);
  const flip = useEngineStore((s) => s.cutawayFlip);

  useEffect(() => {
    const dir =
      axis === 'x'
        ? new THREE.Vector3(1, 0, 0)
        : axis === 'y'
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1);
    if (flip) {
      plane.normal.copy(dir);
      plane.constant = -offset;
    } else {
      plane.normal.copy(dir).negate();
      plane.constant = offset;
    }
  }, [plane, axis, offset, flip]);

  return plane;
}

/** Attach the cut plane to a casting material (DoubleSide reads solid). */
export function clip<T extends THREE.Material>(mat: T, plane: THREE.Plane): T {
  mat.clippingPlanes = [plane];
  mat.clipShadows = true;
  mat.side = THREE.DoubleSide;
  return mat;
}

/** Slider range + reset default per axis, matched to the model bounds. */
export const CUT_RANGES: Record<CutawayAxis, { min: number; max: number; step: number; def: number }> = {
  x: { min: -1.6, max: 1.6, step: 0.01, def: 0.55 },
  y: { min: 0, max: 2.6, step: 0.01, def: 1.2 },
  z: { min: -1.0, max: 1.0, step: 0.01, def: 0 },
};
