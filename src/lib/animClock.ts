import { useSyncExternalStore } from 'react';

type Listener = () => void;

/**
 * Mutable animation clock for the rotating assembly.
 * Mutated every frame inside useFrame (no React re-renders); subscribers
 * (dyno cursor, rpm readout) are notified at most every 100 ms so the
 * 2D UI stays smooth without a render storm.
 */
class AnimClock {
  /** Crank angle in radians. */
  angle = 0;
  /** Live engine speed in rpm (sweep position or chart cursor). */
  rpm = 800;
  private version = 0;
  private listeners = new Set<Listener>();
  private lastNotify = 0;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getVersion = (): number => this.version;

  /** Write from useFrame. Notifies subscribers at most 10×/s. */
  advance(angle: number, rpm: number): void {
    this.angle = angle;
    this.rpm = rpm;
    const now = performance.now();
    if (now - this.lastNotify > 100) {
      this.lastNotify = now;
      this.version += 1;
      this.listeners.forEach((l) => l());
    }
  }

  /** Direct cursor jump (chart click). Notifies immediately. */
  jumpTo(rpm: number): void {
    this.rpm = rpm;
    this.version += 1;
    this.lastNotify = performance.now();
    this.listeners.forEach((l) => l());
  }
}

export const animClock = new AnimClock();

/** Reactive live rpm for the chart cursor + telemetry readout (~10 Hz). */
export function useAnimRpm(): number {
  useSyncExternalStore(animClock.subscribe, animClock.getVersion, () => 0);
  return animClock.rpm;
}
