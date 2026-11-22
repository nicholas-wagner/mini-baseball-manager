import { pitchFlightScale } from '../vfx/ballFlightVisual';
import { batterBox, headingToward } from './diamondLayout';
import { createDelivery, sampleDeliveryFlight, type ShowcaseDelivery } from '../vfx/showcaseDelivery';
import { diamondPlay, type DiamondPlay } from './diamondPlay';
import { renderDiamondPlay, type DiamondCast } from './renderDiamondPlay';
import type { EffectiveBatSide, ThrowsHand } from '../../engine/handedness/types';
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
import { CLIP_DURATIONS, type CharacterAnimClip } from '../characters/animationState';
import { createPaintedPlayerRig, type PaintedPlayerRig } from '../characters/paintedPlayer';
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
  private defenders = new Map<DiamondDefenderPos, PaintedPlayerRig>();
  private batterRig: PaintedPlayerRig;
  private runnerRigs: PaintedPlayerRig[];

  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedSec = 0;
  private trauma = 0;

  private replay: { play: DiamondPlay; cast: DiamondCast; start: number; rate: number } | null = null;
  private pitch: { play: ShowcaseDelivery; start: number; rate: number; initialized: boolean; callout?: ChoreographedStep['callout'] } | null = null;
  private bats: EffectiveBatSide = 'R';
  private throws: ThrowsHand = 'R';
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
      const rig = createPaintedPlayerRig(
        { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 24, role },
        coord.yaw,
      );
      rig.root.position.set(coord.x, coord.y, coord.z);
      rig.logicalYaw = coord.yaw;
      this.defenders.set(coord.pos, rig);
      this.scene.add(rig.root);
    }

    this.batterRig = createPaintedPlayerRig(
      { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 7, role: 'batter' },
      batterBox('R').yaw,
    );
    this.batterRig.root.position.copy(batterBox('R').position);
    this.scene.add(this.batterRig.root);

    this.runnerRigs = [1, 2, 3].map((baseIdx) => {
      const runner = createPaintedPlayerRig(
        { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 12, role: 'fielder' },
        headingToward(BASE_PATH_VERTICES[baseIdx], BASE_PATH_VERTICES[0]),
        true,
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
    const half = choreo && event ? event.half : session.half;
    const fieldingClub = half === 'TOP' ? homeClub : awayClub;
    const battingClub = half === 'TOP' ? awayClub : homeClub;

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
    const fieldingSide = half === 'TOP' ? session.home : session.away;
    const battingSide = half === 'TOP' ? session.away : session.home;
    const fieldingTeam = toTeamColors(fieldingClub);
    const battingTeam = toTeamColors(battingClub);

    const pitcher = fieldingSide.playersById[(choreo && event?.pitcherId) || fieldingSide.activePitcherId];
    const batterSlot = battingSide.lineup[battingSide.lineupIndex % battingSide.lineup.length];
    const batter = battingSide.playersById[(choreo && event?.batterId) || batterSlot.playerId];
    const effectiveBat = resolveEffectiveBatSide(batter.bats, pitcher.throws);

    this.bats = effectiveBat;
    this.throws = pitcher.throws;
    this.batterRig.updateAppearance({
      traits: batter.traits,
      team: battingTeam,
      jerseyNumber: batter.jerseyNumber,
      role: 'batter',
      throwsHand: batter.throws,
      batSide: effectiveBat,
    });
    const box = batterBox(effectiveBat);
    this.batterRig.logicalYaw = box.yaw;
    this.batterRig.root.position.copy(box.position);

    for (const coord of DIAMOND_DEFENDER_COORDS) {
      const rig = this.defenders.get(coord.pos);
      if (!rig) continue;
      rig.root.position.set(coord.x, coord.y, coord.z);
      rig.logicalYaw = coord.yaw;
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

    session.bases.forEach((baseId, idx) => {
      const runnerId = idx === 0 && choreo?.infield === 'double_play' ? choreo.leadRunnerId : baseId;
      const rig = this.runnerRigs[idx];
      rig.root.position.copy(BASE_PATH_VERTICES[idx + 1]);
      rig.logicalYaw = headingToward(rig.root.position, BASE_PATH_VERTICES[0]);
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

    this.replay = null;
    this.pitch = null;
    this.vfx.clear();
    if (choreo?.infield) {
      const play = diamondPlay(choreo.infield, choreo.highlightFielderPos);
      const at = (pos: DiamondDefenderPos) => this.defenders.get(pos)!;
      this.replay = { play, cast: { P: at('P'), SS: at('SS'), '1B': at('1B'), '2B': at('2B'),
        '3B': at('3B'), BAT: this.batterRig, RUN: this.runnerRigs[0] },
        start: this.elapsedSec, rate: play.duration * 1000 / choreo.durationMs };
      return;
    }
    if (choreo) {
      this.cameraPreset = choreo.cameraPreset;
      this.pitcherClip = choreo.pitcherClip;
      this.batterClip = choreo.batterClip;
      this.fielderClip = choreo.fielderClip;
      this.highlightPos =
        choreo.highlightFielderPos === 'SP' || choreo.highlightFielderPos === 'RP'
          ? 'P'
          : (choreo.highlightFielderPos ?? null);

      if (event?.type === 'pitch_thrown' && choreo.ballStyle) {
        const play = createDelivery(choreo.ballStyle, this.throws, this.bats, choreo.pitcherClip, choreo.batterClip);
        this.pitch = { play, start: this.elapsedSec,
          rate: (play.plateAt + .42) * 1000 / choreo.durationMs, initialized: false, callout: choreo.callout ?? { text: play.pitch.calloutText, color: play.pitch.trailColor } };
        this.cameraPose = getCameraPresetPose(this.cameraPreset, this.elapsedSec, 0, this.throws, this.bats);
      } else if (choreo.ballStyle) {
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

  private drawPitch(pitch: NonNullable<GameSceneController['pitch']>) {
    const { play } = pitch;
    const time = (this.elapsedSec - pitch.start) * pitch.rate;
    const pitcher = this.defenders.get('P')!;
    const catcher = this.defenders.get('C')!;
    if (!pitch.initialized && time >= play.releaseAt) {
      // Launch from the throwing fingertips in mound coordinates.
      play.pitch.start = pitcher.contactAt(play.pitcherClip, play.releaseAt, pitcher.root.position, this.camera.position);
      pitch.initialized = true;
    }
    const receive = time - play.plateAt;
    if (receive >= 0 && pitch.callout) {
      this.vfx.spawnComicCallout(pitch.callout.text, play.pitch.end, pitch.callout.color, true);
      this.vfx.impact(play.pitch.end, pitch.callout.color);
      pitch.callout = undefined;
    }
    const catchTime = receive + .3 * CLIP_DURATIONS.catch_receive;
    play.pitch.end = catcher.contactAt('catch_receive', .3 * CLIP_DURATIONS.catch_receive, catcher.root.position, this.camera.position);
    const stillPitching = time < CLIP_DURATIONS[play.pitcherClip];
    pitcher.updatePose(stillPitching ? play.pitcherClip : 'idle', stillPitching ? time : 0, undefined, this.camera.position);
    catcher.updatePose(catchTime >= 0 && catchTime < .42 ? 'catch_receive' : 'field_ready',
      Math.max(0, catchTime), undefined, this.camera.position, receive >= 0 && receive < .33);
    const swing = time - play.swingAt;
    const active = swing >= 0 && swing < CLIP_DURATIONS[this.batterClip];
    this.batterRig.updatePose(active ? this.batterClip : 'bat_stance', active ? swing : 0, undefined, this.camera.position);
    const flight = sampleDeliveryFlight(play,time);
    if (flight && receive < 0) {
      this.vfx.ball.draw(flight.spec, flight.progress, undefined, pitchFlightScale(flight.progress, .46));
      this.vfx.ball.sizeForCamera(this.camera, this.container.clientHeight);
    } else this.vfx.ball.group.visible = false;
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
    if (this.replay) {
      const { play, cast, start, rate } = this.replay;
      const t = (this.elapsedSec - start) * rate;
      renderDiamondPlay(play, cast, this.bats, t, t - dt * rate, this.camera, this.container.clientHeight, this.vfx);
      for (const pos of ['C', 'LF', 'CF', 'RF'] as const)
        this.defenders.get(pos)?.updatePose('field_ready', t, undefined, this.camera.position);
      for (const runner of this.runnerRigs) {
        if (runner.root.visible && !(play.kind === 'double_play' && runner === cast.RUN))
          runner.updatePose('runner_lead', t, undefined, this.camera.position);
      }
      this.vfx.update(dt, this.camera);
      this.ballpark.update(dt, 0.57);
      return;
    }
    const targetPose = getCameraPresetPose(this.cameraPreset, this.elapsedSec, 0, this.throws, this.bats);
    if (this.camera.fov !== targetPose.fov) { this.camera.fov = targetPose.fov; this.camera.updateProjectionMatrix(); }
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
      if (this.pitch && (pos === 'P' || pos === 'C')) continue;
      const clip =
        pos === 'P'
          ? this.pitcherClip
          : this.highlightPos === pos
            ? this.fielderClip
            : 'field_ready';
      rig.updatePose(clip, this.elapsedSec, undefined, this.camera.position);
    }
    if (this.pitch) this.drawPitch(this.pitch);
    else this.batterRig.updatePose(this.batterClip, this.elapsedSec, undefined, this.camera.position);
    for (const runner of this.runnerRigs) {
      if (runner.root.visible) {
        runner.updatePose('idle', this.elapsedSec, undefined, this.camera.position);
      }
    }

    this.vfx.update(dt, this.camera);
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
