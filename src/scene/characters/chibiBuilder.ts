import * as THREE from 'three';
import {
  evaluateMiniPlayerPose,
  type MiniPlayerFacing,
  type MiniPlayerRole,
} from '../../art/playerSvg/miniPlayerPose';
import { renderMiniPlayerSvgString } from '../../art/playerSvg/renderMiniPlayerSvg';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../../art/portraits/types';
import { CLIP_DURATIONS, type CharacterAnimClip } from './animationState';

export type ChibiRole = MiniPlayerRole;

export interface ChibiRigOptions {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: ChibiRole;
}

export interface ChibiPlayerRig {
  root: THREE.Group;
  logicalYaw: number;
  updatePose: (
    clip: CharacterAnimClip,
    timeSec: number,
    moodOverride?: PortraitMood,
    cameraWorldPos?: THREE.Vector3,
  ) => void;
  updateAppearance: (options: ChibiRigOptions) => void;
  dispose: () => void;
}

const FRAME_STEPS = 16;
const MAX_CACHE_ENTRIES = 192;
const svgFrameCache = new Map<string, HTMLImageElement>();

function getOrDecodeSvgFrame(key: string, buildSvg: () => string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = svgFrameCache.get(key);
  if (!img) {
    if (svgFrameCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = svgFrameCache.keys().next().value;
      if (oldestKey) svgFrameCache.delete(oldestKey);
    }
    img = new Image();
    img.decoding = 'async';
    const svg = buildSvg();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    svgFrameCache.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * 2.5D Illustrated SVG Cutout Rig inside the 3D Ballpark ("Paper Mario / Backyard Baseball" style).
 * Renders our articulated Front & Back vector SVG rigs onto a high-DPI billboard plane anchored
 * cleanly on the 3D field with reactive 3D aura rings and camera-relative front/back switching.
 */
export function createChibiPlayerRig(
  initial: ChibiRigOptions,
  logicalYaw = 0,
): ChibiPlayerRig {
  const root = new THREE.Group();
  let currentOptions = initial;

  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');

  const spriteTex = new THREE.CanvasTexture(canvas);
  spriteTex.colorSpace = THREE.SRGBColorSpace;
  spriteTex.minFilter = THREE.LinearFilter;
  spriteTex.magFilter = THREE.LinearFilter;

  // Upright 2.5D cutout plane (pivot anchored at bottom feet y = 0)
  const planeHeight = 2.15;
  const planeWidth = planeHeight * (240 / 280);
  const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
  // Shift geometry upward so y=0 sits right at the chibi cleats (viewBox y=254/280)
  planeGeo.translate(0, planeHeight * 0.46, 0);

  const planeMat = new THREE.MeshBasicMaterial({
    map: spriteTex,
    transparent: true,
    alphaTest: 0.06,
    side: THREE.DoubleSide,
  });
  const cutoutMesh = new THREE.Mesh(planeGeo, planeMat);
  root.add(cutoutMesh);

  // 3D Super-Power glowing ground ring
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffc300,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.78, 28), auraMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.04;
  root.add(auraRing);

  let lastDrawnKey = '';
  let appearanceNonce = 0;

  const prewarmIdle = (opts: ChibiRigOptions, nonce: number) => {
    for (const facing of ['front', 'back'] as const) {
      const key = `${nonce}:${opts.traits.seed}:${opts.team.primary}:${opts.jerseyNumber}:${opts.role}:${facing}:idle:default:0`;
      const pose = evaluateMiniPlayerPose('idle', 0, opts.role);
      getOrDecodeSvgFrame(key, () =>
        renderMiniPlayerSvgString(
          {
            traits: opts.traits,
            team: opts.team,
            jerseyNumber: opts.jerseyNumber,
            role: opts.role,
            facing,
          },
          pose,
        ),
      );
    }
  };

  prewarmIdle(initial, appearanceNonce);

  const rig: ChibiPlayerRig = {
    root,
    logicalYaw,
    updateAppearance: (options: ChibiRigOptions) => {
      currentOptions = options;
      appearanceNonce += 1;
      lastDrawnKey = '';
      prewarmIdle(options, appearanceNonce);
    },
    updatePose: (
      clip: CharacterAnimClip,
      timeSec: number,
      moodOverride?: PortraitMood,
      cameraWorldPos?: THREE.Vector3,
    ) => {
      // Determine camera-relative facing ('front' vs 'back') and cylindrical billboard yaw
      let facing: MiniPlayerFacing = 'front';
      if (cameraWorldPos) {
        const dx = cameraWorldPos.x - root.position.x;
        const dz = cameraWorldPos.z - root.position.z;
        cutoutMesh.rotation.y = Math.atan2(dx, dz);

        const forwardX = Math.sin(rig.logicalYaw);
        const forwardZ = Math.cos(rig.logicalYaw);
        const dot = forwardX * dx + forwardZ * dz;
        facing = dot >= 0 ? 'front' : 'back';
      }

      const duration = CLIP_DURATIONS[clip];
      const cycle = ((timeSec % duration) + duration) % duration;
      const frameIdx = Math.floor((cycle / duration) * FRAME_STEPS) % FRAME_STEPS;
      const quantizedTime = (frameIdx / FRAME_STEPS) * duration;

      const pose = evaluateMiniPlayerPose(clip, quantizedTime, currentOptions.role);

      // Update 3D ground aura ring
      auraRing.visible = pose.auraIntensity > 0.04;
      if (auraRing.visible) {
        auraMat.color.set(pose.auraColor);
        auraMat.opacity = pose.auraIntensity * 0.72;
        auraRing.scale.setScalar(1 + Math.sin(timeSec * 12) * 0.1 + pose.auraIntensity * 0.22);
      }

      const moodKey = moodOverride ?? 'default';
      const key = `${appearanceNonce}:${currentOptions.traits.seed}:${currentOptions.team.primary}:${currentOptions.jerseyNumber}:${currentOptions.role}:${facing}:${clip}:${moodKey}:${frameIdx}`;

      if (key === lastDrawnKey) return;

      const readyImg = getOrDecodeSvgFrame(key, () =>
        renderMiniPlayerSvgString(
          {
            traits: currentOptions.traits,
            team: currentOptions.team,
            jerseyNumber: currentOptions.jerseyNumber,
            role: currentOptions.role,
            facing,
            moodOverride,
          },
          pose,
        ),
      );

      if (readyImg && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(readyImg, 0, 0, canvas.width, canvas.height);
        spriteTex.needsUpdate = true;
        lastDrawnKey = key;
      } else if (!lastDrawnKey && ctx) {
        // Fallback to idle frame 0 if already decoded so cutout never flickers empty
        const fallbackKey = `${appearanceNonce}:${currentOptions.traits.seed}:${currentOptions.team.primary}:${currentOptions.jerseyNumber}:${currentOptions.role}:${facing}:idle:default:0`;
        const fallbackImg = svgFrameCache.get(fallbackKey);
        if (fallbackImg && fallbackImg.complete && fallbackImg.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(fallbackImg, 0, 0, canvas.width, canvas.height);
          spriteTex.needsUpdate = true;
        }
      }
    },
    dispose: () => {
      planeGeo.dispose();
      planeMat.dispose();
      auraMat.dispose();
      spriteTex.dispose();
    },
  };

  return rig;
}
