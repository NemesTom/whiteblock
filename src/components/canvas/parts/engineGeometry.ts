import { BASE_ENGINES, ROD_LENGTH_MM } from '@/lib/physics';
import type { EngineId, RodsId } from '@/types/engine';

/**
 * Shared visual scale + layout constants so the castings (block, head)
 * and the moving parts (crank, rods, pistons) always agree with each other
 * and with the selected engine's real bore/stroke/rod dimensions.
 */
export const MM = 0.005; // scene units per millimetre
export const Y_CRANK = 0.35; // crankshaft axis height
export const CYL_SPACING = 0.42;
export const CROWN_H = 0.19; // wrist-pin centre to piston crown
export const IDLE_RPM = 800;

export function cylinderCount(id: EngineId): number {
  return BASE_ENGINES[id].cylinders;
}

/** Cylinder bore radius in scene units. */
export function boreR(id: EngineId): number {
  return (BASE_ENGINES[id].boreMm * MM) / 2;
}

/** Crank throw (half stroke) in scene units. */
export function crankThrow(id: EngineId): number {
  return (BASE_ENGINES[id].strokeMm * MM) / 2;
}

/** Centre-to-centre rod length in scene units. */
export function rodUnits(rods: RodsId): number {
  return ROD_LENGTH_MM[rods] * MM;
}

/** Overall block length along the crank (X) axis. */
export function engineLength(n: number): number {
  return n * CYL_SPACING + 0.5;
}

/** X position of cylinder i. */
export function cylX(i: number, n: number): number {
  return (i - (n - 1) / 2) * CYL_SPACING;
}

/** Deck-face height: crank centre + throw + rod + crown + clearance. */
export function deckY(id: EngineId, rods: RodsId): number {
  return Y_CRANK + crankThrow(id) + rodUnits(rods) + CROWN_H + 0.03;
}

/**
 * Crank phase for cylinder i (radians). Four-stroke firing-interval
 * spacing: 720° / n. The rigid crank carries all pins at these angles.
 */
export function firingPhase(i: number, n: number): number {
  return (i * 4 * Math.PI) / n;
}

/**
 * True slider-crank: wrist-pin height for crank angle θ.
 * x = r·cosθ + √(l² − r²sin²θ), measured from the crank centre.
 */
export function pinTopY(theta: number, r: number, l: number): number {
  const s = r * Math.sin(theta);
  return Y_CRANK + r * Math.cos(theta) + Math.sqrt(Math.max(1e-6, l * l - s * s));
}
