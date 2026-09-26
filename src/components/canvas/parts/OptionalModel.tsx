import { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * Asset pipeline: exact paths the user's scans/CAD must be dropped into.
 * Until present, the procedural placeholders render and the real .glb
 * files load seamlessly through <OptionalModel>.
 */
export const MODEL_PATHS = {
  block: '/models/b5234t3_block.glb',
  flanges: '/models/b523_flanges.glb',
  turbo: '/models/td04_19t.glb',
  manifold: '/models/t5_exhaust_manifold.glb',
} as const;

/** Renders a .glb when it exists, otherwise the placeholder children. */
export function OptionalModel({ path, children }: { path: string; children: React.ReactNode }) {
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
