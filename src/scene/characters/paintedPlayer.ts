import { stanceHabit } from '../../engine/simulation/dugoutCalls';
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

// Knob of the horizontal bunt bat in each painted view (x/y in the 256px cel).
const buntKnob = {
  pants: [[61,157], [62,161]], shorts: [[84,157], [92,157]], skirt: [[66,154], [64,145]],
} as const;
const runnerRow = { pants: 0, shorts: 4, skirt: 8 };

export interface PaintedPlayerOptions {
  traits: PortraitTraits;
  team: PortraitTeamColors;
  jerseyNumber: number;
  role: Exclude<PaintedRole, 'runner'>;
  throwsHand?: ThrowsHand;
  batSide?: EffectiveBatSide;
  sprintSpeed?: number;
  reassurePitcher?: boolean;
  quietInfielder?: boolean;
  quietPitcher?: boolean;
  checkedBase?: number;
  battingPreview?: { clip: CharacterAnimClip; time: number };
}

export interface PaintedPlayerRig {
  root: THREE.Group;
  logicalYaw: number;
  updatePose(clip: CharacterAnimClip, time: number, mood?: PortraitMood, camera?: THREE.Vector3Like, caught?: boolean, headfirstSlide?: boolean): void;
  setCatchHeight(offset: number): void;
  preparePlayback():void;
  updateAppearance(options: PaintedPlayerOptions): void;
  dispose(): void;
  batGripAt(clip:CharacterAnimClip,time:number,position:THREE.Vector3Like,camera:THREE.Vector3Like): THREE.Vector3;
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
  const swungGrip = new THREE.Object3D();
  actor.add(swungGrip);
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
  let catchHeight = 0;
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
  // These sheets span pitches and identities. Retain them until the actor's kit changes
  // or the rig is disposed, so a return throw never outruns the uniform texture.
  function playbackSheets() {
    const keys=new Set<string>([front.body,back.body,front.head,back.head,'baseplays']);
    if (role === 'pitcher') keys.add('stretch');
    if (role==='runner' || role==='batter') {
      for (const key of ['runners','helmet-back','helmet-quarter','welcome',
        'play-front-'+a.bottoms,'play-rear-'+a.bottoms]) keys.add(key);
    } else {
      for (const key of ['receivers','strides',a.bottoms,'rear-'+a.bottoms]) keys.add(key);
    }
    return keys;
  }
  function preparePlayback() {
    for (const key of playbackSheets()) sheet(key);
  }
  let delivery: ReturnType<typeof createPitchDelivery> | undefined;
  function apply(next: PaintedPlayerOptions) {
    opt = next;
    a = resolveAthleteAppearance(next.traits);
    role = baseRunner ? 'runner' : next.role;
    front = paintedSheets(a, role, false);
    back = paintedSheets(a, role, true);
    const keep = playbackSheets();
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
    headfirstSlide = false,
  ) {
    const running = (role === 'runner' || role === 'batter') && (clip === 'field_run' || clip === 'runner_glance');
    const sliding = clip === 'runner_slide' || clip === 'slide_safe';
    const tagging = clip === 'field_tag' && role !== 'catcher';
    const throwing = clip === 'catch_throw';
    const uprightThrow = throwing && time >= .10 && time < .52;
    const popping = uprightThrow || clip === 'catch_point' || clip==='catch_handoff';
    const basePlayPose = sliding || tagging || popping;
    const tapping = clip === 'glove_tap';
    const brim = clip === 'helmet_tip' && time > .28 && time < 1.08;
    const leading = tapping || clip === 'runner_lead' || clip==='runner_push' || (role==='batter' && clip==='celebrate_hr');
    const pitching = role==='pitcher' && ['idle','pitch_gather','pitch_set','pitch_stretch_set','pitch_stretch','pitch_shake_off','pitch_windup','pitch_super','practice_bullpen'].includes(clip);
    const motionRole = running || leading || sliding ? 'runner' : role==='pitcher' && !pitching && clip!=='celebrate_hr' ? 'fielder' : role;
    const stride = clip==='field_run' && !running;
    if (delivery) {
      const parent = pitching ? delivery.wrist : actor;
      if (ball.parent !== parent) parent.add(ball);
      if (pitching) ball.position.set(0,-.008,.033);
    }
    if (camera) {
      const dx = camera.x - root.position.x, dz = camera.z - root.position.z;
      billboard.rotation.y = Math.atan2(dx, dz);
      // The two batting paintings are views along the pitch lane: chest toward
      // the plate in both, helmet looking over the lead shoulder at the mound.
      rear = motionRole === 'batter' ? dz > 0 : dx * Math.sin(rig.logicalYaw) + dz * Math.cos(rig.logicalYaw) < 0;
    }
    if (clip==='slide_safe') rear=false;
    const homeTag = clip === 'field_tag' && role === 'catcher';
    const heldCatch = homeTag || clip === 'catch_frame';
    const frame = paintedMotion(motionRole, heldCatch ? 'catch_receive' : clip === 'runner_glance' ? 'field_run' : clip, heldCatch ? .22 : time);
    // Carry the held stance into the first few frames of the action, including the barrel and grip.
    if (opt.battingPreview && role === 'batter' && (clip === 'bat_swing' || clip === 'bat_bomb' || clip === 'bat_take' || clip === 'bat_square') && time < .18) {
      const u = THREE.MathUtils.smoothstep(time,0,.18);
      const from = paintedMotion('batter',opt.battingPreview.clip,opt.battingPreview.time);
      for (const k of ['lean','shift','squash','tilt','stanceWidth','gripChoke','barrelAngle','bodyTurn'] as const) {
        frame[k] = THREE.MathUtils.lerp(from[k],frame[k],u);
      }
      if (u < .5) frame.cel = from.cel;
    }
    if (clip === 'catch_frame') {
      frame.tilt += .035 * Math.sin(Math.PI * Math.min(1, time / .32));
    }
    if (clip==='catch_target' || (role === 'catcher' && opt.reassurePitcher && clip === 'field_ready')) {
      frame.cel=5;
      frame.squash=.018;
      if (opt.reassurePitcher) {
        const beat = time % 3.4;
        if (beat < .16 || (beat >= .33 && beat < .49)) frame.cel = 4;
      }
      if (a.glasses !== 'none') {
        // A brief nod into the mask as the receiver sets the target.
        const beat = Math.min(1,((time + opt.traits.seed % 5 * .13) % 3.8) / .52);
        frame.tilt -= .14*Math.sin(Math.PI*beat);
      }
    }
    if (clip === 'pitch_fist_pump') {
      const drive = Math.sin(Math.PI*Math.min(1,time/CLIP_DURATIONS.pitch_fist_pump));
      frame.cel = drive > .30 ? 6 : 8;
      frame.shift = .09*drive;
      frame.lean = -.16*drive;
      frame.hop = .065*drive;
      frame.tilt = .10*drive;
      frame.expression = 2;
    }
    if (clip === 'pitch_salute') {
      const lift = Math.sin(Math.PI * Math.min(1,time/CLIP_DURATIONS.pitch_salute));
      frame.cel = lift > .38 ? 6 : 8;
      frame.shift = -.035*lift;
      frame.lean = .055*lift;
      frame.tilt = -.075*lift;
    }
    if (stride) frame.cel = runnerRow[a.bottoms] + (rear?2:0) + Number(time%CLIP_DURATIONS.field_run >= CLIP_DURATIONS.field_run/2);
    if (homeTag) frame.squash = .20;
    const plantedRunner = motionRole === 'runner' && !running && !sliding;
    if (plantedRunner) {
      frame.cel += (rear ? 2 : 0) + runnerRow[a.bottoms];
      if (clip==='runner_lead' && (opt.sprintSpeed ?? 0) >= 65) {
        const cycle = (time + opt.traits.seed % 8 * .19) % 3.2;
        const tap = Math.sin(Math.PI * Math.min(1,cycle/.50)) ** 2;
        frame.lean -= .14 + .055*tap;
        frame.cel = runnerRow[a.bottoms] + (rear ? 2 : 0) + Number(tap>.4);
        frame.shift += .06*tap;
      }
      if (clip==='runner_push') {
        const push=Math.min(1,time/.19);
        frame.lean=-.18+.09*push; frame.squash=.08*(1-push); frame.shift=.095*push;
      }
    }
    if (basePlayPose) {
      frame.cel = runnerRow[a.bottoms] + (sliding ? 0 : tagging ? 1 : time < .30 ? 2 : 3);
      if (clip==='slide_safe') frame.cel=12+runnerRow[a.bottoms];
      if (clip==='catch_point') frame.cel=13+runnerRow[a.bottoms]+Number(rear);
      if (clip==='catch_handoff') frame.cel=15+runnerRow[a.bottoms];
      frame.hop = 0;
      frame.tilt = sliding ? -.14 : tagging ? .15 : -.08;
      const gather = Math.max(0, 1-time/.26);
      frame.lean = tagging ? .19*gather*(rear ? -1 : 1) : 0;
      frame.squash = tagging ? -.09*gather : 0;
      frame.shift = 0;
    }
    if (throwing && !uprightThrow) frame.cel = 5;
    const style = motionRole==='runner' && role==='batter' && sliding ? paintedSheets(a,'runner',rear) : rear ? back : front;
    const view = rear ? 'rear' : 'front';
    const receiving = clip === 'field_receive' || clip === 'field_pop';
    if (receiving) frame.cel = runnerRow[a.bottoms]+Number(rear)+(clip==='field_pop'?2:0);

    const flip = motionRole === 'runner' ? 1 : (role === 'batter' ? opt.batSide : opt.throwsHand) === 'L' ? -1 : 1;
    const width = 0.61 + BUILD_WIDTH[a.build] * 0.39;
    const height = STATURE_SCALE[a.stature];
    const floor = role === 'pitcher' ? 0.065 : 0.012;
    let pitchSheet: 'stretch' | typeof front.body = style.body;
    if (pitching && delivery) {
      delivery.root.position.y = floor;
      delivery.root.rotation.y = rig.logicalYaw;
      delivery.root.scale.set(flip * height * width, height, height);
      const stretch = clip === 'pitch_stretch_set' || clip === 'pitch_stretch' || (clip === 'pitch_shake_off' && Boolean(opt.checkedBase));
      const paint = delivery.pose(frame.pitchPhase, a.pitchingMotion, a.bottoms, stretch, rear);
      frame.cel = paint.cel;
      pitchSheet = paint.sheet;
    }
    const cheering = clip==='celebrate_hr' && (role==='runner' || role==='batter');
    if (cheering) {
      frame.cel=runnerRow[a.bottoms];
      frame.hop=.20*Math.abs(Math.sin(time*5.4));
      frame.tilt=.09*Math.sin(time*5.4);
    }
    if (tapping) {
      frame.cel = runnerRow[a.bottoms] + 1;
      frame.expression = 2;
      frame.shift = 0;
      frame.squash = 0;
    }
    if (brim) {
      frame.cel = runnerRow[a.bottoms] + 2;
      frame.tilt = .16 * Math.sin(Math.PI * (time - .28) / .80);
    }
    if (clip === 'rail_lean') {
      frame.cel = runnerRow[a.bottoms] + 1;
      const leanOver = THREE.MathUtils.smoothstep(time, 0, .46);
      frame.lean = -.19 * leanOver;
      frame.shift = .12 * leanOver;
      frame.tilt = -.08 * leanOver;
    }
    const moundReady = role === 'pitcher' && clip === 'field_ready';
    const bodySheet = moundReady ? `play-${view}-${a.bottoms}` as const : cheering || tapping || brim || clip === 'rail_lean' ? 'welcome' : basePlayPose ? 'baseplays' : receiving ? 'receivers' : stride ? 'strides' : running ? `play-${view}-${a.bottoms}` as const
      : leading ? 'runners' : (clip === 'field_throw' || (role === 'pitcher' && !pitching)) ? (rear ? `rear-${a.bottoms}` as const : a.bottoms) : pitchSheet;
    const registration = bodySheet==='welcome' ? (brim ? [126,92,99,138] : tapping || clip === 'rail_lean' ? [126,92,235,113] : [126,92,40,54]) : anchors[bodySheet][frame.cel];
    const [nx,ny,contactX,contactY]=registration;
    if (throwing) {
      // Keep the neck on a continuous rise-and-fall curve across the crouch and throw paintings.
      const reach = THREE.MathUtils.smoothstep(time,0,.27) * (1-THREE.MathUtils.smoothstep(time,.33,.60));
      const target = anchors[style.body][5];
      const chinHeight = (neckY: number) => (249-neckY-8)*.0057 + 72*.00455;
      frame.squash = 1-(chinHeight(target[1])*.982 + .16*reach)/chinHeight(ny);
      frame.lean = .05 * reach;
      frame.tilt = -.07 * reach;
    }
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
    const rows = basePlayPose ? 6 : 3;
    bodyMat.uniforms.rows.value = rows;
    bodyMat.uniforms.stanceWidth.value = frame.stanceWidth;
    bodyMat.uniforms.cell.value.set(frame.cel % 4, rows-1-Math.floor(frame.cel/4));
    headMat.uniforms.cell.value.set(faceCell % 4, 2 - Math.floor(faceCell / 4));
    headMat.uniforms.maskHelmet.value = Number(role === 'catcher');
    // Looking directly down a basepath, a tiny camera sway must not reverse the face.
    const travelSide = Math.abs(acrossScreen) > .14 ? acrossScreen : Math.sin(rig.logicalYaw);
    const followsHeading = clip === 'catch_handoff' || motionRole === 'runner';
    // The slide painting has a trailing bare hand opposite its extended cleat.
    // On a pickoff, lead with that hand and roll the shoulder down toward the bag.
    const travelFlip = (travelSide < 0 ? -1 : 1) * (headfirstSlide ? -1 : 1);
    const actorFlip = followsHeading ? travelFlip : (tagging || popping) && rear ? -flip : flip;
    const unit = role === 'pitcher' || plantedRunner || clip === 'field_throw' ? 0.0047 : 0.0057;
    bat.barrel.visible = role === 'batter' && !running && !leading && !sliding && (frame.cel < 2 || brim);
    if (bat.barrel.visible) {
      bat.place(rear, contactX, contactY, unit, width, frame.barrelAngle, frame.gripChoke);
      if (brim) bat.barrel.rotation.z = (rear ? -1 : 1) * 2.29;
    }
    const headUnit = 0.00455 * (a.headShape === 'chubby' ? 1.05 : 1);
    const rotationSign = rear ? -1 : 1;
    // The wall gives the climber a foothold above the track. Keep the shadow on the dirt.
    const wallLift = clip === 'field_high_jump' ? Math.max(0, root.position.y - .04) : 0;
    billboard.position.set(0, floor + frame.hop * height + .75 * wallLift, 0);
    shadow.position.y = (role === 'pitcher' ? .064 : .013) - wallLift;
    if (pitching && delivery) billboard.position.copy(delivery.root.position);
    shadow.position.x = billboard.position.x * .6;
    shadow.position.z = billboard.position.z * .6;
    actor.position.x = actorFlip * rotationSign * frame.shift;
    actor.rotation.y = actorFlip * rotationSign * frame.bodyTurn;
    actor.rotation.z = actorFlip * rotationSign * frame.lean - (running ? .10 * acrossScreen : 0);
    if (headfirstSlide) actor.rotation.z += actorFlip * .52;
    actor.scale.set(actorFlip * height * (1 + frame.squash * 0.45), height * (1 - frame.squash), 1);
    // At contact the illustrated barrel reaches across the plate in either camera.
    const swingMirror = role === 'batter' && !rear && !running && !leading && !sliding && !brim && frame.cel >= 2 ? -1 : 1;
    body.scale.set(swingMirror * 256 * unit * width, 256 * unit, 1);
    body.position.set(0, 121 * unit, 0.018);
    body.geometry = pitching && delivery ? delivery.geometry : quad;
    if (pitching && delivery) {
      delivery.fitGrip(body, registration, frame.pitchPhase);
    }
    if (!brim && role==='batter' && frame.cel>=2 && !running && !leading) {
      // Hands painted into the swing and bunt cels, measured wrist-to-wrist.
      const grip = frame.cel===3 ? buntKnob[a.bottoms][Number(rear)] : a.bottoms==='pants' ? [146,rear?126:137] :
        a.bottoms==='shorts' ? [143,rear?129:130] : [140,rear?122:122];
      swungGrip.position.set(swingMirror*(grip[0]-128)*unit*width,(249-grip[1])*unit,.04);
    }
    nearArm.scale.copy(body.scale);
    nearArm.position.set(0, body.position.y, 0.063);
    nearArm.visible = !tapping && !cheering && !basePlayPose && !pitching && role !== 'runner';
    bodyMat.uniforms.collar.value.set(nx / 256, 1 - ny / 256);
    const neckSeat = role === 'pitcher' ? 12 : 8;
    headJoint.position.set(swingMirror * (nx - 128) * unit * width, (249 - ny - neckSeat) * unit, 0.032);
    headJoint.rotation.z = rotationSign * frame.tilt;
    if (clip === 'catch_frame') headJoint.position.y -= .035 * Math.sin(Math.PI * Math.min(1, time / .32));
    bodyMat.uniforms.sleeve.value.set(role === 'pitcher' ? 0 : frame.glovePat, rear ? .59 : .46);
    const habit = stanceHabit(opt.traits.seed, role === 'pitcher', opt.quietPitcher);
    if (clip === 'bat_stance') {
      // Each player keeps a quiet pre-pitch habit through changes of club or uniform.
      const beat = Math.pow(Math.max(0,Math.sin(time*3.6 + (opt.traits.seed % 13))),4);
      if (habit === 'nod') {
        headJoint.rotation.z += .085 * beat;
        bodyMat.uniforms.sleeve.value.x = beat * (rear ? -1 : 1);
      }
      else if (habit === 'tap' && bat.barrel.visible) {
        // Two taps from the painted grip down toward the plate, then back over the shoulder.
        const cycle = (time + Math.abs(opt.traits.seed % 5) * .17) % 3.6;
        const tap = (start: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, (cycle - start) / .52))) ** 2;
        bat.barrel.rotation.z += (rear ? -1 : 1) * 2.05 * (tap(.10) + tap(.70));
      }
      else actor.position.x += .085 * beat * actorFlip;
    }
    const roll = clip === 'pitch_set' && (habit === 'rub' || habit === 'roll');
    if (clip === 'pitch_gather') {
      const close = THREE.MathUtils.smoothstep(time, .18, .92);
      ball.position.set(.027 * (1-close), -.024 + .018*close, .07-.10*close);
      const rub = opt.quietPitcher ? Math.sin(time * 16) * (1 - close) : 0;
      ball.position.x += .025 * rub;
      ball.rotation.x = close * 2 + rub;
      frame.held = close < .97;
    }
    if (pitching) {
      const gather = Math.min(1, frame.pitchPhase / .24);
      headJoint.position.y -= .038 * Math.sin(Math.PI * gather);
      const rollPhase = roll ? Math.min(time % CLIP_DURATIONS.pitch_set, 1.3) : Math.min(frame.pitchPhase, .58);
      ball.rotation.z = (opt.traits.seed % 2 ? 1 : -1) * rollPhase * 9;
    }
    if (clip === 'pitch_set' && habit === 'rub') ball.position.x += .035 * Math.sin(time * 16);
    if (clip === 'pitch_set' && habit === 'set') actor.scale.y *= 1.045;
    if (sliding) headJoint.rotation.z = actorFlip * (clip==='slide_safe' ? -.14 : .12);

    if (clip === 'runner_glance') {
      headJoint.rotation.y = -.47 * actorFlip;
      headJoint.rotation.z += .12 * actorFlip;
    } else {
      // The runner stays on the same world-side of the mound when the camera or arm changes.
      const glanceSide = clip === 'pitch_stretch_set'
        ? (opt.checkedBase === 3 ? -1 : opt.checkedBase === 2 ? 1.15 : 1) * rotationSign * actorFlip : 1;
      const rawHeadTurn = frame.headTurn * glanceSide;
      headJoint.rotation.y = role === 'pitcher'
        ? THREE.MathUtils.clamp(rawHeadTurn, -.24, .24)
        : rawHeadTurn;
    }
    if (role === 'pitcher') {
      // Keep the flat 2D head quad seated squarely on the neck collar; express nods as a subtle dip + tilt.
      headJoint.rotation.x = 0;
      headJoint.position.y -= .018 * frame.nod;
      headJoint.rotation.z += rotationSign * .06 * frame.nod;
    } else {
      headJoint.rotation.x = frame.nod;
    }
    head.scale.set(256 * headUnit, 256 * headUnit, 1);
    head.position.set(0, 72 * headUnit, 0);
    const showDetails = !rear || headSheet === 'helmet-quarter';
    headMat.uniforms.showDetails.value = Number(showDetails);
    const detailMood =
      clip === 'slide_safe' ||
      (opt.quietInfielder && caught && mood === 'happy') ||
      (!style.expressions && mood === 'happy')
        ? 3
        : !style.expressions && mood === 'determined'
          ? 4
          : emotion;
    if (showDetails) detail.paint(a, headSheet, faceCell, detailMood, opt.team.accent);
    const setMitt = role === 'catcher' && ['catch_target','catch_receive','catch_frame'].includes(clip);
    const returnCatch = role === 'pitcher' && clip === 'field_receive';
    const tuck = returnCatch ? -.14 * THREE.MathUtils.smoothstep(time,.18,.46) : 0;
    const lift = setMitt ? catchHeight / (height * (1-frame.squash)) : tuck;
    bodyMat.uniforms.mittLift.value = lift / (256 * unit);
    if (setMitt) {
      headJoint.rotation.z -= catchHeight * .18;
      headJoint.position.y += Math.min(0,catchHeight) * .22;
    }
    bodyMat.uniforms.pocket.value.set(contactX/256, 1-contactY/256,
      caught && clip === 'field_receive' ? Math.max(0, 1-Math.abs(time-(returnCatch ? .16 : .28))/.22) : 0);
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
    if (!pitching) {
      let handX = contactX, handY = contactY;
      if (clip==='field_throw' && time<.19) {
        const pocket = anchors.receivers[runnerRow[a.bottoms]+Number(rear)];
        const u = Math.min(1,time/.19);
        handX = pocket[2]+(contactX-pocket[2])*u;
        handY = pocket[3]+(contactY-pocket[3])*u;
      }
      if (uprightThrow && time<.30) {
        const u=THREE.MathUtils.smoothstep(time,.10,.30);
        const pocket = anchors[style.body][5];
        const startX = rear ? 256-pocket[2] : pocket[2];
        handX=startX+(handX-startX)*u;
        handY=pocket[3]+(handY-pocket[3])*u;
      }
      ball.position.set(swingMirror*(handX-128)*unit*width,(249-handY)*unit+lift,rear ? -.045 : .075);
    }
    ball.visible = (roll && time % CLIP_DURATIONS.pitch_set < 1.3) || frame.held || (caught && !pitching);
    shadow.scale.set((0.8 - frame.hop * 0.33) * width * height, (0.42 - frame.hop * 0.2) * height, 1);
  }
  const rig: PaintedPlayerRig = {
    root,
    logicalYaw,
    updatePose: pose,
    setCatchHeight(offset) { catchHeight = offset; },
    updateAppearance: apply,
    preparePlayback,
    batGripAt(clip,time,position,camera) {
      const original=root.position.clone();
      root.position.copy(position);
      pose(clip,time,undefined,camera);
      const grip=bat.barrel.visible ? bat.barrel.getWorldPosition(new THREE.Vector3()) :
        swungGrip.getWorldPosition(new THREE.Vector3());
      root.position.copy(original);
      return grip;
    },
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
