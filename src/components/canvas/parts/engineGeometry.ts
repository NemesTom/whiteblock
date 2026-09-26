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
/** Slow-motion factor: visual crank rev/s = rpm/60 × SLOWMO (1 rev/s at 4000). */
export const SLOWMO = 0.015;

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

/** Fractional position within the 720° cycle (0..4, one unit per stroke). */
export function cyclePos(theta: number, phase: number): number {
  const deg = (((theta + phase) * 180) / Math.PI) % 720;
  const c = deg < 0 ? deg + 720 : deg;
  return c / 180;
}

/** Four-stroke index for a cylinder: 0 intake · 1 compression · 2 power · 3 exhaust. */
export type StrokeIndex = 0 | 1 | 2 | 3;

/**
 * Stroke state from crank angle θ (rad) + cylinder phase (rad).
 * A 720° cycle split into four 180° strokes, offset per firing interval.
 */
export function strokeOf(theta: number, phase: number): StrokeIndex {
  return Math.floor(cyclePos(theta, phase)) as StrokeIndex;
}

/** Cycle-highlight colors: suck (intake) · squeeze · bang · blow (exhaust). */
export const STROKE_COLORS: Record<StrokeIndex, string> = {
  0: '#38bdf8',
  1: '#facc15',
  2: '#ff4400',
  3: '#9ca3af',
};

/** Full valve lift travel in scene units. */
export const VALVE_LIFT_MAX = 0.05;

/**
 * Valve lift (0..1): intake peaks mid-intake-stroke, exhaust peaks
 * mid-exhaust-stroke, seated elsewhere (overlap ignored).
 */
export function valveLift(theta: number, phase: number, isExhaust: boolean): number {
  const c = cyclePos(theta, phase);
  if (!isExhaust && c >= 0 && c < 1) return Math.sin(Math.PI * c);
  if (isExhaust && c >= 3 && c < 4) return Math.sin(Math.PI * (c - 3));
  return 0;
}
