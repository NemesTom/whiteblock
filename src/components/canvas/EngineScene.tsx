'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useCutPlane } from './parts/materials';
import { BlockAssembly } from './parts/BlockAssembly';
import { HeadAssembly } from './parts/HeadAssembly';
import { RotatingAssembly } from './parts/RotatingAssembly';
import { TurboAssembly } from './parts/TurboAssembly';
import { TransmissionAssembly } from './parts/TransmissionAssembly';
import { CutGizmo } from './parts/CutGizmo';
import { CameraRig } from './CameraRig';

/**
 * Engine viewport: composes the procedural whiteblock assemblies.
 * The shared cut plane is created here and handed to every casting.
 */
export function EngineScene() {
  const plane = useCutPlane();

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-zinc-900 to-black">
      <Canvas
        gl={{ localClippingEnabled: true, antialias: true }}
        camera={{ position: [4.2, 3.4, 4.2], fov: 45 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} />
        <directionalLight position={[-4, 3, -4]} intensity={0.4} />
        <Suspense fallback={null}>
          <BlockAssembly plane={plane} />
          <RotatingAssembly />
          <HeadAssembly plane={plane} />
          <TurboAssembly plane={plane} />
          <TransmissionAssembly />
          <Environment preset="city" />
        </Suspense>
        <CutGizmo />
        <ContactShadows position={[0, -0.45, 0]} opacity={0.55} scale={12} blur={2.4} />
        <gridHelper args={[14, 14, '#3f3f46', '#27272a']} position={[0, -0.46, 0]} />
        <CameraRig />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={14} minDistance={1.5} />
      </Canvas>
    </div>
  );
}
