import { previewShot, rehearsalPose, targetOffset, type AtBatPreview } from './firstAtBatPresentation';
import { playReadout } from './playReadout';
import { WalkoffTeammates } from '../characters/walkoffTeammates';
import { pitchFlightScale } from '../vfx/ballFlightVisual';
import { batterBox, headingToward } from './diamondLayout';
import { createDelivery, sampleDeliveryFlight, type ShowcaseDelivery } from '../vfx/showcaseDelivery';
import { runBases } from './outfieldPlay';
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
import { buildLiveStadiumScoreboardSnapshot } from '../ballpark/liveScoreboardData';
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
  private welcome: WalkoffTeammates;
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

  private replay: { play: DiamondPlay; cast: DiamondCast; start: number; rate: number; readout: ReturnType<typeof playReadout>; runnerDestinations?: number[] } | null = null;
  private pitch: { play: ShowcaseDelivery; start: number; rate: number; initialized: boolean; callout?: ChoreographedStep['callout'] } | null = null;
  private bats: EffectiveBatSide = 'R';
  private throws: ThrowsHand = 'R';
  private preview: AtBatPreview | null = null;
  private previewStart = 0;
  public setPreview(intent: AtBatPreview | null) {
    if (intent === this.preview) return;
    this.preview = intent;
    this.previewStart = this.elapsedSec;
  }
  private cameraPreset: CameraPresetId = 'over_shoulder_pitcher';
  private steadyCamera = false;
  private cameraOverride: CameraPresetId | null = null;
  private cameraPose: CameraPose;
  private pitcherClip: CharacterAnimClip = 'pitch_set';
  private batterClip: CharacterAnimClip = 'bat_stance';
  private fielderClip: CharacterAnimClip = 'field_ready';
  private highlightPos: DiamondDefenderPos | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.welcome=new WalkoffTeammates(this.scene);
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
      rig.root.scale.y = 1;
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

  public setCameraOverride(preset: CameraPresetId | null, steady = false): void {
    this.steadyCamera = steady;
    this.cameraOverride = preset;
  }

  public syncMatchup(
    awayClub: Club,
    homeClub: Club,
    session: GameSessionState,
    choreo?: ChoreographedStep | null,
    event?: PlayEvent | null,
  ): void {
    const half = event?.type==='pitching_change' && event.pitcherId
      ? session.home.playersById[event.pitcherId] ? 'TOP' : 'BOT'
      : choreo && event ? event.half : session.half;
    const fieldingClub = half === 'TOP' ? homeClub : awayClub;
    const battingClub = half === 'TOP' ? awayClub : homeClub;

    this.ballpark.updateScoreboard(
      buildLiveStadiumScoreboardSnapshot(awayClub, homeClub, session),
    );

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
    const batter = (choreo && event?.batterId && battingSide.playersById[event.batterId]) || battingSide.playersById[batterSlot.playerId];
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
    this.batterRig.preparePlayback();
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
      rig.preparePlayback();
    }

    const bases = (choreo?.outfield || choreo?.close || choreo?.infield === 'bunt_single' || choreo?.infield === 'fielding_error') && choreo.basesBefore ? choreo.basesBefore : session.bases;
    bases.forEach((baseId, idx) => {
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
          sprintSpeed: runner.ratings.speed,
        });
        rig.preparePlayback();
      }
    });

    this.replay = null;
    this.pitch = null;
    this.vfx.clear();
    this.welcome.hide();
    if (!choreo) {
      this.cameraPreset = 'over_shoulder_pitcher';
      this.pitcherClip = 'pitch_set';
      this.batterClip = 'bat_stance';
      this.fielderClip = 'field_ready';
      this.highlightPos = null;
    }
    const play = choreo?.play ?? choreo?.close ?? choreo?.outfield ?? (choreo?.infield ? diamondPlay(choreo.infield, choreo.highlightFielderPos) : undefined);
    if (play && choreo) {
      if (play.ending?.kind==='walkoff') {
        const teammates=battingSide.lineup.map(slot=>battingSide.playersById[slot.playerId])
          .filter(p=>p && p.id!==batter.id && !bases.includes(p.id)).slice(0,2);
        this.welcome.set(teammates.map(p=>({traits:p.traits,jerseyNumber:p.jerseyNumber,throwsHand:p.throws,team:battingTeam,role:'fielder'})));
      }
      const at = (pos: DiamondDefenderPos) => this.defenders.get(pos)!;
      const reliefStrikeout = pitcher.position === 'RP' && event?.outcome === 'strikeout'
        && (event.isClutchMoment || (event.leverageIndex ?? 0) >= 1.3 || Boolean(choreo.basesBefore?.some(Boolean)));
      this.replay = { play: reliefStrikeout ? {...play,reliefStrikeout:true} : play, readout: playReadout(event), cast: { C: at('C'), P: at('P'), SS: at('SS'), '1B': at('1B'), '2B': at('2B'),
        '3B': at('3B'), LF: at('LF'), CF: at('CF'), RF: at('RF'),
        BAT: this.batterRig, RUN: this.runnerRigs[play.scorerBase ? play.scorerBase-1 : play.close?.steal ? play.close.fromBase - 1 : play.kind === 'sac_fly' ? 2 : 0] },
        runnerDestinations: (play.outfield || play.close || play.kind === 'bunt_single' || play.kind === 'fielding_error') && event ? bases.map((id, i) => {
          if (!id) return i + 1;
          const dest = event.basesAfter.indexOf(id);
          if (dest >= 0) return dest + 1;
          return play.outfield?.caught && play.kind !== 'sac_fly' ? i + 1 : 4;
        }) : undefined,
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
      const elapsed = Math.max(0, (now - this.lastTimestamp) / 1000);
      const dt = Math.min(.05, elapsed);
      this.lastTimestamp = now;
      this.elapsedSec += elapsed;
      this.updateScene(dt, elapsed);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateScene(dt: number, elapsed: number): void {
    if (this.replay) {
      const { play, cast, start, rate, runnerDestinations } = this.replay;
      const t = (this.elapsedSec - start) * rate;
      const fixedShot = this.cameraOverride
        ? getCameraPresetPose(this.cameraOverride,this.elapsedSec,0,this.throws,this.bats) : undefined;
      renderDiamondPlay(play, cast, this.bats, t, t - elapsed * rate, this.camera, this.container.clientHeight,
        this.vfx, this.throws, fixedShot, this.welcome.rigs, this.replay.readout);
      this.runnerRigs.forEach((runner, i) => {
        if (!runner.root.visible || ((play.scorerBase || play.kind === 'double_play' || play.kind === 'sac_fly' || play.close?.steal) && runner === cast.RUN)) return;
        const destination = runnerDestinations?.[i];
        if (destination === undefined) {
          runner.updatePose('runner_lead', t, undefined, this.camera.position);
          return;
        }
        const go = play.close?.steal ? .52 : play.kind === 'ball_four' ? play.pickupAt+.60
          : (play.outfield?.caught ? play.pickupAt : play.legs[0].end) + .12;
        const arrival = play.kind === 'ball_four' ? play.batterArrival : play.close?.steal ? play.leadArrival : go + (destination - i - 1) * 1.30;
        const state = runBases(BASE_PATH_VERTICES[i + 1], i + 1, destination, t, go, arrival);
        runner.root.position.copy(state.pos);
        runner.logicalYaw = state.yaw;
        runner.updatePose(state.clip, state.local, undefined, this.camera.position);
        if (destination === 4 && t > arrival + .28) runner.root.visible = false;
      });
      this.vfx.update(dt, this.camera);
      this.ballpark.update(dt, 0.57);
      return;
    }
    const swing = this.preview === 'contact' || this.preview === 'power' ? this.preview : null;
    const activePreset = this.cameraOverride ?? this.cameraPreset;
    const preview = this.cameraOverride ? null : this.preview;
    const targetPose = preview ? previewShot(preview,this.bats)
      : getCameraPresetPose(activePreset, this.elapsedSec, 0, this.throws, this.bats);
    if (this.camera.fov !== targetPose.fov) { this.camera.fov = targetPose.fov; this.camera.updateProjectionMatrix(); }
    this.cameraPose = preview ? targetPose : dampCameraPose(this.cameraPose, targetPose, dt, 6);
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const shake = computeShakeOffset(this.steadyCamera ? 0 : this.trauma, this.elapsedSec);

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
      if (pos === 'C') {
        const home = DIAMOND_DEFENDER_COORDS.find(coord => coord.pos === 'C')!;
        const offset = targetOffset(this.preview ?? 'attack_zone', this.bats);
        rig.root.position.set(home.x+offset.x,home.y,home.z);
        rig.updatePose(this.preview && !swing ? 'catch_target' : clip,this.elapsedSec,undefined,this.camera.position);
        // Keep both cleats planted as the catcher sets a high or low target.
        rig.root.scale.y = 1 + offset.y;
      } else rig.updatePose(clip, this.elapsedSec, undefined, this.camera.position);
    }
    if (this.pitch) this.drawPitch(this.pitch);
    else if (swing) {
      const pose = rehearsalPose(swing,this.elapsedSec-this.previewStart,this.steadyCamera);
      this.batterRig.updatePose(pose.clip,pose.time,undefined,this.camera.position);
    } else this.batterRig.updatePose(this.batterClip, this.elapsedSec, undefined, this.camera.position);
    for (const runner of this.runnerRigs) {
      if (runner.root.visible) {
        runner.updatePose('runner_lead', this.elapsedSec, undefined, this.camera.position);
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
    this.welcome.dispose();
    this.batterRig.dispose();
    for (const runner of this.runnerRigs) runner.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
