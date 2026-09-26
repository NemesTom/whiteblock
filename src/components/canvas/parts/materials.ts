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

  // The plane object is shared with every casting material: mutating it
  // in place moves the cut without rebuilding materials (not React state).
  useEffect(() => {
    const dir =
      axis === 'x'
        ? new THREE.Vector3(1, 0, 0)
        : axis === 'y'
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1);
    if (flip) {
      plane.normal.copy(dir);
      // eslint-disable-next-line react-hooks/immutability -- shared three.js Plane, not React state
      plane.constant = -offset;
    } else {
      plane.normal.copy(dir).negate();
      plane.constant = offset;
    }
  }, [plane, axis, offset, flip]);

  return plane;
}

/**
 * Attach the cut plane to a casting material (DoubleSide reads solid).
 * Pass null to leave the material whole — clipping planes are only
 * attached while cutaway mode is on, so the default view is a whole engine.
 */
export function clip<T extends THREE.Material>(mat: T, plane: THREE.Plane | null): T {
  mat.clippingPlanes = plane ? [plane] : null;
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
