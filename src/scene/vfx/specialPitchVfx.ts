import * as THREE from 'three';
import type { ThrowsHand } from '../../engine/handedness/types';
import type { BallVfxStyle } from '../../engine/vfx/types';
import type { Vec3 } from '../camera/cameraRig';
import type { PitchTrailVisual } from '../playback/pitchFlight';

export type SpecialPitchStyle =
  | 'blazing_comet'
  | 'ghost_knuckle'
  | 'tornado_slider'
  | 'ice_veins'
  | 'heritage_surge';

export interface SpecialPitchTrailVisual extends PitchTrailVisual {
  readonly trailWidthScale: number;
  readonly ballScaleMultiplier: number;
}

export interface SpecialPitchVfx {
  readonly group: THREE.Group;
  readonly flightGroup: THREE.Group;
  readonly moundAuraGroup: THREE.Group;
  updateFlight: (
    style: SpecialPitchStyle,
    ballPos: Vec3,
    progress: number,
    color: string,
    reducedMotion: boolean,
  ) => void;
  setMoundAura: (
    activeColor: string | null,
    moundPos: Vec3,
    elapsedSec: number,
    reducedMotion: boolean,
  ) => void;
  hideFlight: () => void;
  clear: () => void;
  dispose: () => void;
}

const CORE_PITCH_POWERS: ReadonlySet<string> = new Set([
  'blazing_comet',
  'ghost_knuckle',
  'tornado_slider',
  'ice_veins',
]);

const SIGNATURE_BALL_STYLES: ReadonlySet<string> = new Set([
  'blazing_comet',
  'ghost_knuckle',
  'tornado_slider',
]);

const LATE_QUAD_NORM = 27 / 4; // Exact peak = 1.0 at t = 2/3 for t^2 * (1 - t)
const LATE_CUBE_NORM = 256 / 27; // Exact peak = 1.0 at t = 3/4 for t^3 * (1 - t)

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = clamp01((x - edge0) / (edge1 - edge0));
  return u * u * (3 - 2 * u);
}

/**
 * Resolves a pitcher special power or signature ball VFX style into its 3D
 * special-pitch spectacle preset. Checks exact capstone `powerId` before
 * `ballStyle` so `ice_veins` keeps its own crystalline identity.
 */
export function resolveSpecialPitchStyle(
  powerId?: string,
  ballStyle?: BallVfxStyle | null,
): SpecialPitchStyle | null {
  if (powerId && CORE_PITCH_POWERS.has(powerId)) {
    return powerId as SpecialPitchStyle;
  }
  if (ballStyle && SIGNATURE_BALL_STYLES.has(ballStyle)) {
    return ballStyle as SpecialPitchStyle;
  }
  if (powerId && powerId.trim().length > 0) {
    return 'heritage_surge';
  }
  return null;
}

/**
 * Applies dramatic pure-math trajectory offsets for special pitches while
 * guaranteeing exact zero offset at release (`t = 0`) and plate (`t = 1`).
 */
export function applySpecialPitchTrajectoryOffset(
  pos: Vec3,
  style: SpecialPitchStyle,
  t: number,
  throwsHand: ThrowsHand,
): void {
  const u = clamp01(t);
  if (u <= 0 || u >= 1) return;
  const env = Math.sin(Math.PI * u);
  const mirror = throwsHand === 'R' ? 1 : -1;

  switch (style) {
    case 'blazing_comet': {
      // Blistering late rise/hop (+0.12 carry peak at t = 2/3) & tight laser dart
      const lateCarry = LATE_QUAD_NORM * u * u * (1 - u);
      pos.y += 0.12 * lateCarry;
      pos.x += mirror * 0.07 * lateCarry;
      break;
    }
    case 'ghost_knuckle': {
      // Dramatic mid-flight flutter zig-zag (sin(5πt) lateral + cos(4πt) vertical)
      pos.x += mirror * Math.sin(u * Math.PI * 5) * 0.52 * env;
      pos.y += Math.cos(u * Math.PI * 4) * 0.28 * env;
      break;
    }
    case 'tornado_slider': {
      // Helical corkscrew spiral (cos(6πt) lateral + sin(6πt) vertical) + violent late snap
      const lateSnap = LATE_QUAD_NORM * u * u * (1 - u);
      pos.x += mirror * (Math.cos(u * Math.PI * 6) * 0.36 * env + 0.32 * lateSnap);
      pos.y += Math.sin(u * Math.PI * 6) * 0.24 * env - 0.08 * lateSnap;
      break;
    }
    case 'ice_veins': {
      // Flat laser early, surgical late corner break + crisp flat drop into the black
      const lateBreak = LATE_CUBE_NORM * u * u * u * (1 - u);
      pos.x += mirror * 0.26 * lateBreak;
      pos.y -= 0.14 * lateBreak;
      break;
    }
    case 'heritage_surge': {
      const lateSurge = LATE_QUAD_NORM * u * u * (1 - u);
      pos.x += mirror * 0.14 * lateSurge;
      pos.y += 0.1 * env;
      break;
    }
  }
}

/**
 * Computes baseball opacity across pitch flight. `ghost_knuckle` smoothly
 * phases translucent down to `0.14` (`0.55` in reducedMotion) across `t = 0.45..0.68`
 * before materializing cleanly over home plate.
 */
export function computeSpecialPitchBallOpacity(
  style: SpecialPitchStyle | null,
  progress: number,
  reducedMotion: boolean,
): number {
  if (style !== 'ghost_knuckle') return 1;
  const u = clamp01(progress);
  if (u <= 0.18 || u >= 0.92) return 1;
  const minOpacity = reducedMotion ? 0.55 : 0.14;
  let phase: number;
  if (u < 0.45) {
    phase = smoothstep(0.18, 0.45, u);
  } else if (u <= 0.68) {
    phase = 1;
  } else {
    phase = 1 - smoothstep(0.68, 0.92, u);
  }
  return 1 - (1 - minOpacity) * phase;
}

/** Returns thickened glowing tail & scale styling for each special pitch preset. */
export function getSpecialPitchTrailVisual(
  style: SpecialPitchStyle,
  vfxColor?: string,
  reducedMotion = false,
): SpecialPitchTrailVisual {
  const calm = reducedMotion;
  switch (style) {
    case 'blazing_comet':
      return {
        primaryColor: '#FF4D6D',
        secondaryColor: '#FFC300',
        trailStrength: calm ? 0.72 : 1.15,
        trailLengthScale: calm ? 1.35 : 2.15,
        spinRate: calm ? 1.1 : 2.2,
        trailWidthScale: calm ? 1.25 : 1.85,
        ballScaleMultiplier: 1.18,
      };
    case 'ghost_knuckle':
      return {
        primaryColor: '#9B5DE5',
        secondaryColor: '#E0AAFF',
        trailStrength: calm ? 0.65 : 1.05,
        trailLengthScale: calm ? 1.3 : 1.9,
        spinRate: 0.08,
        trailWidthScale: calm ? 1.2 : 1.6,
        ballScaleMultiplier: 1.12,
      };
    case 'tornado_slider':
      return {
        primaryColor: '#00E5FF',
        secondaryColor: '#BAE6FD',
        trailStrength: calm ? 0.7 : 1.12,
        trailLengthScale: calm ? 1.4 : 2.1,
        spinRate: calm ? 1.2 : 2.6,
        trailWidthScale: calm ? 1.25 : 1.75,
        ballScaleMultiplier: 1.14,
      };
    case 'ice_veins':
      return {
        primaryColor: '#4CC3FF',
        secondaryColor: '#E0F7FF',
        trailStrength: calm ? 0.7 : 1.1,
        trailLengthScale: calm ? 1.3 : 1.95,
        spinRate: calm ? 0.9 : 1.8,
        trailWidthScale: calm ? 1.2 : 1.65,
        ballScaleMultiplier: 1.12,
      };
    case 'heritage_surge':
      return {
        primaryColor: vfxColor || '#FFC300',
        secondaryColor: '#FFF8DC',
        trailStrength: calm ? 0.68 : 1.08,
        trailLengthScale: calm ? 1.3 : 1.85,
        spinRate: calm ? 0.9 : 1.7,
        trailWidthScale: calm ? 1.2 : 1.6,
        ballScaleMultiplier: 1.12,
      };
  }
}

const CALLOUT_DEFAULTS: Readonly<Record<Exclude<SpecialPitchStyle, 'heritage_surge'>, { text: string; color: string }>> = {
  blazing_comet: { text: '☄️ BLAZING COMET!', color: '#FF4D6D' },
  ghost_knuckle: { text: '👻 GHOST KNUCKLE!', color: '#9B5DE5' },
  tornado_slider: { text: '🌪️ TORNADO SLIDER!', color: '#00E5FF' },
  ice_veins: { text: '🧊 ICE VEINS!', color: '#4CC3FF' },
};

/** Formats the bold comic starburst release callout with optional pitch MPH. */
export function formatSpecialPitchCallout(
  style: SpecialPitchStyle,
  fallbackText?: string,
  mph?: number,
  fallbackColor?: string,
): { text: string; color: string } {
  const base =
    style === 'heritage_surge'
      ? {
          text: fallbackText ? `⚡ ${fallbackText}` : '⚡ POWER PITCH!',
          color: fallbackColor || '#FFC300',
        }
      : CALLOUT_DEFAULTS[style];
  const mphSuffix = typeof mph === 'number' && Number.isFinite(mph) && mph > 0
    ? ` ${Math.round(mph)} MPH`
    : '';
  return { text: `${base.text}${mphSuffix}`, color: base.color };
}

const RING_COUNT = 5;
const SPARK_COUNT = 10;

/**
 * Reusable, zero-per-frame-allocation Three.js VFX group for special pitch
 * flight halos, spectral afterimages, tornado vortex rings, frost diamonds,
 * and the pitcher's armed mound aura.
 */
export function createSpecialPitchVfx(): SpecialPitchVfx {
  const group = new THREE.Group();
  group.name = 'special pitch vfx';

  const flightGroup = new THREE.Group();
  flightGroup.name = 'special pitch flight';
  flightGroup.visible = false;
  group.add(flightGroup);

  const ringGeo = new THREE.RingGeometry(0.16, 0.25, 24);
  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let i = 0; i < RING_COUNT; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.8,
    });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    ringMaterials.push(mat);
    rings.push(mesh);
    flightGroup.add(mesh);
  }

  const sparkGeo = new THREE.OctahedronGeometry(0.085);
  const sparkMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
  });
  const sparks = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_COUNT);
  sparks.name = 'special pitch sparks';
  sparks.renderOrder = 3;
  sparks.frustumCulled = false;
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const initColor = new THREE.Color('#ffffff');
  for (let i = 0; i < SPARK_COUNT; i += 1) {
    sparks.setColorAt(i, initColor);
  }
  flightGroup.add(sparks);

  const moundAuraGroup = new THREE.Group();
  moundAuraGroup.name = 'special pitch mound aura';
  moundAuraGroup.visible = false;
  moundAuraGroup.renderOrder = 1;
  group.add(moundAuraGroup);

  const moundOuterGeo = new THREE.RingGeometry(0.46, 0.64, 36);
  const moundOuterMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.55,
  });
  const moundOuter = new THREE.Mesh(moundOuterGeo, moundOuterMat);
  moundOuter.rotation.x = -Math.PI / 2;

  const moundInnerGeo = new THREE.RingGeometry(0.28, 0.36, 32);
  const moundInnerMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.72,
  });
  const moundInner = new THREE.Mesh(moundInnerGeo, moundInnerMat);
  moundInner.rotation.x = -Math.PI / 2;
  moundAuraGroup.add(moundOuter, moundInner);

  // Reusable scratch objects (zero allocations per frame)
  const dummy = new THREE.Object3D();
  const primaryColor = new THREE.Color();
  const secondaryColor = new THREE.Color();

  function setPalette(style: SpecialPitchStyle, color: string) {
    switch (style) {
      case 'blazing_comet':
        primaryColor.set(color || '#FF4D6D');
        secondaryColor.set('#FFC300');
        break;
      case 'ghost_knuckle':
        primaryColor.set('#9B5DE5');
        secondaryColor.set('#E0AAFF');
        break;
      case 'tornado_slider':
        primaryColor.set('#00E5FF');
        secondaryColor.set('#BAE6FD');
        break;
      case 'ice_veins':
        primaryColor.set('#4CC3FF');
        secondaryColor.set('#E0F7FF');
        break;
      case 'heritage_surge':
        primaryColor.set(color || '#FFC300');
        secondaryColor.set('#FFF8DC');
        break;
    }
  }

  function updateFlight(
    style: SpecialPitchStyle,
    ballPos: Vec3,
    progress: number,
    color: string,
    reducedMotion: boolean,
  ): void {
    const p = clamp01(progress);
    const env = Math.sin(Math.PI * p);
    const motion = reducedMotion ? 0.35 : 1;
    setPalette(style, color);
    flightGroup.visible = true;

    for (let i = 0; i < RING_COUNT; i += 1) {
      const ring = rings[i];
      const mat = ringMaterials[i];
      const fade = 1 - i / RING_COUNT;
      mat.color.copy(i % 2 === 0 ? primaryColor : secondaryColor);

      if (style === 'blazing_comet') {
        const pulse = 1 + 0.15 * Math.sin(p * 24 * motion - i * 0.9);
        ring.position.set(ballPos.x, ballPos.y, ballPos.z - i * 0.24);
        ring.rotation.set(0, 0, p * 8 * motion + i * 0.5);
        ring.scale.setScalar((0.68 + i * 0.34) * pulse);
        mat.opacity = Math.min(1, (0.35 + 0.5 * env) * fade);
      } else if (style === 'ghost_knuckle') {
        const phaseBoost = 0.45 + 0.55 * (1 - computeSpecialPitchBallOpacity('ghost_knuckle', p, reducedMotion));
        const driftX = Math.sin(p * 12 * motion + i * 1.35) * 0.18 * (i + 1) * 0.35;
        const driftY = Math.cos(p * 10 * motion + i * 1.1) * 0.1 * (i + 1) * 0.3;
        ring.position.set(ballPos.x + driftX, ballPos.y + driftY, ballPos.z - (i + 1) * 0.3);
        ring.rotation.set(0.18 * Math.sin(i + p * 6), 0, p * 4 * motion + i);
        ring.scale.setScalar(0.75 + i * 0.26);
        mat.opacity = Math.min(0.88, phaseBoost * fade * 0.88);
      } else if (style === 'tornado_slider') {
        const angle = p * 18 * motion + i * 1.15;
        const funnel = 0.58 + i * 0.38;
        ring.position.set(
          ballPos.x + Math.cos(angle) * 0.08 * i,
          ballPos.y + Math.sin(angle) * 0.08 * i,
          ballPos.z - i * 0.28,
        );
        ring.rotation.set(0.28 * Math.sin(angle), 0.28 * Math.cos(angle), angle);
        ring.scale.set(funnel, funnel * 0.88, 1);
        mat.opacity = Math.min(0.9, (0.3 + 0.55 * env) * fade);
      } else if (style === 'ice_veins') {
        ring.position.set(ballPos.x, ballPos.y, ballPos.z - i * 0.22);
        ring.rotation.set(0, 0, Math.PI / 4 + p * 6 * motion + i * 0.65);
        ring.scale.set(0.62 + i * 0.24, 0.85 + i * 0.24, 1);
        mat.opacity = Math.min(0.9, (0.32 + 0.52 * env) * fade);
      } else {
        ring.position.set(ballPos.x, ballPos.y, ballPos.z - i * 0.24);
        ring.rotation.set(0, 0, p * 9 * motion + i * 0.7);
        ring.scale.setScalar(0.65 + i * 0.28);
        mat.opacity = Math.min(0.85, (0.3 + 0.5 * env) * fade);
      }
    }

    sparkMat.opacity = reducedMotion ? 0.45 : Math.min(0.95, 0.4 + 0.55 * env);
    for (let i = 0; i < SPARK_COUNT; i += 1) {
      const frac = i / SPARK_COUNT;
      const angle = p * (style === 'tornado_slider' ? 22 : 14) * motion + i * 2.39996;
      const trailZ = ballPos.z - (0.1 + frac * 1.35);

      if (style === 'blazing_comet') {
        const radial = 0.14 + (i % 3) * 0.09;
        dummy.position.set(
          ballPos.x + Math.cos(angle) * radial,
          ballPos.y + Math.sin(angle) * radial,
          trailZ,
        );
        dummy.rotation.set(angle, p * 12, 0);
        const s = (1 - frac * 0.6) * (reducedMotion ? 0.65 : 1.05);
        dummy.scale.set(s * 0.75, s * 0.75, s * 2.1);
      } else if (style === 'ghost_knuckle') {
        const radial = 0.22 + (i % 4) * 0.07;
        dummy.position.set(
          ballPos.x + Math.cos(angle * 0.55) * radial,
          ballPos.y + Math.sin(angle * 0.55) * radial,
          ballPos.z - (0.18 + frac * 1.5),
        );
        dummy.rotation.set(angle * 0.4, angle * 0.6, angle);
        const s = (0.75 - frac * 0.35) * (reducedMotion ? 0.6 : 1);
        dummy.scale.setScalar(s);
      } else if (style === 'tornado_slider') {
        const helixR = 0.16 + frac * 0.34;
        dummy.position.set(
          ballPos.x + Math.cos(angle) * helixR,
          ballPos.y + Math.sin(angle) * helixR,
          trailZ,
        );
        dummy.rotation.set(0, 0, angle);
        const s = (0.95 - frac * 0.45) * (reducedMotion ? 0.6 : 1);
        dummy.scale.set(s * 1.4, s * 0.55, s * 0.85);
      } else if (style === 'ice_veins') {
        const crystalR = 0.18 + (i % 3) * 0.08;
        dummy.position.set(
          ballPos.x + Math.cos(angle * 0.6) * crystalR,
          ballPos.y + Math.sin(angle * 0.6) * crystalR,
          ballPos.z - (0.08 + frac * 1.1),
        );
        dummy.rotation.set(0.3, angle * 0.8, Math.PI / 4);
        const s = (0.9 - frac * 0.4) * (reducedMotion ? 0.65 : 1);
        dummy.scale.set(s * 0.65, s * 1.55, s * 0.65);
      } else {
        const orbitR = 0.18 + (i % 3) * 0.08;
        dummy.position.set(
          ballPos.x + Math.cos(angle) * orbitR,
          ballPos.y + Math.sin(angle) * orbitR,
          trailZ,
        );
        dummy.rotation.set(angle, angle * 0.7, 0);
        const s = (0.9 - frac * 0.45) * (reducedMotion ? 0.65 : 1);
        dummy.scale.setScalar(s);
      }

      dummy.updateMatrix();
      sparks.setMatrixAt(i, dummy.matrix);
      sparks.setColorAt(i, i % 2 === 0 ? primaryColor : secondaryColor);
    }
    sparks.instanceMatrix.needsUpdate = true;
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
  }

  function setMoundAura(
    activeColor: string | null,
    moundPos: Vec3,
    elapsedSec: number,
    reducedMotion: boolean,
  ): void {
    if (!activeColor) {
      moundAuraGroup.visible = false;
      return;
    }
    moundAuraGroup.visible = true;
    moundAuraGroup.position.set(moundPos.x, moundPos.y + 0.03, moundPos.z);
    const pulse = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsedSec * 6.5);
    moundOuterMat.color.set(activeColor);
    moundOuterMat.opacity = 0.34 + 0.36 * pulse;
    moundOuter.scale.setScalar(0.92 + 0.24 * pulse);
    moundOuter.rotation.z = reducedMotion ? 0 : elapsedSec * 1.4;

    moundInnerMat.color.set(activeColor);
    moundInnerMat.opacity = 0.55 + 0.32 * (1 - pulse);
    moundInner.scale.setScalar(1.06 - 0.14 * pulse);
    moundInner.rotation.z = reducedMotion ? 0 : -elapsedSec * 2.1;
  }

  function hideFlight(): void {
    flightGroup.visible = false;
  }

  function clear(): void {
    flightGroup.visible = false;
    moundAuraGroup.visible = false;
  }

  function dispose(): void {
    clear();
    ringGeo.dispose();
    for (const mat of ringMaterials) {
      mat.dispose();
    }
    sparks.dispose();
    sparkGeo.dispose();
    sparkMat.dispose();
    moundOuterGeo.dispose();
    moundOuterMat.dispose();
    moundInnerGeo.dispose();
    moundInnerMat.dispose();
    group.clear();
  }

  return {
    group,
    flightGroup,
    moundAuraGroup,
    updateFlight,
    setMoundAura,
    hideFlight,
    clear,
    dispose,
  };
}
