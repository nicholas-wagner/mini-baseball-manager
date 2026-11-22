import * as THREE from 'three';
import type { PitchingMotion, PortraitMood, PortraitTeamColors, PortraitTraits } from '../art/portraits/types';
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
import { createChibiPlayerRig, type ChibiPlayerRig } from './characters/chibiBuilder';
import { sampleBallTrajectory, type BallVfxStyle } from './vfx/ballTrajectory';
import { createDelivery, MOUND, sampleDeliveryFlight, signatureReleasePoint, type ShowcaseDelivery } from './vfx/showcaseDelivery';
import { catchPoint, FIELD_CAMERA_CUT, FIELDER_START, fieldingCamera, isCatchClip, sampleFieldingPlay } from './vfx/fieldingShowcase';
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
  private pitcher: ChibiPlayerRig;
  private batter: ChibiPlayerRig;
  private catcher: ChibiPlayerRig;
  private fielder: ChibiPlayerRig;

  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private viewportHeight = 1;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedSec = 0;
  private cameraPose: CameraPose;
  private cameraPreset: CameraPresetId = 'over_shoulder_pitcher';
  private playStartedAt = 0;
  private delivery: ShowcaseDelivery | null = null;
  private callout?: { text: string; color: string };
  private playAccent?: () => void;
  private trauma = 0;
  private crowdExcitement = 0.25;
  private turntableOffset = 0;
  private turntableStartedAt = 0;

  private pitcherClip: CharacterAnimClip = 'idle';
  private batterClip: CharacterAnimClip = 'bat_stance';
  private fielderClip: CharacterAnimClip = 'field_ready';
  private moodOverride: PortraitMood | undefined = undefined;
  private pitcherThrows: ThrowsHand = 'R';
  private pitchingMotion: PitchingMotion;
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
  ) {
    this.container = container;
    const appearance = resolveAthleteAppearance(initialHeroTraits);
    this.stature.pitcher = STATURE_SCALE[appearance.stature];
    this.pitchingMotion = appearance.pitchingMotion;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x4bb9ee);
    this.scene.fog = new THREE.Fog(0x88dbff, 48, 115);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.viewportHeight = height;
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 180);
    this.cameraPose = getCameraPresetPose(this.cameraPreset, 0);

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
    this.pitcher = createChibiPlayerRig(
      {
        traits: initialHeroTraits,
        team: initialHeroTeam,
        jerseyNumber: initialJersey,
        role: 'pitcher',
      },
      0,
    );
    this.pitcher.root.position.copy(MOUND);
    this.scene.add(this.pitcher.root);

    // Opposing Chibi Batter at Home Plate (logicalYaw = PI -> faces -Z toward Pitcher)
    const rivalTeam = SAMPLE_TEAM_PALETTES[1];
    this.batter = createChibiPlayerRig(
      {
        traits: this.rivalBatterTraits,
        team: rivalTeam,
        jerseyNumber: 7,
        role: 'batter',
      },
      Math.PI,
    );
    this.batter.root.position.set(-1.34, 0.04, 0.15);
    this.scene.add(this.batter.root);

    // Chibi Catcher behind Home Plate (logicalYaw = PI -> faces -Z toward Pitcher)
    this.catcher = createChibiPlayerRig(
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
    this.fielder = createChibiPlayerRig(
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
    const leavingTurntable = this.cameraPreset === 'showcase_closeup';
    this.cameraPreset = preset;
    if (preset === 'showcase_closeup') {
      this.turntableStartedAt = this.elapsedSec;
      this.turntableOffset = 0;
    }
    // A direct cut avoids traveling through the featured player at the mound.
    if (leavingTurntable || preset === 'showcase_closeup') this.cameraPose = this.presetPose();
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
    this.pitchingMotion = appearance.pitchingMotion;
    const height = STATURE_SCALE[appearance.stature];
    const changedHeight = height !== this.stature.pitcher;
    this.stature.pitcher = height;
    if (this.delivery && (changedHeight || pitcherThrows !== this.pitcherThrows || batterSide !== this.batterSide)) {
      const style = (this.delivery.hit ?? this.delivery.pitch).style;
      this.delivery = createDelivery(style, pitcherThrows, batterSide, this.pitcherClip, this.batterClip, this.stature);
    }
    this.pitcherThrows = pitcherThrows;
    this.batterSide = batterSide;
    this.pitcher.updateAppearance({
      traits,
      team,
      jerseyNumber,
      role: 'pitcher',
      throwsHand: pitcherThrows,
    });
    // Position opposing batter in 3rd-base box (-X) for RHB or 1st-base box (+X) for LHB!
    this.batter.root.position.set(batterSide === 'R' ? -1.34 : 1.34, 0.04, 0.15);
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
    onAccent?: () => void,
  ): void {
    this.vfx.clear();
    this.fielder.root.position.copy(FIELDER_START);
    this.playStartedAt = this.elapsedSec;
    this.playAccent = onAccent;
    this.callout = callout;
    this.delivery = ballStyle
      ? createDelivery(ballStyle, this.pitcherThrows, this.batterSide, this.pitcherClip, this.batterClip, this.stature)
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

  private updateDelivery(play: ShowcaseDelivery, t: number, previous: number, target: CameraPose) {
    if (this.pitchingMotion !== 'overhand' && previous < play.releaseAt && t >= play.releaseAt) {
      play.pitch.start = signatureReleasePoint(this.pitchingMotion, play.pitcherClip, this.pitcherThrows,
        this.stature.pitcher, this.cameraPose.position);
    }
    const hit = play.hit;
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
        hit.end = catchPoint(fieldClip, this.pitcherThrows, hit.durationSec, this.cameraPose.position, STATURE_SCALE[this.fielderTraits.stature]);
      }
      if (at.caught && previous - play.plateAt < hit.durationSec) {
        this.vfx.impact(hit.end, '#FFE29D');
        this.vfx.spawnComicCallout('SNAG!', hit.end, '#FFD166', true);
      }
    }
    const flight = sampleDeliveryFlight(play, t);
    if (flight) {
      const chasing = fieldClip && flight.spec === hit;
      const progress = chasing ? 1 - Math.pow(1 - flight.progress, 1.35) : flight.progress;
      this.vfx.ball.draw(flight.spec, progress,
        play.hit && flight.spec === play.pitch ? undefined : this.callout?.color,
        chasing ? 1 - 0.64 * progress : 1);
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
    const catching = !play.hit && receive >= 0 && receive < CLIP_DURATIONS.catch_receive;
    this.catcher.updatePose(catching ? 'catch_receive' : 'field_ready', catching ? receive : t, undefined, camera, catching);
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

    // Decay shake & crowd excitement smoothly
    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    this.crowdExcitement = Math.max(0.22, this.crowdExcitement - dt * 0.25);

    // Smoothly damp camera & apply screen shake first so 2.5D SVG cutouts know exact camera angle
    const targetPose = this.presetPose();
    const playTime = this.elapsedSec - this.playStartedAt;
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

    // Update animated 2.5D SVG players with live camera position for front/back switching!
    this.updatePlayers(playTime, fielding);
    if (this.vfx.ball.group.visible) this.vfx.ball.sizeForCamera(this.camera, this.viewportHeight);

    // Update stadium crowd, clouds & VFX
    this.ballpark.update(this.elapsedSec, this.crowdExcitement);
    this.vfx.update(dt, this.camera);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.pitcher.dispose();
    this.batter.dispose();
    this.catcher.dispose();
    this.fielder.dispose();
    this.ballpark.dispose();
    this.vfx.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
