import { labSequence, type LabSequence } from './playback/labSequence';
import { WalkoffTeammates } from './characters/walkoffTeammates';
import { pitchFlightScale } from './vfx/ballFlightVisual';
import { batterBox } from './playback/diamondLayout';
import type { DiamondPlay, DiamondPlayKind } from './playback/diamondPlay';
import type { PitchFlight } from './playback/pitchFlight';
import { renderDiamondPlay, type DiamondCast } from './playback/renderDiamondPlay';
import * as THREE from 'three';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../art/portraits/types';
import { STATURE_SCALE, resolveAthleteAppearance } from '../art/portraits/athleteAppearance';
import { createPortraitTraits } from '../art/portraits/generatePortrait';
import { SAMPLE_TEAM_PALETTES } from '../art/themes/teamPalettes';
import type { EffectiveBatSide, ThrowsHand } from '../engine/handedness/types';
import { createMiniBallpark } from './ballpark/ballparkBuilder';
import {
  computeShakeOffset,
  dampCameraPose,
  getCameraPresetPose,
  type CameraPose,
  type CameraPresetId,
} from './camera/cameraRig';
import { CLIP_DURATIONS, type CharacterAnimClip } from './characters/animationState';
import { createPaintedPlayerRig, type PaintedPlayerRig } from './characters/paintedPlayer';
import { sampleBallTrajectory, type BallVfxStyle } from './vfx/ballTrajectory';
import { createDelivery, MOUND, sampleDeliveryFlight, type ShowcaseDelivery } from './vfx/showcaseDelivery';
import { FIELD_CAMERA_CUT, FIELDER_START, fieldingCamera, isCatchClip, sampleFieldingPlay } from './vfx/fieldingShowcase';
import { createBallparkVfxSystem } from './vfx/vfxSystem';


export interface DesignLabSceneState {
  cameraPreset: CameraPresetId;
  pitcherClip: CharacterAnimClip;
  batterClip: CharacterAnimClip;
  fielderClip: CharacterAnimClip;
  moodOverride?: PortraitMood;
}

export class DesignLabSceneController {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private ballpark: ReturnType<typeof createMiniBallpark>;
  private vfx: ReturnType<typeof createBallparkVfxSystem>;
  private pitcher: PaintedPlayerRig;
  private batter: PaintedPlayerRig;
  private catcher: PaintedPlayerRig;
  private fielder: PaintedPlayerRig;

  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private viewportHeight = 1;
  private motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedSec = 0;
  private cameraPose: CameraPose;
  private cameraPreset: CameraPresetId = 'over_shoulder_pitcher';
  private playStartedAt = 0;
  private queue:DiamondPlay[]=[];
  private fixedBattery=false;
  private welcome:WalkoffTeammates;
  private diamond: DiamondPlay | null = null;
  private replayFielders: Omit<DiamondCast, 'C' | 'P' | 'BAT'> | null = null;
  private fieldTeam: PortraitTeamColors;
  private delivery: ShowcaseDelivery | null = null;
  private callout?: { text: string; color: string };
  private playAccent?: (kind?: DiamondPlayKind) => void;
  private trauma = 0;
  private crowdExcitement = 0.25;
  private turntableOffset = 0;
  private turntableStartedAt = 0;

  private pitcherClip: CharacterAnimClip = 'idle';
  private batterClip: CharacterAnimClip = 'bat_stance';
  private fielderClip: CharacterAnimClip = 'field_ready';
  private moodOverride: PortraitMood | undefined = undefined;
  private pitcherThrows: ThrowsHand = 'R';
  private pitcherSeed: number;
  private batterSide: EffectiveBatSide = 'R';
  private readonly rivalBatterTraits = createPortraitTraits(4412);
  private readonly catcherTraits = createPortraitTraits(3105);
  private readonly fielderTraits = createPortraitTraits(7721);
  private readonly stature = { pitcher: 1, batter: STATURE_SCALE[this.rivalBatterTraits.stature], catcher: STATURE_SCALE[this.catcherTraits.stature] };

  constructor(
    container: HTMLElement,
    initialHeroTraits: PortraitTraits,
    initialHeroTeam: PortraitTeamColors,
    initialJersey: number,
    initialThrows: ThrowsHand = 'R',
  ) {
    this.container = container;
    this.pitcherThrows = initialThrows;
    this.pitcherSeed = initialHeroTraits.seed;
    this.fieldTeam = initialHeroTeam;
    const appearance = resolveAthleteAppearance(initialHeroTraits);
    this.stature.pitcher = STATURE_SCALE[appearance.stature];

    this.scene = new THREE.Scene();
    this.welcome=new WalkoffTeammates(this.scene);
    this.scene.background = new THREE.Color(0x4bb9ee);
    this.scene.fog = new THREE.Fog(0x88dbff, 48, 115);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.viewportHeight = height;
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 180);
    this.cameraPose = this.presetPose();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    // Cap DPR at 2 for crisp Android visuals without killing mobile frame rate
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Bright Saturday-Morning Cartoon Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffbe6, 0x2fb356, 1.15);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7dd, 1.35);
    sunLight.position.set(16, 28, 18);
    this.scene.add(sunLight);

    // Build sunlit 3D ballpark & VFX system
    this.ballpark = createMiniBallpark();
    this.scene.add(this.ballpark.group);

    this.vfx = createBallparkVfxSystem();
    this.scene.add(this.vfx.group);

    // Featured Chibi Pitcher on the Mound (logicalYaw = 0 -> faces +Z toward Home Plate)
    this.pitcher = createPaintedPlayerRig(
      {
        traits: initialHeroTraits,
        team: initialHeroTeam,
        jerseyNumber: initialJersey,
        throwsHand: initialThrows,
        role: 'pitcher',
      },
      0,
    );
    this.pitcher.root.position.copy(MOUND);
    this.scene.add(this.pitcher.root);

    // A hitter stands across the plate and watches the mound over the lead shoulder.
    const rivalTeam = SAMPLE_TEAM_PALETTES[1];
    this.batter = createPaintedPlayerRig(
      {
        traits: this.rivalBatterTraits,
        team: rivalTeam,
        jerseyNumber: 7,
        role: 'batter',
      },
      batterBox('R').yaw,
    );
    this.batter.root.position.copy(batterBox('R').position);
    this.scene.add(this.batter.root);

    // Chibi Catcher behind Home Plate (logicalYaw = PI -> faces -Z toward Pitcher)
    this.catcher = createPaintedPlayerRig(
      {
        traits: this.catcherTraits,
        team: initialHeroTeam,
        jerseyNumber: 2,
        role: 'catcher',
      },
      Math.PI,
    );
    this.catcher.root.position.set(0, 0.04, 1.12);
    this.scene.add(this.catcher.root);

    // Chibi Center-Right Fielder ready to dive or Sky-High Leap! (logicalYaw = 0 -> faces +Z toward Home)
    this.fielder = createPaintedPlayerRig(
      {
        traits: this.fielderTraits,
        team: initialHeroTeam,
        jerseyNumber: 19,
        role: 'fielder',
      },
      0,
    );
    this.fielder.root.position.copy(FIELDER_START);
    this.scene.add(this.fielder.root);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  private replayCast(): DiamondCast {
    if (!this.replayFielders) {
      const make = (seed: number, jersey: number, runner = false) => {
        const rig = createPaintedPlayerRig({ traits: createPortraitTraits(seed), role: 'fielder', throwsHand: 'R',
          team: runner ? SAMPLE_TEAM_PALETTES[1] : this.fieldTeam, jerseyNumber: jersey }, 0, runner);
        this.scene.add(rig.root);
        return rig;
      };
      this.replayFielders = { SS: make(8107, 6), '2B': make(8108, 4), '1B': make(8110, 3),
        '3B': make(8113, 5), LF: make(8115, 7), CF: make(8116, 8), RF: make(8117, 9), RUN: make(8114, 22, true) };
    }
    return { ...this.replayFielders, C: this.catcher, P: this.pitcher, BAT: this.batter };
  }

  private endDiamondReplay() {
    if (!this.diamond) return;
    this.diamond = null;
    this.queue=[];
    this.fixedBattery=false;
    this.welcome.hide();
    this.pitcher.root.position.copy(MOUND);
    this.pitcher.logicalYaw=0;
    this.catcher.root.position.set(0,.04,1.12);
    this.catcher.logicalYaw = Math.PI;
    if (this.replayFielders) for (const rig of Object.values(this.replayFielders)) rig.root.visible = false;
    this.fielder.root.visible = true;
    const box = batterBox(this.batterSide);
    this.batter.logicalYaw = box.yaw;
    this.batter.root.position.copy(box.position);
    this.vfx.clear();
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.viewportHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private presetPose(): CameraPose {
    const time = this.cameraPreset === 'showcase_closeup' ? this.elapsedSec - this.turntableStartedAt : this.elapsedSec;
    return getCameraPresetPose(this.cameraPreset, time, this.turntableOffset, this.pitcherThrows, this.batterSide);
  }

  setCameraPreset(preset: CameraPresetId): void {
    if (preset === this.cameraPreset) return;
    this.endDiamondReplay();
    const leavingCloseUp = this.cameraPreset === 'showcase_closeup' || this.cameraPreset === 'mound_portrait';
    this.cameraPreset = preset;
    if (preset === 'showcase_closeup') {
      this.turntableStartedAt = this.elapsedSec;
      this.turntableOffset = 0;
    }
    // A direct cut avoids traveling through the featured player at the mound.
    if (leavingCloseUp || preset === 'showcase_closeup' || preset === 'mound_portrait') this.cameraPose = this.presetPose();
  }

  nudgeTurntable(deltaRad: number): void {
    this.turntableOffset += deltaRad;
  }

  setHeroAppearance(
    traits: PortraitTraits,
    team: PortraitTeamColors,
    jerseyNumber: number,
    pitcherThrows: ThrowsHand = 'R',
    batterSide: EffectiveBatSide = 'R',
  ): void {
    const appearance = resolveAthleteAppearance(traits);
    const height = STATURE_SCALE[appearance.stature];
    const changedHeight = height !== this.stature.pitcher;
    this.stature.pitcher = height;
    const changedPitcher = traits.seed !== this.pitcherSeed;
    const changedHand = pitcherThrows !== this.pitcherThrows;
    this.pitcherSeed = traits.seed;
    if (this.delivery && (changedPitcher || changedHeight || changedHand || batterSide !== this.batterSide)) {
      this.playStartedAt = this.elapsedSec;
      this.vfx.clear();
      const style = (this.delivery.hit ?? this.delivery.pitch).style;
      this.delivery = createDelivery(style, pitcherThrows, batterSide, this.pitcherClip, this.batterClip,
        this.stature, this.delivery.pitch.pitchFlight);
    }
    if (this.fieldTeam !== team && this.replayFielders) {
      this.endDiamondReplay();
      for (const rig of Object.values(this.replayFielders)) { this.scene.remove(rig.root); rig.dispose(); }
      this.replayFielders = null;
    }
    this.fieldTeam = team;
    this.pitcherThrows = pitcherThrows;
    this.batterSide = batterSide;
    if (changedHand) this.cameraPose = this.presetPose();
    const hero = { traits, team, jerseyNumber, role: 'pitcher' as const, throwsHand: pitcherThrows };
    this.pitcher.updateAppearance(hero);
    // Position opposing batter in 3rd-base box (-X) for RHB or 1st-base box (+X) for LHB!
    const box = batterBox(batterSide);
    this.batter.logicalYaw = box.yaw;
    this.batter.root.position.copy(box.position);
    this.batter.updateAppearance({
      traits: this.rivalBatterTraits,
      team: SAMPLE_TEAM_PALETTES[1],
      jerseyNumber: 7,
      role: 'batter',
      batSide: batterSide,
    });
    this.catcher.updateAppearance({
      traits: this.catcherTraits,
      team,
      jerseyNumber: 2,
      role: 'catcher',
      throwsHand: 'R',
    });
    this.fielder.updateAppearance({
      traits: this.fielderTraits,
      team,
      jerseyNumber: 19,
      role: 'fielder',
      throwsHand: pitcherThrows,
    });
  }

  setCalloutsVisible(visible: boolean) { this.vfx.setCalloutsVisible(visible); }

  setMoodOverride(mood: PortraitMood | undefined): void {
    this.moodOverride = mood;
  }

  setAnimationClips(state: Partial<DesignLabSceneState>): void {
    if (state.cameraPreset) this.setCameraPreset(state.cameraPreset);
    if (state.pitcherClip) this.pitcherClip = state.pitcherClip;
    if (state.batterClip) this.batterClip = state.batterClip;
    if (state.fielderClip) this.fielderClip = state.fielderClip;
    if ('moodOverride' in state) this.moodOverride = state.moodOverride;
  }

  triggerShowcaseAction(
    ballStyle: BallVfxStyle | null,
    callout?: { text: string; color: string; y?: number; z?: number },
    onAccent?: (kind?: DiamondPlayKind) => void,
    kind?: LabSequence,
    pitchInfo?: PitchFlight,
  ): void {
    this.endDiamondReplay();
    this.vfx.clear();
    if (kind) {
      this.delivery = null;
      this.queue=labSequence(kind);
      this.fixedBattery=kind==='battery_reel';
      this.playAccent=onAccent;
      this.startDiamond(this.queue.shift()!);
      return;
    }
    this.fielder.root.position.copy(FIELDER_START);
    this.playStartedAt = this.elapsedSec;
    this.playAccent = onAccent;
    this.callout = callout;
    const practicePitch = ballStyle === 'fastball' && this.pitcherClip === 'practice_bullpen';
    this.delivery = ballStyle
      ? createDelivery(ballStyle, this.pitcherThrows, this.batterSide, this.pitcherClip, this.batterClip,
        this.stature, pitchInfo ?? (practicePitch ? { pitchType: 'four_seam', mph: 92 } : undefined))
      : null;
    this.trauma = 0;
    if (this.delivery) {
      // Cut to the selected shot before the windup. Interpolating between
      // opposite shoulders would take the camera straight through the infield.
      this.cameraPose = this.presetPose();
    } else if (callout) {
      this.vfx.spawnComicCallout(
        callout.text,
        { x: 0, y: callout.y ?? 2.6, z: callout.z ?? -10.2 },
        callout.color,
      );
      this.crowdExcitement = 0.85;
    }
  }

  private startDiamond(play:DiamondPlay) {
    this.vfx.clear();
    this.diamond=play;
    this.playStartedAt=this.elapsedSec;
    this.fielder.root.visible=false;
    if (play.ending?.kind==='walkoff') {
      this.welcome.set([17,31].map(n=>({traits:createPortraitTraits(6500+n),team:SAMPLE_TEAM_PALETTES[1],jerseyNumber:n,role:'fielder'})));
    }
    for (const [id,rig] of Object.entries(this.replayCast())) {
      rig.preparePlayback();
      rig.root.visible=id!=='RUN' || Boolean(play.scorerBase || play.runnerToThird || play.close?.steal || ['double_play','sac_fly','ball_four'].includes(play.kind));
    }
  }

  private updateDelivery(play: ShowcaseDelivery, t: number, previous: number, target: CameraPose) {
    if (previous < play.releaseAt && t >= play.releaseAt) {
      play.pitch.start = this.pitcher.releasePoint(play.pitcherClip);
    }
    const hit = play.hit;
    if (t <= play.plateAt && !hit) {
      play.pitch.end = this.catcher.contactAt('catch_receive', .3 * CLIP_DURATIONS.catch_receive,
        this.catcher.root.position, this.cameraPose.position);
    } else if (t <= play.plateAt && hit) {
      const contact = this.batter.contactAt(this.batterClip, play.plateAt - play.swingAt,
        this.batter.root.position, this.cameraPose.position);
      play.pitch.end = contact;
      hit.start = contact;
    }
    const fieldClip = hit?.style === 'line_drive' && isCatchClip(this.fielderClip) ? this.fielderClip : null;
    const sinceHit = t - play.plateAt;
    const at = fieldClip && hit ? sampleFieldingPlay(fieldClip, this.pitcherThrows, sinceHit, hit.durationSec) : null;
    if (at && fieldClip && hit) {
      this.fielder.root.position.set(at.x, FIELDER_START.y, at.z);
      if (this.cameraPreset === 'broadcast_diamond' && sinceHit >= FIELD_CAMERA_CUT && sinceHit < hit.durationSec + 1.45) {
        Object.assign(target, fieldingCamera(at.x, at.z, fieldClip === 'field_high_jump'));
        // The outfield camera rides with the runner. Damping its translation
        // here would crop the leading glove on a narrow viewport.
        this.cameraPose = target;
      }
      if (sinceHit >= 0 && sinceHit <= hit.durationSec + 0.05) {
        hit.apexHeight = fieldClip === 'field_dive' ? 2.35 : 3.8;
        const contact = sampleFieldingPlay(fieldClip, this.pitcherThrows, hit.durationSec, hit.durationSec);
        hit.end = this.fielder.contactAt(fieldClip, contact.clipTime,
          {x:contact.x, y:FIELDER_START.y, z:contact.z}, this.cameraPose.position);
      }
      if (at.caught && previous - play.plateAt < hit.durationSec) {
        this.vfx.impact(hit.end, '#FFE29D');
        this.vfx.spawnComicCallout('SNAG!', hit.end, '#FFD166', true);
      }
    }
    const flight = sampleDeliveryFlight(play, t, this.vfx.reducedMotion);
    if (flight) {
      const chasing = fieldClip && flight.spec === hit;
      const progress = chasing ? 1 - Math.pow(1 - flight.progress, 1.35) : flight.progress;
      const scale = flight.spec === play.pitch
        ? pitchFlightScale(progress, this.cameraPreset === 'mound_portrait' ? .27 : .55)
        : chasing ? 1 - .64 * progress : this.cameraPreset === 'mound_portrait' ? .27 : 1;
      this.vfx.ball.draw(flight.spec, progress,
        flight.visual ?? (play.hit && flight.spec === play.pitch ? undefined : this.callout?.color),
        scale);
      if (flight.spec.style === 'moonshot_hr' &&
        (this.cameraPreset === 'over_shoulder_batter' || this.cameraPreset === 'broadcast_diamond')) {
        const ahead = sampleBallTrajectory(flight.spec, flight.progress + 0.105);
        const lift = Math.min(1, 0.12 + flight.progress * 11);
        target.lookAt.y += (ahead.y - 2.4 - target.lookAt.y) * lift;
        target.lookAt.z += (ahead.z - target.lookAt.z) * lift;
        target.lookAt.x += (ahead.x - target.lookAt.x) * lift;
      }
    } else {
      this.vfx.ball.group.visible = false;
    }

    const accentAt = fieldClip && hit ? play.plateAt + hit.durationSec : (play.hit ? play.plateAt : play.releaseAt);
    if (t >= accentAt && previous < accentAt) {
      this.playAccent?.();
      this.crowdExcitement = 0.82;
      this.trauma = (play.hit ?? play.pitch).cameraShake * 0.56;
    }
    if (t >= play.plateAt && previous < play.plateAt) {
      const spec = play.hit ?? play.pitch;
      this.vfx.impact(play.pitch.end, spec.secondaryColor);
      if (!fieldClip) this.vfx.spawnComicCallout(this.callout?.text ?? spec.calloutText, play.pitch.end,
        this.callout?.color ?? spec.trailColor, true);
    }
    return at;
  }

  private updatePlayers(t: number, fielding: ReturnType<typeof sampleFieldingPlay> | null) {
    const play = this.delivery;
    const camera = this.camera.position;
    if (!play) {
      this.pitcher.updatePose(this.pitcherClip, t, this.moodOverride, camera);
      this.batter.updatePose(this.batterClip, t, undefined, camera);
      this.catcher.updatePose('field_ready', t, undefined, camera);
      this.fielder.updatePose(this.fielderClip, t, undefined, camera);
      return;
    }

    const recoverAt = Math.max(CLIP_DURATIONS[play.pitcherClip], play.plateAt + 0.38);
    const pitching = t < recoverAt;
    // Hold the last empty-handed follow-through until the catcher receives it.
    const pitchTime = Math.min(t, CLIP_DURATIONS[play.pitcherClip] - 0.001);
    this.pitcher.updatePose(pitching ? play.pitcherClip : 'idle', pitching ? pitchTime : t - recoverAt,
      this.moodOverride, camera);
    const swing = t - play.swingAt;
    const swinging = swing >= 0 && swing < CLIP_DURATIONS[this.batterClip];
    this.batter.updatePose(swinging ? this.batterClip : 'bat_stance', swinging ? swing : t, undefined, camera);
    const receive = t - play.plateAt;
    const receiveTime = receive + .3 * CLIP_DURATIONS.catch_receive;
    const catching = !play.hit && receiveTime >= 0 && receiveTime < CLIP_DURATIONS.catch_receive;
    this.catcher.updatePose(catching ? 'catch_receive' : 'field_ready', catching ? receiveTime : t,
      undefined, camera, catching && receive >= 0);
    if (fielding) {
      this.fielder.updatePose(fielding.clip, fielding.clipTime, undefined, camera, fielding.caught);
      return;
    }
    this.fielder.updatePose(receive > 0 ? this.fielderClip : 'field_ready', Math.max(0, receive), undefined, camera);
  }

  private loop = (timestamp: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;
    const previousPlayTime = this.elapsedSec - this.playStartedAt;
    this.elapsedSec += dt;

    const steady = Boolean(this.motionPreference?.matches) || document.documentElement.dataset.reducedMotion === 'true';
    if (this.vfx.reducedMotion !== steady) {
      this.vfx.setReducedMotion(steady);
      this.ballpark.setWeather(null, steady);
    }

    // Decay shake & crowd excitement smoothly
    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    this.crowdExcitement = Math.max(0.22, this.crowdExcitement - dt * 0.25);

    // Resolve the camera before selecting front or rear artwork.
    const targetPose = this.presetPose();
    const playTime = this.elapsedSec - this.playStartedAt;
    if (this.diamond) {
      renderDiamondPlay(this.diamond, this.replayCast(), this.batterSide, playTime, previousPlayTime,
        this.camera, this.viewportHeight, this.vfx, this.pitcherThrows,
        this.fixedBattery ? {
          position:{x:(this.batterSide==='R'?-.48:.48)+(this.pitcherThrows==='R'?-1.15:1.15),y:2.55,z:6.30},
          lookAt:{x:this.batterSide==='R'?-.48:.48,y:1.05,z:0},fov:38,
        } : undefined,
        this.welcome.rigs);
      const play = this.diamond;
      const accentAt = play.outfield
        ? (play.outfield.caught || play.outfield.wall ? play.legs[1].end : play.legs[0].end)
        : play.finish;
      if (previousPlayTime < accentAt && playTime >= accentAt) this.playAccent?.(play.kind);
      if (playTime>=play.duration && this.queue.length) this.startDiamond(this.queue.shift()!);
      this.ballpark.update(this.elapsedSec, 0.5);
      this.vfx.update(dt, this.camera, this.viewportHeight);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const fielding = this.delivery ? this.updateDelivery(this.delivery, playTime, previousPlayTime, targetPose) : null;
    this.cameraPose = dampCameraPose(this.cameraPose, targetPose, dt, 6.2);
    const shake = computeShakeOffset(this.trauma, this.elapsedSec);

    this.camera.position.set(
      this.cameraPose.position.x + shake.x,
      this.cameraPose.position.y + shake.y,
      this.cameraPose.position.z + shake.z,
    );
    if (Math.abs(this.camera.fov - this.cameraPose.fov) > 0.05) {
      this.camera.fov = this.cameraPose.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(
      this.cameraPose.lookAt.x,
      this.cameraPose.lookAt.y,
      this.cameraPose.lookAt.z,
    );

    this.updatePlayers(playTime, fielding);
    if (this.vfx.ball.group.visible) this.vfx.ball.sizeForCamera(this.camera, this.viewportHeight);

    // Update stadium crowd, clouds & VFX
    this.ballpark.update(this.elapsedSec, this.crowdExcitement);
    this.vfx.update(dt, this.camera, this.viewportHeight);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.welcome.dispose();
    this.pitcher.dispose();
    this.batter.dispose();
    this.catcher.dispose();
    this.fielder.dispose();
    if (this.replayFielders) for (const rig of Object.values(this.replayFielders)) rig.dispose();
    this.ballpark.dispose();
    this.vfx.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
