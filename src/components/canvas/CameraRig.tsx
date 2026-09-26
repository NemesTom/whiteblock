'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEngineStore } from '@/store/useEngineStore';

const FOCUS_POS: Record<string, [number, number, number]> = {
  block: [0, 0.9, 0],
  internals: [0, 0.7, 0.5],
  head: [0, 1.9, 0],
  turbo: [1.9, 1.0, -0.8],
  transmission: [-2.2, 0.55, 0],
};

/** Camera focus animation + failure shake. */
export function CameraRig() {
  const { camera, controls } = useThree((s) => ({ camera: s.camera, controls: s.controls })) as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };
  const focusedPart = useEngineStore((x) => x.focusedPart);
  const status = useEngineStore((x) => x.status);
  const shake = useRef(0);

  useEffect(() => {
    const target = FOCUS_POS[focusedPart ?? ''] ?? [0, 1, 0];
    gsap.to(camera.position, {
      x: target[0] + 4.2,
      y: target[1] + 2.6,
      z: target[2] + 4.2,
      duration: 1.1,
      ease: 'power3.out',
    });
    if (controls) {
      gsap.to(controls.target, { x: target[0], y: target[1], z: target[2], duration: 1.1, ease: 'power3.out' });
    }
  }, [focusedPart, camera, controls]);

  useFrame(() => {
    if (status.startsWith('FAILED')) {
      shake.current += 0.35;
      camera.position.x += Math.sin(shake.current * 3.1) * 0.012;
      camera.position.y += Math.cos(shake.current * 2.7) * 0.01;
    }
  });
  return null;
}
