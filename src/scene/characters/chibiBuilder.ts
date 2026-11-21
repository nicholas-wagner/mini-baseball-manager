import * as THREE from 'three';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../../art/portraits/types';
import { attachComicOutline, createToonMaterial } from '../core/toonMaterials';
import { evaluateCharacterPose, type CharacterAnimClip } from './animationState';
import { createChibiFaceTexture } from './faceTexture';

export type ChibiRole = 'pitcher' | 'batter' | 'fielder' | 'catcher';

export interface ChibiRigOptions {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: ChibiRole;
}

export interface ChibiPlayerRig {
  root: THREE.Group;
  updatePose: (clip: CharacterAnimClip, timeSec: number, moodOverride?: PortraitMood) => void;
  updateAppearance: (options: ChibiRigOptions) => void;
  dispose: () => void;
}

function createJerseyNumberTexture(
  primary: string,
  secondary: string,
  accent: string,
  monogram: string,
  jerseyNumber: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 512, 256);

    // Classic 90s collar trim & waist belt
    ctx.fillStyle = '#FBF4E4';
    ctx.fillRect(0, 0, 512, 34);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 32, 512, 12);
    ctx.fillStyle = secondary;
    ctx.fillRect(0, 210, 512, 46);
    ctx.fillStyle = '#FFC300';
    ctx.fillRect(114, 216, 28, 22);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Front chest (u = 0.25 -> x = 128 when torso.rotation.y = -PI/2): Team Monogram + Piping
    ctx.fillStyle = '#FBF4E4';
    ctx.fillRect(124, 34, 8, 176);
    ctx.font = '900 48px Bungee, Fredoka, sans-serif';
    ctx.strokeStyle = '#181B2C';
    ctx.lineWidth = 8;
    ctx.strokeText(monogram.slice(0, 2), 128, 122);
    ctx.fillStyle = accent;
    ctx.fillText(monogram.slice(0, 2), 128, 122);

    // Back of jersey (u = 0.75 -> x = 384): Bold Retro Jersey Number
    ctx.font = '900 84px Bungee, Fredoka, sans-serif';
    ctx.strokeStyle = '#181B2C';
    ctx.lineWidth = 11;
    const numStr = String(jerseyNumber);
    ctx.strokeText(numStr, 384, 134);
    ctx.fillStyle = '#FBF4E4';
    ctx.fillText(numStr, 384, 134);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createChibiPlayerRig(initial: ChibiRigOptions): ChibiPlayerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  let currentOptions = initial;
  const face = createChibiFaceTexture(initial.traits, 'happy');
  let jerseyTex = createJerseyNumberTexture(
    initial.team.primary,
    initial.team.secondary,
    initial.team.accent,
    initial.team.monogram,
    initial.jerseyNumber,
  );

  // Ground blob shadow
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 20),
    new THREE.MeshBasicMaterial({ color: 0x102518, transparent: true, opacity: 0.34 }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // Super-Power glowing aura ring
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffc300,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.72, 24), auraMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.05;
  root.add(auraRing);

  // Torso (cute rounded Power-Pros egg capsule)
  const torsoMat = new THREE.MeshToonMaterial({
    map: jerseyTex,
    gradientMap: createToonMaterial(0xffffff).gradientMap,
  });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.28, 8, 16), torsoMat);
  torso.position.y = 0.62;
  // Align UV x=0.25 (chest monogram) to +Z forward and x=0.75 (jersey number) to -Z back
  torso.rotation.y = -Math.PI / 2;
  torso.castShadow = true;
  attachComicOutline(torso, 1.08);
  bodyPivot.add(torso);

  // Head pivot
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.24, 0);
  bodyPivot.add(headPivot);

  const headMat = new THREE.MeshToonMaterial({
    map: face.texture,
    gradientMap: createToonMaterial(0xffffff).gradientMap,
  });
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), headMat);
  // Rotate so UV x=0.5 faces +Z (character forward)
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.castShadow = true;
  attachComicOutline(headMesh, 1.07);
  headPivot.add(headMesh);

  // Cute round chibi ears
  const earMat = createToonMaterial(initial.traits.skinTone);
  const earGeo = new THREE.SphereGeometry(0.1, 12, 10);
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.41, -0.02, 0.02);
  attachComicOutline(leftEar, 1.14);
  headPivot.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.41, -0.02, 0.02);
  attachComicOutline(rightEar, 1.14);
  headPivot.add(rightEar);

  // Back hair tuft peeking under cap
  const hairMat = createToonMaterial(initial.traits.hairColor);
  const hairTuft = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), hairMat);
  hairTuft.position.set(0, 0.02, -0.18);
  hairTuft.scale.set(1.06, 0.85, 0.82);
  attachComicOutline(hairTuft, 1.08);
  headPivot.add(hairTuft);

  // Oversized 90s Team Baseball Cap
  const capGroup = new THREE.Group();
  capGroup.position.set(0, 0.14, 0);
  headPivot.add(capGroup);

  const capCrownMat = createToonMaterial(initial.team.primary);
  const capBrimMat = createToonMaterial(initial.team.secondary);
  const capBtnMat = createToonMaterial(initial.team.accent);

  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.445, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    capCrownMat,
  );
  capDome.castShadow = true;
  attachComicOutline(capDome, 1.06);
  capGroup.add(capDome);

  const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.06, 18), capBrimMat);
  capBrim.position.set(0, 0.02, 0.34);
  capBrim.scale.set(0.95, 1, 0.72);
  capBrim.rotation.x = 0.09;
  attachComicOutline(capBrim, 1.08);
  capGroup.add(capBrim);

  const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), capBtnMat);
  capButton.position.set(0, 0.45, 0);
  attachComicOutline(capButton, 1.18);
  capGroup.add(capButton);

  // Cute gold front cap patch emblem
  const capPatch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.05), capBtnMat);
  capPatch.position.set(0, 0.18, 0.415);
  capPatch.rotation.x = -0.25;
  attachComicOutline(capPatch, 1.15);
  capGroup.add(capPatch);

  // Cute blue cartoon practice sweat drop
  const sweatMat = createToonMaterial(0x4cc3ff);
  const sweatDrop = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 10), sweatMat);
  sweatDrop.position.set(0.44, 0.28, 0.18);
  sweatDrop.rotation.z = -0.35;
  sweatDrop.visible = false;
  attachComicOutline(sweatDrop, 1.15);
  headPivot.add(sweatDrop);

  // Buoyant floating hands (classic Power Pros silhouette!)
  const handMat = createToonMaterial(initial.traits.skinTone);
  const gloveMat = createToonMaterial(0xb5651d);

  const leftHandPivot = new THREE.Group();
  bodyPivot.add(leftHandPivot);
  const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), handMat);
  attachComicOutline(leftHandMesh, 1.14);
  leftHandPivot.add(leftHandMesh);

  // Chunky stitched fielder's glove (toggled by role)
  const gloveMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), gloveMat);
  gloveMesh.scale.set(1.1, 1.15, 0.72);
  attachComicOutline(gloveMesh, 1.1);
  leftHandPivot.add(gloveMesh);

  const rightHandPivot = new THREE.Group();
  bodyPivot.add(rightHandPivot);
  const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), handMat);
  attachComicOutline(rightHandMesh, 1.14);
  rightHandPivot.add(rightHandMesh);

  // Mini Baseball held in pitcher's right hand
  const handBall = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), createToonMaterial(0xfbf4e4));
  handBall.position.set(0, 0.04, 0.12);
  attachComicOutline(handBall, 1.15);
  rightHandPivot.add(handBall);

  // Chunky cartoon baseball bat attached to right hand
  const batPivot = new THREE.Group();
  rightHandPivot.add(batPivot);
  const batMat = createToonMaterial(0xe3a857);
  const batMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.036, 1.18, 12), batMat);
  batMesh.position.y = 0.52;
  batMesh.castShadow = true;
  attachComicOutline(batMesh, 1.12);
  batPivot.add(batMesh);

  // Cleated stubby chibi feet with team stirrups
  const shoeMat = createToonMaterial(initial.team.secondary);
  const shoeGeo = new THREE.CapsuleGeometry(0.12, 0.16, 6, 12);

  const leftFoot = new THREE.Mesh(shoeGeo, shoeMat);
  leftFoot.rotation.x = Math.PI / 2;
  leftFoot.castShadow = true;
  attachComicOutline(leftFoot, 1.12);
  bodyPivot.add(leftFoot);

  const rightFoot = new THREE.Mesh(shoeGeo, shoeMat);
  rightFoot.rotation.x = Math.PI / 2;
  rightFoot.castShadow = true;
  attachComicOutline(rightFoot, 1.12);
  bodyPivot.add(rightFoot);

  const applyRoleProps = (role: ChibiRole) => {
    batPivot.visible = role === 'batter';
    gloveMesh.visible = role === 'pitcher' || role === 'fielder' || role === 'catcher';
    leftHandMesh.visible = role === 'batter';
    handBall.visible = role === 'pitcher';
    capGroup.rotation.y = role === 'catcher' ? Math.PI : 0;
  };
  applyRoleProps(initial.role);

  const updateAppearance = (options: ChibiRigOptions) => {
    currentOptions = options;
    earMat.color.set(options.traits.skinTone);
    handMat.color.set(options.traits.skinTone);
    hairMat.color.set(options.traits.hairColor);
    capCrownMat.color.set(options.team.primary);
    capBrimMat.color.set(options.team.secondary);
    capBtnMat.color.set(options.team.accent);
    shoeMat.color.set(options.team.secondary);

    const nextTex = createJerseyNumberTexture(
      options.team.primary,
      options.team.secondary,
      options.team.accent,
      options.team.monogram,
      options.jerseyNumber,
    );
    torsoMat.map = nextTex;
    torsoMat.needsUpdate = true;
    jerseyTex.dispose();
    jerseyTex = nextTex;

    applyRoleProps(options.role);
    face.redraw(options.traits, 'happy', false);
  };

  const updatePose = (clip: CharacterAnimClip, timeSec: number, moodOverride?: PortraitMood) => {
    const pose = evaluateCharacterPose(clip, timeSec);

    bodyPivot.position.set(pose.bodyOffset.x, pose.bodyOffset.y, pose.bodyOffset.z);
    bodyPivot.rotation.set(pose.bodyRotation.x, pose.bodyRotation.y, pose.bodyRotation.z);
    bodyPivot.scale.set(pose.scale.x, pose.scale.y, pose.scale.z);

    headPivot.rotation.set(pose.headRotation.x, pose.headRotation.y, pose.headRotation.z);
    leftHandPivot.position.set(pose.leftHand.x, pose.leftHand.y, pose.leftHand.z);
    rightHandPivot.position.set(pose.rightHand.x, pose.rightHand.y, pose.rightHand.z);
    leftFoot.position.set(pose.leftFoot.x, pose.leftFoot.y, pose.leftFoot.z);
    rightFoot.position.set(pose.rightFoot.x, pose.rightFoot.y, pose.rightFoot.z);

    batPivot.rotation.set(
      pose.batRotation.x + pose.batDetachedSpin,
      pose.batRotation.y,
      pose.batRotation.z,
    );
    batPivot.position.y = pose.batDetachedSpin > 0 ? Math.sin(pose.batDetachedSpin * 0.3) * 0.55 : 0;

    // Ground shadow shrinks as player leaps into the air!
    const airFactor = Math.max(0.35, 1 - pose.bodyOffset.y * 0.35);
    shadowMesh.scale.setScalar(airFactor);
    shadowMesh.position.x = pose.bodyOffset.x;
    shadowMesh.position.z = pose.bodyOffset.z;

    // Super power aura pulse
    auraMat.opacity = pose.auraIntensity * 0.72;
    auraMat.color.set(pose.auraColor);
    const auraScale = 1 + Math.sin(timeSec * 12) * 0.12 + pose.auraIntensity * 0.25;
    auraRing.scale.setScalar(auraScale);
    auraRing.visible = pose.auraIntensity > 0.02;

    // Practice sweat drop bob
    sweatDrop.visible = pose.sweatVisible;
    if (pose.sweatVisible) {
      sweatDrop.position.y = 0.26 - ((timeSec * 0.8) % 0.25);
    }

    // Dynamic 90s face expression & blink
    const activeMood = moodOverride ?? pose.expression;
    face.redraw(currentOptions.traits, activeMood, pose.blink);
  };

  const dispose = () => {
    face.dispose();
    jerseyTex.dispose();
  };

  return { root, updatePose, updateAppearance, dispose };
}
