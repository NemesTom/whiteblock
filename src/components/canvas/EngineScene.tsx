'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import gsap from 'gsap';
import { useEngineStore, selectMetrics } from '@/store/useEngineStore';

/**
 * Asset pipeline: exact paths the user's scans/CAD must be dropped into.
 * Until present, geometric placeholders render and the real .glb files
 * load seamlessly through <OptionalModel>.
 */
export const MODEL_PATHS = {
  block: '/models/b5234t3_block.glb',
  flanges: '/models/b523_flanges.glb',
  turbo: '/models/td04_19t.glb',
  manifold: '/models/t5_exhaust_manifold.glb',
} as const;

const FOCUS_POS: Record<string, [number, number, number]> = {
  block: [0, 0.9, 0],
  internals: [0, 0.8, 0.6],
  head: [0, 1.8, 0],
  turbo: [1.9, 1.0, 0.5],
  transmission: [-2.0, 0.6, 0],
};

/** Renders a .glb when it exists, otherwise the placeholder children. */
function OptionalModel({ path, children }: { path: string; children: React.ReactNode }) {
  const [exists, setExists] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(path, { method: 'HEAD' })
      .then((r) => live && setExists(r.ok))
      .catch(() => live && setExists(false));
    return () => {
      live = false;
    };
  }, [path]);
  if (!exists) return <>{children}</>;
  return <GltfModel path={path} />;
}

function GltfModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <primitive object={scene} />;
}

function CameraRig() {
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

function EngineModel() {
  const sel = useEngineStore();
  const m = useMemo(
    () =>
      selectMetrics({
        engineId: sel.engineId,
        rodsId: sel.rodsId,
        headId: sel.headId,
        turboId: sel.turboId,
        manifoldId: sel.manifoldId,
        transmissionId: sel.transmissionId,
        sleevesId: sel.sleevesId,
        tuneId: sel.tuneId,
        clutchId: sel.clutchId,
        transCoolerId: sel.transCoolerId,
        boostPsi: sel.boostPsi,
        cutaway: sel.cutaway,
        focusedPart: sel.focusedPart,
      }),
    [sel],
  );

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.55), []);
  const cutaway = sel.cutaway;
  const rodsFailed = sel.status === 'FAILED_BENT_RODS';
  const blockFailed = sel.status === 'FAILED_CRACKED_BLOCK';
  const hot = m.maxHp > 400 || m.maxHp === 0; // glow manifold on big power (or failure heat)
  const cylinders = sel.engineId === 'B4194T' ? 4 : sel.engineId === 'B6284T' ? 6 : 5;

  const blockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: blockFailed ? '#7f1d1d' : '#94a3b8',
        metalness: 0.75,
        roughness: 0.35,
        clippingPlanes: cutaway ? [clipPlane] : null,
        clipShadows: true,
      }),
    [cutaway, clipPlane, blockFailed],
  );
  const headMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        metalness: 0.6,
        roughness: 0.4,
        clippingPlanes: cutaway ? [clipPlane] : null,
        clipShadows: true,
      }),
    [cutaway, clipPlane],
  );
  const rodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: rodsFailed ? '#ff0000' : '#e2e8f0',
        emissive: rodsFailed ? '#ff0000' : '#000000',
        emissiveIntensity: rodsFailed ? 1.6 : 0,
        metalness: 0.9,
        roughness: 0.25,
      }),
    [rodsFailed],
  );
  const manifoldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: sel.manifoldId === 'japanifold-s60r' ? '#d97706' : '#78716c',
        emissive: hot ? '#ff2200' : '#000000',
        emissiveIntensity: hot ? 2 : 0,
        metalness: 0.85,
        roughness: 0.35,
      }),
    [hot, sel.manifoldId],
  );

  useEffect(() => () => {
    blockMat.dispose();
    headMat.dispose();
    rodMat.dispose();
    manifoldMat.dispose();
  }, [blockMat, headMat, rodMat, manifoldMat]);

  return (
    <group>
      {/* ===== Engine block (placeholder box; swaps to b5234t3_block.glb) ===== */}
      <OptionalModel path={MODEL_PATHS.block}>
        <mesh position={[0, 0.9, 0]} material={blockMat}>
          <boxGeometry args={[2.3, 1.5, 1.25]} />
        </mesh>
      </OptionalModel>

      {/* ===== Cylinder head (clipped in cutaway) ===== */}
      <mesh position={[0, 1.9, 0]} material={headMat}>
        <boxGeometry args={[2.3, 0.55, 1.15]} />
      </mesh>
      {/* Valve cover accent */}
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[1.6, 0.12, 0.8]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* ===== Internals: pistons + rods (visible through cutaway) ===== */}
      <group>
        {Array.from({ length: cylinders }).map((_, i) => {
          const x = (i - (cylinders - 1) / 2) * 0.42;
          const bent = rodsFailed ? (i % 2 === 0 ? 0.35 : -0.3) : 0;
          return (
            <group key={i} position={[x, 0.9, 0]} rotation={[0, 0, bent]}>
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.28, 20]} />
                <meshStandardMaterial color="#e7e5e4" metalness={0.85} roughness={0.25} />
              </mesh>
              <mesh position={[0, -0.25, 0]} material={rodMat}>
                <boxGeometry args={[0.09, 0.7, 0.09]} />
              </mesh>
            </group>
          );
        })}
        {/* Crankshaft */}
        <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 2.3, 16]} />
          <meshStandardMaterial color="#57534e" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* ===== Intake & exhaust flanges (placeholder; swaps to b523_flanges.glb) ===== */}
      <OptionalModel path={MODEL_PATHS.flanges}>
        <mesh position={[0, 1.55, 0.72]}>
          <boxGeometry args={[2.0, 0.3, 0.08]} />
          <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.4} />
        </mesh>
      </OptionalModel>

      {/* ===== Exhaust manifold — heatmapped (swaps to t5_exhaust_manifold.glb) ===== */}
      <OptionalModel path={MODEL_PATHS.manifold}>
        <group>
          {Array.from({ length: cylinders }).map((_, i) => {
            const x = (i - (cylinders - 1) / 2) * 0.42;
            return (
              <mesh key={i} position={[x, 1.15, -0.75]} rotation={[0.5, 0, 0]} material={manifoldMat}>
                <cylinderGeometry args={[0.07, 0.07, 0.7, 12]} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.85, -0.95]} material={manifoldMat}>
            <boxGeometry args={[2.0, 0.18, 0.18]} />
          </mesh>
        </group>
      </OptionalModel>

      {/* ===== Turbocharger (swaps to td04_19t.glb) ===== */}
      <OptionalModel path={MODEL_PATHS.turbo}>
        <group position={[1.85, 0.85, -0.55]}>
          <mesh>
            <torusGeometry args={[0.28, 0.14, 14, 24]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.2, 0.35, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[-0.35, 0.25, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.08]} />
            <meshStandardMaterial color="#a8a29e" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      </OptionalModel>

      {/* ===== Transmission ===== */}
      <group position={[-2.0, 0.7, 0]}>
        <mesh>
          <boxGeometry args={[1.1, 0.9, 0.9]} />
          <meshStandardMaterial
            color={sel.status === 'FAILED_EXPLODED_GEARBOX' ? '#7f1d1d' : '#334155'}
            emissive={sel.status === 'FAILED_EXPLODED_GEARBOX' ? '#ff0000' : '#000000'}
            emissiveIntensity={sel.status === 'FAILED_EXPLODED_GEARBOX' ? 1.2 : 0}
            metalness={0.6}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.45, 0.4, 18]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export function EngineScene() {
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
          <EngineModel />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows position={[0, -0.05, 0]} opacity={0.55} scale={12} blur={2.4} />
        <gridHelper args={[14, 14, '#3f3f46', '#27272a']} position={[0, -0.06, 0]} />
        <CameraRig />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={14} minDistance={1.5} />
      </Canvas>
    </div>
  );
}
