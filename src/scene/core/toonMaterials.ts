import * as THREE from 'three';

export const COMIC_INK_HEX = 0x181b2c;

let cachedGradientMap: THREE.DataTexture | null = null;

/**
 * 3-band toon gradient map so Three.js MeshToonMaterial snaps into punchy
 * Saturday-morning 90s cartoon cel-shading steps.
 */
export function getToonGradientMap(): THREE.DataTexture {
  if (cachedGradientMap) return cachedGradientMap;
  const colors = new Uint8Array([
    130, 130, 130, 255,
    205, 205, 205, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cachedGradientMap = tex;
  return tex;
}

export function createToonMaterial(color: string | number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradientMap(),
  });
}

let cachedOutlineMaterial: THREE.MeshBasicMaterial | null = null;

export function getOutlineMaterial(): THREE.MeshBasicMaterial {
  if (!cachedOutlineMaterial) {
    cachedOutlineMaterial = new THREE.MeshBasicMaterial({
      color: COMIC_INK_HEX,
      side: THREE.BackSide,
    });
  }
  return cachedOutlineMaterial;
}

/**
 * Attaches an inverted-hull comic ink outline mesh so 3D chibi limbs, heads,
 * caps, and bats pop with bold 90s cartoon silhouettes.
 */
export function attachComicOutline(mesh: THREE.Mesh, scale = 1.075): THREE.Mesh {
  const outline = new THREE.Mesh(mesh.geometry, getOutlineMaterial());
  outline.scale.setScalar(scale);
  outline.renderOrder = -1;
  mesh.add(outline);
  return outline;
}
