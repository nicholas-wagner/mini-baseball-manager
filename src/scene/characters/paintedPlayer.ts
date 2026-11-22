import { createPitchDelivery } from './pitchDelivery';
import { createPaintedBat } from './paintedBat';
import * as THREE from 'three';
import anchors from '../../art/miniPlayers/anchors.json';
import { paintedSheets, type PaintedRole } from '../../art/miniPlayers/paintedLook';
import { BUILD_WIDTH, resolveAthleteAppearance, STATURE_SCALE } from '../../art/portraits/athleteAppearance';
import type { PortraitMood } from '../../art/portraits/types';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE, type CharacterAnimClip } from './animationState';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
import type { PortraitTeamColors, PortraitTraits } from '../../art/portraits/types';
import { createBaseballTexture, HELD_BALL_RADIUS } from '../vfx/ballFlightVisual';
import { acquirePaint, paintedMaterial, releasePaint, setInks } from './paintedMaterial';
import { paintedMotion } from './paintedMotion';
import { createFaceDetails } from './paintedDetails';

const runnerRow = { pants: 0, shorts: 4, skirt: 8 };

export interface PaintedPlayerOptions {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: Exclude<PaintedRole, 'runner'>;
  throwsHand?: ThrowsHand;
  batSide?: EffectiveBatSide;
}

export interface PaintedPlayerRig {
  root: THREE.Group;
  logicalYaw: number;
  updatePose(clip: CharacterAnimClip, time: number, mood?: PortraitMood, camera?: THREE.Vector3Like, caught?: boolean): void;
  updateAppearance(options: PaintedPlayerOptions): void;
  dispose(): void;
  releasePoint(clip: CharacterAnimClip): THREE.Vector3;
  contactAt(
    clip: CharacterAnimClip,
    time: number,
    position: THREE.Vector3Like,
    camera: THREE.Vector3Like,
  ): THREE.Vector3;
}

export function createPaintedPlayerRig(
  initial: PaintedPlayerOptions,
  logicalYaw = 0,
  baseRunner = false,
): PaintedPlayerRig {
  const root = new THREE.Group(),
    billboard = new THREE.Group(),
    actor = new THREE.Group(),
    headJoint = new THREE.Group();
  root.add(billboard);
  billboard.add(actor);
  actor.add(headJoint);
  const quad = new THREE.PlaneGeometry(1, 1);
  const bodyMat = paintedMaterial(false),
    headMat = paintedMaterial(true);
  const body = new THREE.Mesh(quad, bodyMat),
    head = new THREE.Mesh(quad, headMat);
  head.name = 'painted head';
  // Lift just the raised glove or throwing arm over the face. The chin covers
  // the neck registration mark while the hand can pass in front of the brim.
  const nearMat = bodyMat.clone();
  nearMat.uniforms = { ...bodyMat.uniforms, nearLimb: { value: 1 } };
  const nearArm = new THREE.Mesh(quad, nearMat);
  actor.add(body, nearArm);
  headJoint.add(head);
  const bat = createPaintedBat();
  actor.add(bat.barrel);
  const detail = createFaceDetails();
  headMat.uniforms.details.value = detail.texture;
  const label = document.createElement('canvas');
  label.width = 128;
  label.height = 64;
  const numberTex = new THREE.CanvasTexture(label);
  numberTex.colorSpace = THREE.SRGBColorSpace;
  const labelMat = new THREE.MeshBasicMaterial({
    map: numberTex,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });
  const number = new THREE.Mesh(quad, labelMat);
  actor.add(number);
  const ballTex = createBaseballTexture();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(HELD_BALL_RADIUS, 16, 12),
    new THREE.MeshBasicMaterial({ map: ballTex }),
  );
  ball.name = 'held baseball';
  actor.add(ball);
  const shadowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader:
      'varying vec2 p; void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec2 p;void main(){gl_FragColor=vec4(.14,.08,.06,.31*(1.-smoothstep(.08,1.,length(p))));}',
  });
  const shadow = new THREE.Mesh(quad, shadowMat);
  root.add(shadow);
  shadow.rotation.x = -Math.PI / 2;
  let opt = initial,
    a = resolveAthleteAppearance(opt.traits);
  let role: PaintedRole = baseRunner ? 'runner' : opt.role;
  let front = paintedSheets(a, role, false),
    back = paintedSheets(a, role, true);
  body.name = 'painted uniform';
  let rear = false,
    mark = '';
  const loaded = new Map<string, THREE.Texture>();
  function sheet(key: string) {
    let t = loaded.get(key);
    if (!t) {
      t = acquirePaint(key);
      loaded.set(key, t);
    }
    return t;
  }
  let delivery: ReturnType<typeof createPitchDelivery> | undefined;
  function apply(next: PaintedPlayerOptions) {
    opt = next;
    a = resolveAthleteAppearance(next.traits);
    role = baseRunner ? 'runner' : next.role;
    front = paintedSheets(a, role, false);
    back = paintedSheets(a, role, true);
    const keep = new Set([front.head, back.head, front.body, back.body]);
    if (role === 'pitcher') {
      if (!delivery) {
        delivery = createPitchDelivery();
        root.add(delivery.root);
        delivery.wrist.add(ball);
        ball.position.set(0, -.008, .033);
      }
    } else if (delivery) {
      actor.add(ball);
      root.remove(delivery.root);
      body.geometry = quad;
      delivery.geometry.dispose();
      delivery = undefined;
    }
    for (const key of loaded.keys())
      if (!keep.has(key)) {
        releasePaint(key);
        loaded.delete(key);
      }
    setInks(headMat, a, opt.team);
    setInks(bodyMat, a, opt.team);
    shadow.position.y = role === 'pitcher' ? 0.064 : 0.013;
    mark = '';
  }
  function drawNumber(text: string) {
    const key = text + '|' + opt.team.secondary;
    if (key === mark) return;
    mark = key;
    const ctx = label.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = opt.team.secondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 56px sans-serif';
    ctx.fillText(text, 64, 34, 120);
    numberTex.needsUpdate = true;
  }
  function pose(
    clip: CharacterAnimClip,
    time: number,
    mood?: PortraitMood,
    camera?: THREE.Vector3Like,
    caught = false,
  ) {
    const running = (role === 'runner' || role === 'batter') && clip === 'field_run';
    const leading = clip === 'runner_lead';
    const motionRole = running || leading ? 'runner' : role;
    if (camera) {
      const dx = camera.x - root.position.x, dz = camera.z - root.position.z;
      billboard.rotation.y = Math.atan2(dx, dz);
      // The two batting paintings are views along the pitch lane: chest toward
      // the plate in both, helmet looking over the lead shoulder at the mound.
      rear = motionRole === 'batter' ? dz > 0 : dx * Math.sin(rig.logicalYaw) + dz * Math.cos(rig.logicalYaw) < 0;
    }
    const frame = paintedMotion(motionRole, clip, time);
    if (motionRole === 'runner' && !running) {
      frame.cel += (rear ? 2 : 0) + runnerRow[a.bottoms];
    }
    const style = rear ? back : front;
    const view = rear ? 'rear' : 'front';
    const receiving = clip === 'field_receive' || clip === 'field_pop';
    if (receiving) frame.cel += runnerRow[a.bottoms] + Number(rear);
    const pitching = motionRole === 'pitcher' && clip !== 'celebrate_hr';
    const flip = motionRole === 'runner' ? 1 : (role === 'batter' ? opt.batSide : opt.throwsHand) === 'L' ? -1 : 1;
    const width = 0.61 + BUILD_WIDTH[a.build] * 0.39;
    const height = STATURE_SCALE[a.stature];
    const floor = role === 'pitcher' ? 0.065 : 0.012;
    if (pitching && delivery) {
      delivery.root.position.y = floor;
      delivery.root.rotation.y = rig.logicalYaw;
      delivery.root.scale.set(flip * height * width, height, height);
      frame.cel = delivery.pose(frame.pitchPhase, a.pitchingMotion, a.bottoms);
    }
    const bodySheet = receiving ? 'receivers' : running ? `play-${view}-${a.bottoms}` as const
      : leading ? 'runners' : (clip === 'field_throw' || (role === 'pitcher' && !pitching)) ? (rear ? `rear-${a.bottoms}` as const : a.bottoms) : style.body;
    const [nx, ny, contactX, contactY] = anchors[bodySheet][frame.cel];
    const emotion = mood
      ? mood === 'happy'
        ? 0
        : mood === 'fired_up' || mood === 'shocked'
          ? 2
          : 1
      : frame.expression;
    const faceCell = style.headCell + (style.expressions ? emotion * 4 : 0);
    bodyMat.uniforms.sheet.value = sheet(bodySheet);
    const acrossScreen = Math.sin(rig.logicalYaw - billboard.rotation.y);
    const headSheet = motionRole === 'runner' && rear
      ? Math.abs(acrossScreen) > .34 ? 'helmet-quarter' : 'helmet-back'
      : style.head;
    headMat.uniforms.sheet.value = sheet(headSheet);
    bodyMat.uniforms.cell.value.set(frame.cel % 4, 2 - Math.floor(frame.cel / 4));
    headMat.uniforms.cell.value.set(faceCell % 4, 2 - Math.floor(faceCell / 4));
    headMat.uniforms.maskHelmet.value = Number(role === 'catcher');
    // Looking directly down a basepath, a tiny camera sway must not reverse the face.
    const travelSide = Math.abs(acrossScreen) > .14 ? acrossScreen : Math.sin(rig.logicalYaw);
    const actorFlip = motionRole === 'runner' ? (travelSide < 0 ? -1 : 1) : flip;
    const unit = role === 'pitcher' || (motionRole === 'runner' && !running) || clip === 'field_throw' ? 0.0047 : 0.0057;
    bat.barrel.visible = role === 'batter' && !running && !leading && frame.cel < 2;
    if (bat.barrel.visible) bat.place(frame.cel, rear, contactX, contactY, unit, width, time);
    const headUnit = 0.00455 * (a.headShape === 'chubby' ? 1.05 : 1);
    const rotationSign = rear ? -1 : 1;
    billboard.position.set(0, floor + frame.hop * height, 0);
    if (pitching && delivery) billboard.position.copy(delivery.root.position);
    shadow.position.x = billboard.position.x * .6;
    shadow.position.z = billboard.position.z * .6;
    actor.position.x = actorFlip * rotationSign * frame.shift;
    actor.rotation.z = actorFlip * rotationSign * frame.lean - (running ? .10 * acrossScreen : 0);
    actor.scale.set(actorFlip * height * (1 + frame.squash * 0.45), height * (1 - frame.squash), 1);
    // At contact the illustrated barrel reaches across the plate in either camera.
    const swingMirror = role === 'batter' && !rear && !running && !leading && frame.cel >= 2 ? -1 : 1;
    body.scale.set(swingMirror * 256 * unit * width, 256 * unit, 1);
    body.position.set(0, 121 * unit, 0.018);
    body.geometry = pitching && delivery ? delivery.geometry : quad;
    if (pitching && delivery) {
      delivery.fitGrip(body, anchors[bodySheet][frame.cel], frame.pitchPhase);
    }
    nearArm.scale.copy(body.scale);
    nearArm.position.set(0, body.position.y, 0.063);
    nearArm.visible = !pitching && role !== 'runner';
    bodyMat.uniforms.collar.value.set(nx / 256, 1 - ny / 256);
    headJoint.position.set(swingMirror * (nx - 128) * unit * width, (249 - ny - 8) * unit, 0.032);
    headJoint.rotation.z = rotationSign * frame.tilt;
    head.scale.set(256 * headUnit, 256 * headUnit, 1);
    head.position.set(0, 72 * headUnit, 0);
    const showDetails = (!rear || headSheet === 'helmet-quarter') && role !== 'catcher';
    headMat.uniforms.showDetails.value = Number(showDetails);
    if (showDetails) detail.paint(a, headSheet, faceCell, emotion, opt.team.accent);
    number.visible =
      role !== 'catcher' &&
      (role === 'pitcher' || role === 'fielder' || role === 'runner') &&
      (pitching || frame.cel !== 11) &&
      (rear || role !== 'pitcher' || (pitching ? frame.cel % 4 !== 1 : frame.cel !== 1));
    if (number.visible) {
      drawNumber(rear ? String(opt.jerseyNumber) : opt.team.monogram);
      number.scale.set((rear ? 0.22 : 0.095) * actorFlip, 0.105 * (rear ? 1 : 0.7), 1);
      number.position.set(
        (nx - 128 + (rear ? 0 : 13)) * unit * width,
        (249 - ny - (rear ? 33 : 28)) * unit,
        0.024,
      );
    }
    if (!delivery) {
      ball.position.set(swingMirror * (contactX - 128) * unit * width, (249 - contactY) * unit, rear ? -.045 : .075);
    }
    ball.visible = frame.held || ((role === 'catcher' || role === 'fielder') && caught);
    shadow.scale.set((0.8 - frame.hop * 0.33) * width * height, (0.42 - frame.hop * 0.2) * height, 1);
  }
  const rig: PaintedPlayerRig = {
    root,
    logicalYaw,
    updatePose: pose,
    updateAppearance: apply,
    releasePoint(clip) {
      pose(clip, CLIP_DURATIONS[clip] * PITCH_RELEASE_PHASE);
      return ball.getWorldPosition(new THREE.Vector3());
    },
    contactAt(clip, time, position, camera) {
      const original = root.position.clone();
      root.position.copy(position);
      pose(clip, time, undefined, camera);
      const pocket = ball.getWorldPosition(new THREE.Vector3());
      root.position.copy(original);
      return pocket;
    },
    dispose() {
      for (const key of loaded.keys()) releasePaint(key);
      loaded.clear();
      delivery?.geometry.dispose();
      bat.dispose();
      quad.dispose();
      bodyMat.dispose();
      nearMat.dispose();
      headMat.dispose();
      detail.texture.dispose();
      numberTex.dispose();
      labelMat.dispose();
      ballTex.dispose();
      ball.geometry.dispose();
      ball.material.dispose();
      shadowMat.dispose();
      root.clear();
    },
  };
  apply(initial);
  pose('idle', 0);
  return rig;
}
