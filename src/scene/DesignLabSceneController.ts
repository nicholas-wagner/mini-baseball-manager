import * as THREE from 'three';
import type { PortraitMood, PortraitTeamColors, PortraitTraits } from '../art/portraits/types';
import { createPortraitTraits } from '../art/portraits/generatePortrait';
import { SAMPLE_TEAM_PALETTES } from '../art/themes/teamPalettes';
import { createMiniBallpark } from './ballpark/ballparkBuilder';
import {
  computeShakeOffset,
  dampCameraPose,
  getCameraPresetPose,
  type CameraPose,
  type CameraPresetId,
} from './camera/cameraRig';
import type { CharacterAnimClip } from './characters/animationState';
import { createChibiPlayerRig, type ChibiPlayerRig } from './characters/chibiBuilder';
import type { BallVfxStyle } from './vfx/ballTrajectory';
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
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedSec = 0;
  private cameraPose: CameraPose;
  private cameraPreset: CameraPresetId = 'over_shoulder_pitcher';
  private trauma = 0;
  private crowdExcitement = 0.25;
  private turntableOffset = 0;

  private pitcherClip: CharacterAnimClip = 'idle';
  private batterClip: CharacterAnimClip = 'bat_stance';
  private fielderClip: CharacterAnimClip = 'field_ready';
  private moodOverride: PortraitMood | undefined = undefined;

  constructor(
    container: HTMLElement,
    initialHeroTraits: PortraitTraits,
    initialHeroTeam: PortraitTeamColors,
    initialJersey: number,
  ) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x63caff);
    this.scene.fog = new THREE.Fog(0x88dbff, 48, 115);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
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

    // Featured Chibi Pitcher on the Mound (faces +Z toward Home Plate)
    this.pitcher = createChibiPlayerRig({
      traits: initialHeroTraits,
      team: initialHeroTeam,
      jerseyNumber: initialJersey,
      role: 'pitcher',
    });
    this.pitcher.root.position.set(0, 0.24, -10.2);
    this.scene.add(this.pitcher.root);

    // Opposing Chibi Batter at Home Plate (faces -Z toward Pitcher)
    const rivalTeam = SAMPLE_TEAM_PALETTES[1];
    this.batter = createChibiPlayerRig({
      traits: createPortraitTraits(4412),
      team: rivalTeam,
      jerseyNumber: 7,
      role: 'batter',
    });
    this.batter.root.position.set(-0.92, 0.04, 0.15);
    this.batter.root.rotation.y = Math.PI;
    this.scene.add(this.batter.root);

    // Chibi Catcher behind Home Plate
    this.catcher = createChibiPlayerRig({
      traits: createPortraitTraits(3105),
      team: initialHeroTeam,
      jerseyNumber: 2,
      role: 'catcher',
    });
    this.catcher.root.position.set(0, 0.04, 1.75);
    this.catcher.root.rotation.y = Math.PI;
    this.scene.add(this.catcher.root);

    // Chibi Center-Right Fielder ready to dive or Sky-High Leap!
    this.fielder = createChibiPlayerRig({
      traits: createPortraitTraits(7721),
      team: initialHeroTeam,
      jerseyNumber: 19,
      role: 'fielder',
    });
    this.fielder.root.position.set(7.5, 0.04, -22.5);
    this.scene.add(this.fielder.root);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setCameraPreset(preset: CameraPresetId): void {
    this.cameraPreset = preset;
  }

  nudgeTurntable(deltaRad: number): void {
    this.turntableOffset += deltaRad;
  }

  setHeroAppearance(
    traits: PortraitTraits,
    team: PortraitTeamColors,
    jerseyNumber: number,
  ): void {
    this.pitcher.updateAppearance({ traits, team, jerseyNumber, role: 'pitcher' });
    this.catcher.updateAppearance({
      traits: createPortraitTraits(3105),
      team,
      jerseyNumber: 2,
      role: 'catcher',
    });
    this.fielder.updateAppearance({
      traits: createPortraitTraits(7721),
      team,
      jerseyNumber: 19,
      role: 'fielder',
    });
  }

  setMoodOverride(mood: PortraitMood | undefined): void {
    this.moodOverride = mood;
  }

  setAnimationClips(state: Partial<DesignLabSceneState>): void {
    if (state.cameraPreset) this.cameraPreset = state.cameraPreset;
    if (state.pitcherClip) this.pitcherClip = state.pitcherClip;
    if (state.batterClip) this.batterClip = state.batterClip;
    if (state.fielderClip) this.fielderClip = state.fielderClip;
    if ('moodOverride' in state) this.moodOverride = state.moodOverride;
  }

  triggerShowcaseAction(
    ballStyle: BallVfxStyle | null,
    callout?: { text: string; color: string; y?: number; z?: number },
  ): void {
    if (ballStyle) {
      const { cameraShake } = this.vfx.launchBall(ballStyle);
      this.trauma = Math.min(1, this.trauma + cameraShake);
      this.crowdExcitement = ballStyle === 'moonshot_hr' ? 1.0 : 0.72;
    } else if (callout) {
      this.vfx.spawnComicCallout(
        callout.text,
        { x: 0, y: callout.y ?? 2.6, z: callout.z ?? -10.2 },
        callout.color,
      );
      this.crowdExcitement = 0.85;
    }
  }

  private loop = (timestamp: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;
    this.elapsedSec += dt;

    // Decay shake & crowd excitement smoothly
    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    this.crowdExcitement = Math.max(0.22, this.crowdExcitement - dt * 0.25);

    // Update animated chibi players
    this.pitcher.updatePose(this.pitcherClip, this.elapsedSec, this.moodOverride);
    this.batter.updatePose(this.batterClip, this.elapsedSec);
    this.catcher.updatePose('field_ready', this.elapsedSec * 0.8);
    this.fielder.updatePose(this.fielderClip, this.elapsedSec);

    // Update stadium crowd, clouds & VFX
    this.ballpark.update(this.elapsedSec, this.crowdExcitement);
    this.vfx.update(dt);

    // Smoothly damp camera & apply screen shake
    const targetPose = getCameraPresetPose(
      this.cameraPreset,
      this.elapsedSec,
      this.turntableOffset,
    );
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
