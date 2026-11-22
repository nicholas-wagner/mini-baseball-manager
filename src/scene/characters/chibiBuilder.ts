import * as THREE from 'three';
import {
  evaluateMiniPlayerPose,
  type MiniPlayerFacing,
  type MiniPlayerRole,
} from '../../art/playerSvg/miniPlayerPose';
import { renderMiniPlayerSvgString } from '../../art/playerSvg/renderMiniPlayerSvg';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../../art/portraits/types';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import { CLIP_DURATIONS, GLOVE_CONTACT_PHASE, PITCH_RELEASE_PHASE, type CharacterAnimClip } from './animationState';

import { STANDEE_HEIGHT, STANDEE_CENTER } from './standeeDimensions';

export type ChibiRole = MiniPlayerRole;

export interface ChibiRigOptions {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: ChibiRole;
  throwsHand?: ThrowsHand;
  batSide?: EffectiveBatSide;
}

export interface ChibiPlayerRig {
  root: THREE.Group;
  logicalYaw: number;
  updatePose: (
    clip: CharacterAnimClip,
    timeSec: number,
    moodOverride?: PortraitMood,
    cameraWorldPos?: THREE.Vector3,
    caughtBall?: boolean,
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
 * Volumetric 2.5D Chibi Standee Rig inside the 3D Ballpark.
 * Combines 3D physical turf puck + 3D extruded dark rim backing + real 3D hop/tilt
 * with high-DPI volumetric-shaded 3/4 Front & Back Chibi SVG art.
 */
export function createChibiPlayerRig(
  initial: ChibiRigOptions,
  logicalYaw = 0,
): ChibiPlayerRig {
  const root = new THREE.Group();
  let currentOptions = initial;

  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 564;
  const ctx = canvas.getContext('2d');

  const spriteTex = new THREE.CanvasTexture(canvas);
  spriteTex.colorSpace = THREE.SRGBColorSpace;
  spriteTex.minFilter = THREE.LinearFilter;
  spriteTex.magFilter = THREE.LinearFilter;

  // 3D Ground Contact Shadow Disc on the dirt/grass
  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 24),
    new THREE.MeshBasicMaterial({ color: 0x0c2115, transparent: true, opacity: 0.38 }),
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.025;
  root.add(groundShadow);

  // Billboard Pivot (rotates toward camera horizontally + hops/tilts in 3D!)
  const billboardPivot = new THREE.Group();
  root.add(billboardPivot);

  const planeHeight = STANDEE_HEIGHT;
  const planeWidth = planeHeight * (240 / 260);
  const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
  planeGeo.translate(0, planeHeight * STANDEE_CENTER, 0);

  // Subtle 2.5D Standee Rim Drop-Edge (tucked cleanly right behind/below the ink outline!)
  const rimBackingMat = new THREE.MeshBasicMaterial({
    map: spriteTex,
    color: 0x181b2c,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
  });
  const rimBackingMesh = new THREE.Mesh(planeGeo, rimBackingMat);
  rimBackingMesh.position.set(0.024, -0.022, -0.025);
  billboardPivot.add(rimBackingMesh);

  // Primary High-DPI Volumetric Chibi Layer
  const planeMat = new THREE.MeshBasicMaterial({
    map: spriteTex,
    transparent: true,
    alphaTest: 0.06,
    side: THREE.DoubleSide,
  });
  const cutoutMesh = new THREE.Mesh(planeGeo, planeMat);
  billboardPivot.add(cutoutMesh);

  // 3D Super-Power glowing ground ring
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffc300,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.82, 28), auraMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.04;
  root.add(auraRing);

  let lastDrawnKey = '';
  let appearanceNonce = 0;
  const artKey = (opts: ChibiRigOptions) => JSON.stringify([opts.traits, opts.team]);
  let appearanceKey = artKey(initial);

  const prewarmIdle = (opts: ChibiRigOptions, nonce: number) => {
    const th = opts.throwsHand ?? 'R';
    const bs = opts.batSide ?? 'R';
    for (const facing of ['front', 'back'] as const) {
      const key = `v4:${nonce}:${appearanceKey}:${opts.jerseyNumber}:${opts.role}:${th}:${bs}:${facing}:idle:default:0`;
      const pose = evaluateMiniPlayerPose('idle', 0, opts.role);
      getOrDecodeSvgFrame(key, () =>
        renderMiniPlayerSvgString(
          {
            traits: opts.traits,
            team: opts.team,
            jerseyNumber: opts.jerseyNumber,
            role: opts.role,
            facing,
            throwsHand: th,
            batSide: bs,
            includeGroundShadow: false,
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
      appearanceKey = artKey(options);
      appearanceNonce += 1;
      lastDrawnKey = '';
      prewarmIdle(options, appearanceNonce);
    },
    updatePose: (
      clip: CharacterAnimClip,
      timeSec: number,
      moodOverride?: PortraitMood,
      cameraWorldPos?: THREE.Vector3,
      caughtBall = false,
    ) => {
      let facing: MiniPlayerFacing = 'front';
      if (cameraWorldPos) {
        const dx = cameraWorldPos.x - root.position.x;
        const dz = cameraWorldPos.z - root.position.z;
        billboardPivot.rotation.y = Math.atan2(dx, dz);

        const forwardX = Math.sin(rig.logicalYaw);
        const forwardZ = Math.cos(rig.logicalYaw);
        const dot = forwardX * dx + forwardZ * dz;
        facing = dot >= 0 ? 'front' : 'back';
      }

      // Smooth 60 FPS physical 3D hop & tilt on the 3D field!
      const smoothPose = evaluateMiniPlayerPose(clip, timeSec, currentOptions.role);
      billboardPivot.position.y = smoothPose.hopWorldY;
      billboardPivot.rotation.z = smoothPose.tiltWorldZ;
      groundShadow.scale.setScalar(smoothPose.shadowScale);

      const duration = CLIP_DURATIONS[clip];
      const cycle = timeSec % duration;
      const frameIdx = (Math.floor((cycle / duration) * FRAME_STEPS + 1e-8) + FRAME_STEPS) % FRAME_STEPS;

      auraRing.visible = smoothPose.auraIntensity > 0.04;
      if (auraRing.visible) {
        auraMat.color.set(smoothPose.auraColor);
        auraMat.opacity = smoothPose.auraIntensity * 0.75;
        auraRing.scale.setScalar(1 + Math.sin(timeSec * 12) * 0.1 + smoothPose.auraIntensity * 0.24);
      }

      const moodKey = (moodOverride ?? 'default') + (caughtBall ? ':caught' : '');
      const th = currentOptions.throwsHand ?? 'R';
      const bs = currentOptions.batSide ?? 'R';
      const sequence = `v4:${appearanceNonce}:${appearanceKey}:${currentOptions.jerseyNumber}:${currentOptions.role}:${th}:${bs}:${facing}:${clip}:${moodKey}`;
      const key = `${sequence}:${frameIdx}`;

      if (key === lastDrawnKey) return;

      let drawnKey = key;
      const decodeFrame = (idx: number, possession = caughtBall) => getOrDecodeSvgFrame(
        `${sequence}${possession && !caughtBall ? ':caught' : ''}:${idx}`, () =>
        renderMiniPlayerSvgString(
          { ...currentOptions, facing, moodOverride, caughtBall: possession, includeGroundShadow: false },
          evaluateMiniPlayerPose(clip, (idx / FRAME_STEPS) * duration, currentOptions.role),
        ),
      );
      let readyImg = decodeFrame(frameIdx);
      if (smoothPose.pitchPhase !== undefined && smoothPose.holdingBall) {
        decodeFrame(PITCH_RELEASE_PHASE * FRAME_STEPS);
      }
      // The leather receives the ball on the contact frame, even on the
      // first replay when the secured version has never been drawn.
      if (!caughtBall && (clip === 'field_dive' || clip === 'field_high_jump')) {
        decodeFrame(GLOVE_CONTACT_PHASE[clip] * FRAME_STEPS, true);
      }
      // Decode one step ahead while this pose is on screen; the contact
      // silhouette then appears on the same frame as the ball changes direction.
      decodeFrame((frameIdx + 1) % FRAME_STEPS);

      // A cold clip can advance before its SVG finishes decoding on mobile.
      // Draw the latest available pose from this appearance and camera angle.
      for (let prev = frameIdx - 1; !readyImg && prev >= 0; prev--) {
        drawnKey = `${sequence}:${prev}`;
        if (drawnKey === lastDrawnKey) return;
        const candidate = svgFrameCache.get(drawnKey);
        if (candidate?.complete && candidate.naturalWidth > 0) readyImg = candidate;
      }

      if (readyImg && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(readyImg, 0, 0, canvas.width, canvas.height);
        spriteTex.needsUpdate = true;
        lastDrawnKey = drawnKey;
      } else if (!lastDrawnKey && ctx) {
        const fallbackKey = `v4:${appearanceNonce}:${appearanceKey}:${currentOptions.jerseyNumber}:${currentOptions.role}:${th}:${bs}:${facing}:idle:default:0`;
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
      rimBackingMat.dispose();
      auraMat.dispose();
      spriteTex.dispose();
    },
  };

  return rig;
}
