'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BASE_ENGINES, maxHorsepower } from '@/lib/physics';
import { useEngineStore } from '@/store/useEngineStore';
import { animClock } from '@/lib/animClock';
import { clip } from './materials';
import { OptionalModel, MODEL_PATHS } from './OptionalModel';
import { cylX, deckY, engineLength } from './engineGeometry';

/**
 * Exhaust side: individual runner tubes merging into a collector, then a
 * TD04-style turbo (turbine + compressor volutes, CHRA, spinning
 * compressor wheel, wastegate actuator) with a downpipe. Runners and the
 * turbine heat-soak with power: glowing red above 400 WHP.
 */
export function TurboAssembly({ plane }: { plane: THREE.Plane }) {
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const turboId = useEngineStore((s) => s.turboId);
  const manifoldId = useEngineStore((s) => s.manifoldId);
  const cutaway = useEngineStore((s) => s.cutaway);
  const maxHp = useEngineStore((s) => maxHorsepower(s));

  const engine = BASE_ENGINES[engineId];
  const n = engine.cylinders;
  const len = engineLength(n);
  const deck = deckY(engineId, rodsId);
  const headBase = deck + 0.05;
  const hot = maxHp > 400 || maxHp === 0;
  const big = turboId === 'k24' ? 1.15 : 1;

  const wheelRef = useRef<THREE.Group>(null);

  const mats = useMemo(
    () => ({
      runner: clip(
        new THREE.MeshStandardMaterial({
          color: manifoldId === 'japanifold-s60r' ? '#c07a2a' : '#7a756f',
          emissive: hot ? '#ff2200' : '#000000',
          emissiveIntensity: hot ? 2 : 0,
          metalness: 0.85,
          roughness: 0.35,
        }),
        cutaway ? plane : null,
      ),
      turbine: new THREE.MeshStandardMaterial({
        color: '#4a423c',
        emissive: hot ? '#ff2200' : '#000000',
        emissiveIntensity: hot ? 1.2 : 0,
        metalness: 0.85,
        roughness: 0.4,
      }),
      compressor: new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 0.9, roughness: 0.25 }),
      steel: new THREE.MeshStandardMaterial({ color: '#8a8f96', metalness: 0.9, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: '#26282c', metalness: 0.7, roughness: 0.45 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b08d3f', metalness: 0.9, roughness: 0.3 }),
    }),
    [plane, cutaway, hot, manifoldId],
  );

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  // Runner tubes: head flange → collector.
  const collectorY = 0.95;
  const collectorZ = -0.92;
  const runners = useMemo(() => {
    const geos: THREE.TubeGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const x = cylX(i, n);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, headBase + 0.12, -0.52),
        new THREE.Vector3(x, headBase - 0.25, -0.72),
        new THREE.Vector3(x * 0.7, collectorY + 0.25, collectorZ + 0.05),
        new THREE.Vector3(x * 0.55, collectorY, collectorZ),
      ]);
      geos.push(new THREE.TubeGeometry(curve, 20, 0.07, 10, false));
    }
    return geos;
  }, [n, headBase, collectorY, collectorZ]);

  const downpipe = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.3, -0.15),
      new THREE.Vector3(-0.1, -0.7, -0.35),
      new THREE.Vector3(-0.35, -1.0, -0.4),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.11, 12, false);
  }, []);

  useEffect(
    () => () => {
      runners.forEach((g) => g.dispose());
      downpipe.dispose();
    },
    [runners, downpipe],
  );

  // Compressor wheel spools with the engine (seized when failed).
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useEngineStore.getState();
    if (wheelRef.current && st.animPlaying && st.status === 'OK') {
      wheelRef.current.rotation.x += dt * (8 + animClock.rpm / 180);
    }
  });

  const turboX = len / 2 + 0.42;

  return (
    <>
      <OptionalModel path={MODEL_PATHS.manifold}>
        <group>
          {runners.map((geo, i) => (
            <mesh key={i} geometry={geo} material={mats.runner} />
          ))}
          {/* Collector */}
          <mesh position={[0, collectorY, collectorZ]} rotation={[0, 0, Math.PI / 2]} material={mats.runner}>
            <cylinderGeometry args={[0.11, 0.11, len * 0.8, 14]} />
          </mesh>
          {/* Turbo flange */}
          <mesh position={[turboX - 0.35, collectorY, collectorZ]} material={mats.runner}>
            <boxGeometry args={[0.06, 0.3, 0.3]} />
          </mesh>
        </group>
      </OptionalModel>

      <OptionalModel path={MODEL_PATHS.turbo}>
        <group position={[turboX, collectorY + 0.1, collectorZ]} scale={big}>
            {/* Turbine volute */}
            <mesh material={mats.turbine}>
              <torusGeometry args={[0.2, 0.12, 14, 24]} />
            </mesh>
            <mesh position={[-0.18, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.turbine}>
              <cylinderGeometry args={[0.13, 0.17, 0.2, 16]} />
            </mesh>
            {/* CHRA */}
            <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.steel}>
              <cylinderGeometry args={[0.085, 0.085, 0.3, 14]} />
            </mesh>
            {/* Compressor volute + bellmouth */}
            <mesh position={[0.45, 0, 0]} material={mats.compressor}>
              <torusGeometry args={[0.22, 0.12, 14, 24]} />
            </mesh>
            <mesh position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.compressor}>
              <cylinderGeometry args={[0.1, 0.2, 0.16, 18]} />
            </mesh>
            {/* Compressor wheel (spins) */}
            <group ref={wheelRef} position={[0.45, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
                <cylinderGeometry args={[0.15, 0.15, 0.03, 20]} />
              </mesh>
              {Array.from({ length: 9 }).map((_, b) => (
                <mesh key={b} position={[0.03, 0, 0]} rotation={[0, 0, (b * 2 * Math.PI) / 9]} material={mats.brass}>
                  <boxGeometry args={[0.02, 0.13, 0.05]} />
                </mesh>
              ))}
              <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
                <cylinderGeometry args={[0.02, 0.05, 0.07, 12]} />
              </mesh>
            </group>
            {/* Wastegate actuator */}
            <mesh position={[0.1, 0.3, 0.1]} material={mats.dark}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
            </mesh>
            <mesh position={[0.02, 0.18, 0.05]} rotation={[0, 0, 0.5]} material={mats.steel}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
            </mesh>
            {/* Oil feed line */}
            <mesh position={[0.22, 0.2, 0]} material={mats.brass}>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
            </mesh>
            {/* Downpipe */}
            <mesh position={[-0.25, -0.1, -0.05]} geometry={downpipe} material={mats.dark} />
          </group>
      </OptionalModel>
    </>
  );
}
