'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BASE_ENGINES, TURBO_FLANGE, TURBO_MAX_SHAFT, TURBO_SCALE, maxHorsepower, shaftSpeed } from '@/lib/physics';
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
  const big = TURBO_SCALE[turboId] ?? 1;
  const t3 = TURBO_FLANGE[turboId] === 't3';

  const shaftRef = useRef<THREE.Group>(null);
  const shaftVis = useRef(0); // 0..1 shaft load with spool inertia
  const burst = useEngineStore((s) => s.status) === 'FAILED_TURBO_OVERSPEED';

  // Burst wheel: visibly damaged once it lets go.
  useEffect(() => {
    if (shaftRef.current) shaftRef.current.scale.setScalar(burst ? 0.7 : 1);
  }, [burst]);

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
      turbine: clip(
        new THREE.MeshStandardMaterial({
          color: '#4a423c',
          emissive: hot ? '#ff2200' : '#000000',
          emissiveIntensity: hot ? 1.2 : 0,
          metalness: 0.85,
          roughness: 0.4,
        }),
        cutaway ? plane : null,
      ),
      compressor: clip(
        new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 0.9, roughness: 0.25 }),
        cutaway ? plane : null,
      ),
      shield: clip(new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.85, roughness: 0.35 }), cutaway ? plane : null),
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
      new THREE.Vector3(-0.4, 0, 0),
      new THREE.Vector3(-0.56, -0.12, -0.05),
      new THREE.Vector3(-0.62, -0.5, -0.2),
      new THREE.Vector3(-0.72, -0.9, -0.3),
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

  /**
   * Axisymmetric housing profiles revolved with LatheGeometry.
   * Points are (radius, axial); meshes rotate ±90° about Z to lie on X.
   */
  const housings = useMemo(() => {
    const v2 = (r: number, y: number) => new THREE.Vector2(r, y);
    // Compressor cover: backplate → volute bulge → nose → bellmouth lip
    const comp = new THREE.LatheGeometry(
      [v2(0.09, 0), v2(0.29, 0), v2(0.335, 0.06), v2(0.3, 0.16), v2(0.21, 0.24), v2(0.17, 0.3), v2(0.185, 0.34)],
      30,
    );
    // Turbine housing: core → volute → neck → V-band lip
    const turb = new THREE.LatheGeometry(
      [v2(0.1, 0), v2(0.24, 0.02), v2(0.265, 0.1), v2(0.21, 0.2), v2(0.125, 0.26), v2(0.15, 0.3)],
      30,
    );
    return { comp, turb };
  }, []);

  useEffect(
    () => () => {
      housings.comp.dispose();
      housings.turb.dispose();
    },
    [housings],
  );

  // Shaft follows engine load with spool inertia: winds up over ~1.5 s,
  // coasts down when paused or seized. No more eternal spinning.
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useEngineStore.getState();
    const running = st.animPlaying && st.status === 'OK';
    const target = running ? shaftSpeed(st, animClock.rpm) / TURBO_MAX_SHAFT[st.turboId] : 0;
    shaftVis.current += (Math.min(1.3, target) - shaftVis.current) * (1 - Math.exp(-dt / 1.5));
    if (shaftRef.current) {
      shaftRef.current.rotation.x += dt * shaftVis.current * 45;
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
          {/* External wastegate + screamer (T3 big frames) */}
          {t3 && (
            <group position={[-0.5, collectorY + 0.15, collectorZ + 0.15]}>
              <mesh rotation={[0.5, 0, -0.4]} material={mats.steel}>
                <cylinderGeometry args={[0.055, 0.055, 0.16, 12]} />
              </mesh>
              <mesh position={[0.03, 0.12, 0.02]} material={mats.dark}>
                <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
              </mesh>
              <mesh position={[-0.12, -0.25, -0.05]} rotation={[0.3, 0, 0.35]} material={mats.dark}>
                <cylinderGeometry args={[0.035, 0.04, 0.4, 10]} />
              </mesh>
            </group>
          )}
        </group>
      </OptionalModel>

      <OptionalModel path={MODEL_PATHS.turbo}>
        <group position={[turboX, collectorY + 0.1, collectorZ]} scale={big}>
          {/* ===== Turbine housing (lathe volute, outlet faces -X) ===== */}
          <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={housings.turb} material={mats.turbine} />
          {/* Turbine inlet elbow from the manifold flange */}
          <mesh position={[-0.3, 0.14, 0]} rotation={[0, 0, 1.1]} material={mats.turbine}>
            <cylinderGeometry args={[0.1, 0.11, 0.26, 14]} />
          </mesh>
          {/* V-band clamp + outlet flange */}
          <mesh position={[-0.38, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.steel}>
            <torusGeometry args={[0.15, 0.025, 10, 20]} />
          </mesh>
          <mesh position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.turbine}>
            <cylinderGeometry args={[0.15, 0.15, 0.04, 18]} />
          </mesh>
          {/* Heat shield over the turbine */}
          <mesh position={[-0.22, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.shield}>
            <cylinderGeometry args={[0.3, 0.3, 0.3, 20, 1, true, 0, Math.PI]} />
          </mesh>

          {/* ===== CHRA barrel + ports ===== */}
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.steel}>
            <cylinderGeometry args={[0.085, 0.085, 0.36, 16]} />
          </mesh>
          {/* Oil feed (top) + drain (bottom) */}
          <mesh position={[0.1, 0.19, 0]} material={mats.brass}>
            <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
          </mesh>
          <mesh position={[0.1, 0.3, 0]} material={mats.brass}>
            <boxGeometry args={[0.07, 0.04, 0.07]} />
          </mesh>
          <mesh position={[0.06, -0.2, 0]} material={mats.steel}>
            <cylinderGeometry args={[0.035, 0.045, 0.24, 10]} />
          </mesh>
          {/* Coolant ports */}
          {[-0.09, 0.09].map((z) => (
            <mesh key={z} position={[0.1, 0.02, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.brass}>
              <cylinderGeometry args={[0.022, 0.022, 0.08, 8]} />
            </mesh>
          ))}

          {/* ===== Compressor backplate + clamp + cover ===== */}
          <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.compressor}>
            <cylinderGeometry args={[0.3, 0.3, 0.03, 26]} />
          </mesh>
          <mesh position={[0.28, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.steel}>
            <torusGeometry args={[0.3, 0.02, 10, 28]} />
          </mesh>
          <mesh position={[0.28, 0, 0]} rotation={[0, 0, -Math.PI / 2]} geometry={housings.comp} material={mats.compressor} />
          {/* Compressor outlet elbow (to intercooler) */}
          <mesh position={[0.42, -0.3, 0.06]} rotation={[0.2, 0, 0.15]} material={mats.compressor}>
            <cylinderGeometry args={[0.07, 0.075, 0.24, 14]} />
          </mesh>
          <mesh position={[0.42, -0.4, 0.07]} rotation={[Math.PI / 2 - 0.2, 0, 0]} material={mats.steel}>
            <torusGeometry args={[0.07, 0.015, 8, 16]} />
          </mesh>

          {/* ===== Shaft: turbine wheel + compressor wheel (spins) ===== */}
          <group ref={shaftRef}>
            <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.steel}>
              <cylinderGeometry args={[0.025, 0.025, 0.62, 10]} />
            </mesh>
            {/* Turbine wheel */}
            <group position={[-0.16, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
                <cylinderGeometry args={[0.13, 0.13, 0.03, 20]} />
              </mesh>
              {Array.from({ length: 11 }).map((_, b) => (
                <group key={b} rotation={[(b * 2 * Math.PI) / 11, 0, 0]}>
                  <mesh position={[-0.02, 0.075, 0]} rotation={[0, 0, 0.5]} material={mats.dark}>
                    <boxGeometry args={[0.02, 0.1, 0.045]} />
                  </mesh>
                </group>
              ))}
            </group>
            {/* Compressor wheel, recessed in the bellmouth */}
            <group position={[0.4, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
                <cylinderGeometry args={[0.15, 0.15, 0.03, 22]} />
              </mesh>
              {Array.from({ length: 11 }).map((_, b) => (
                <group key={b} rotation={[(b * 2 * Math.PI) / 11, 0, 0]}>
                  <mesh position={[0.03, 0.08, 0]} rotation={[0, 0, 0.35]} material={mats.brass}>
                    <boxGeometry args={[0.02, 0.12, 0.05]} />
                  </mesh>
                </group>
              ))}
              <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
                <cylinderGeometry args={[0.02, 0.05, 0.07, 12]} />
              </mesh>
            </group>
          </group>

          {/* ===== Wastegate actuator + linkage ===== */}
          <mesh position={[0.02, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
            <boxGeometry args={[0.04, 0.04, 0.2]} />
          </mesh>
          <mesh position={[0.02, 0.4, 0.1]} material={mats.dark}>
            <cylinderGeometry args={[0.055, 0.055, 0.14, 14]} />
          </mesh>
          <mesh position={[-0.04, 0.28, 0.08]} rotation={[0, 0, 0.6]} material={mats.steel}>
            <cylinderGeometry args={[0.014, 0.014, 0.18, 8]} />
          </mesh>
          <mesh position={[-0.1, 0.2, 0.06]} rotation={[0.5, 0, 0]} material={mats.steel}>
            <boxGeometry args={[0.03, 0.1, 0.02]} />
          </mesh>

          {/* ===== Downpipe with angled flange + studs ===== */}
          <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 16]} />
          </mesh>
          {[-0.09, 0.09].map((z) => (
            <mesh key={z} position={[-0.44, 0.1, z]} material={mats.steel}>
              <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
            </mesh>
          ))}
          <mesh geometry={downpipe} material={mats.dark} />
        </group>
      </OptionalModel>
    </>
  );
}
