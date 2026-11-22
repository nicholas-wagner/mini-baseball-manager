import * as THREE from 'three';
import { createPortraitTraits } from '../../art/portraits/generatePortrait';
import type { PortraitTeamColors } from '../../art/portraits/types';
import { resolveEffectiveBatSide } from '../../engine/handedness/handedness';
import type { Club } from '../../engine/models/club';
import type { PlayEvent } from '../../engine/models/playEvent';
import type { Player } from '../../engine/models/player';
import type { GameSessionState } from '../../engine/simulation/gameState';
import { createMiniBallpark } from '../ballpark/ballparkBuilder';
import {
  createStadiumEvolutionOverlay,
  type StadiumEvolutionOverlay,
} from '../ballpark/stadiumUpgrades';
import {
  computeShakeOffset,
  dampCameraPose,
  getCameraPresetPose,
  type CameraPose,
  type CameraPresetId,
} from '../camera/cameraRig';
import type { CharacterAnimClip } from '../characters/animationState';
import { createChibiPlayerRig, type ChibiPlayerRig } from '../characters/chibiBuilder';
import { createBallparkVfxSystem } from '../vfx/vfxSystem';
import {
  BASE_PATH_VERTICES,
  DIAMOND_DEFENDER_COORDS,
  type ChoreographedStep,
  type DiamondDefenderPos,
} from './eventChoreographer';

const FALLBACK_TEAM: PortraitTeamColors = {
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#FFC300',
  monogram: 'SC',
};

function toTeamColors(club: Club): PortraitTeamColors {
  return {
    primary: club.colors.primary,
    secondary: club.colors.secondary,
    accent: club.colors.accent,
    monogram: club.colors.monogram,
  };
}

/**
 * Imperative Three.js controller rendering all 9 live defenders, active batter,
 * occupied 1B/2B/3B baserunners, VFX trails, and OTS/Broadcast camera motion.
 */
export class GameSceneController {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private ballpark: ReturnType<typeof createMiniBallpark>;
  private stadiumOverlay: StadiumEvolutionOverlay | null = null;
  private stadiumSignature = '';
  private vfx: ReturnType<typeof createBallparkVfxSystem>;
  private defenders = new Map<DiamondDefenderPos, ChibiPlayerRig>();
  private batterRig: ChibiPlayerRig;
  private runnerRigs: ChibiPlayerRig[];

  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedSec = 0;
  private trauma = 0;

  private cameraPreset: CameraPresetId = 'over_shoulder_pitcher';
  private cameraPose: CameraPose;
  private pitcherClip: CharacterAnimClip = 'idle';
  private batterClip: CharacterAnimClip = 'bat_stance';
  private fielderClip: CharacterAnimClip = 'field_ready';
  private highlightPos: DiamondDefenderPos | null = null;

  constructor(container: HTMLElement) {
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xfffbe6, 0x2fb356, 1.15));
    const sun = new THREE.DirectionalLight(0xfff7dd, 1.35);
    sun.position.set(16, 28, 18);
    this.scene.add(sun);

    this.ballpark = createMiniBallpark();
    this.scene.add(this.ballpark.group);

    this.vfx = createBallparkVfxSystem();
    this.scene.add(this.vfx.group);

    const baseTraits = createPortraitTraits(1994);
    for (const coord of DIAMOND_DEFENDER_COORDS) {
      const role = coord.pos === 'P' ? 'pitcher' : coord.pos === 'C' ? 'catcher' : 'fielder';
      const rig = createChibiPlayerRig(
        { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 24, role },
        coord.yaw,
      );
      rig.root.position.set(coord.x, coord.y, coord.z);
      this.defenders.set(coord.pos, rig);
      this.scene.add(rig.root);
    }

    this.batterRig = createChibiPlayerRig(
      { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 7, role: 'batter' },
      Math.PI,
    );
    this.batterRig.root.position.set(-0.95, 0.04, 0.15);
    this.scene.add(this.batterRig.root);

    this.runnerRigs = [1, 2, 3].map((baseIdx) => {
      const runner = createChibiPlayerRig(
        { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 12, role: 'fielder' },
        baseIdx === 1 ? Math.PI * 0.75 : 0,
      );
      const pos = BASE_PATH_VERTICES[baseIdx];
      runner.root.position.set(pos.x, pos.y, pos.z);
      runner.root.visible = false;
      this.scene.add(runner.root);
      return runner;
    });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    this.lastTimestamp = performance.now();
    this.startLoop();
  }

  public syncMatchup(
    awayClub: Club,
    homeClub: Club,
    session: GameSessionState,
    choreo?: ChoreographedStep | null,
    event?: PlayEvent | null,
  ): void {
    const fieldingClub = session.half === 'TOP' ? homeClub : awayClub;
    const battingClub = session.half === 'TOP' ? awayClub : homeClub;

    const nextSig = `${homeClub.leagueTier}:${homeClub.stadium.ballparkId ?? 'sandlot'}:${homeClub.stadium.seatingTier}:${Number(homeClub.stadium.hasJumbotron)}:${Number(homeClub.stadium.hasNightLights)}:${Number(homeClub.stadium.hasMascotCannon)}:${homeClub.stadium.retiredNumbers.length}:${homeClub.stadium.championshipPennants.length}`;
    if (nextSig !== this.stadiumSignature) {
      this.stadiumSignature = nextSig;
      if (this.stadiumOverlay) {
        this.scene.remove(this.stadiumOverlay.group);
        this.stadiumOverlay.dispose();
      }
      this.stadiumOverlay = createStadiumEvolutionOverlay(
        homeClub.leagueTier,
        homeClub.stadium,
        homeClub.economy.activeSponsorIds,
      );
      this.scene.add(this.stadiumOverlay.group);
    }
    const fieldingSide = session.half === 'TOP' ? session.home : session.away;
    const battingSide = session.half === 'TOP' ? session.away : session.home;
    const fieldingTeam = toTeamColors(fieldingClub);
    const battingTeam = toTeamColors(battingClub);

    const pitcher = fieldingSide.playersById[fieldingSide.activePitcherId];
    const batterSlot = battingSide.lineup[battingSide.lineupIndex % battingSide.lineup.length];
    const batter = battingSide.playersById[batterSlot.playerId];
    const effectiveBat = resolveEffectiveBatSide(batter.bats, pitcher.throws);

    this.batterRig.updateAppearance({
      traits: batter.traits,
      team: battingTeam,
      jerseyNumber: batter.jerseyNumber,
      role: 'batter',
      throwsHand: batter.throws,
      batSide: effectiveBat,
    });
    this.batterRig.root.position.set(effectiveBat === 'R' ? -0.95 : 0.95, 0.04, 0.15);

    for (const coord of DIAMOND_DEFENDER_COORDS) {
      const rig = this.defenders.get(coord.pos);
      if (!rig) continue;
      const defender: Player =
        coord.pos === 'P'
          ? pitcher
          : (() => {
              const slot = fieldingSide.lineup.find((s) => s.defensivePosition === coord.pos);
              return slot ? fieldingSide.playersById[slot.playerId] : fieldingClub.roster[0];
            })();
      rig.updateAppearance({
        traits: defender.traits,
        team: fieldingTeam,
        jerseyNumber: defender.jerseyNumber,
        role: coord.pos === 'P' ? 'pitcher' : coord.pos === 'C' ? 'catcher' : 'fielder',
        throwsHand: defender.throws,
      });
    }

    session.bases.forEach((runnerId, idx) => {
      const rig = this.runnerRigs[idx];
      rig.root.visible = Boolean(runnerId);
      if (runnerId && battingSide.playersById[runnerId]) {
        const runner = battingSide.playersById[runnerId];
        rig.updateAppearance({
          traits: runner.traits,
          team: battingTeam,
          jerseyNumber: runner.jerseyNumber,
          role: 'fielder',
          throwsHand: runner.throws,
        });
      }
    });

    if (choreo) {
      this.cameraPreset = choreo.cameraPreset;
      this.pitcherClip = choreo.pitcherClip;
      this.batterClip = choreo.batterClip;
      this.fielderClip = choreo.fielderClip;
      this.highlightPos =
        choreo.highlightFielderPos === 'SP' || choreo.highlightFielderPos === 'RP'
          ? 'P'
          : (choreo.highlightFielderPos ?? null);

      if (choreo.ballStyle) {
        const res = this.vfx.launchBall(choreo.ballStyle, choreo.callout);
        this.trauma = Math.min(1, this.trauma + res.cameraShake);
      } else if (choreo.callout) {
        this.vfx.spawnComicCallout(choreo.callout.text, { x: 0, y: 2.3, z: -2 }, choreo.callout.color);
      }
    }

    if (event?.outcome === 'home_run') {
      this.trauma = 1;
    }
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startLoop(): void {
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
      this.lastTimestamp = now;
      this.elapsedSec += dt;
      this.updateScene(dt);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateScene(dt: number): void {
    const targetPose = getCameraPresetPose(this.cameraPreset, this.elapsedSec);
    this.cameraPose = dampCameraPose(this.cameraPose, targetPose, dt, 6);
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const shake = computeShakeOffset(this.trauma, this.elapsedSec);

    this.camera.position.set(
      this.cameraPose.position.x + shake.x,
      this.cameraPose.position.y + shake.y,
      this.cameraPose.position.z + shake.z,
    );
    this.camera.lookAt(
      this.cameraPose.lookAt.x,
      this.cameraPose.lookAt.y,
      this.cameraPose.lookAt.z,
    );

    for (const [pos, rig] of this.defenders.entries()) {
      const clip =
        pos === 'P'
          ? this.pitcherClip
          : this.highlightPos === pos
            ? this.fielderClip
            : 'field_ready';
      rig.updatePose(clip, this.elapsedSec, undefined, this.camera.position);
    }
    this.batterRig.updatePose(this.batterClip, this.elapsedSec, undefined, this.camera.position);
    for (const runner of this.runnerRigs) {
      if (runner.root.visible) {
        runner.updatePose('idle', this.elapsedSec, undefined, this.camera.position);
      }
    }

    this.vfx.update(dt);
    this.ballpark.update(dt, 0.35);
  }

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.vfx.dispose();
    if (this.stadiumOverlay) this.stadiumOverlay.dispose();
    this.ballpark.dispose();
    for (const rig of this.defenders.values()) rig.dispose();
    this.batterRig.dispose();
    for (const runner of this.runnerRigs) runner.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
