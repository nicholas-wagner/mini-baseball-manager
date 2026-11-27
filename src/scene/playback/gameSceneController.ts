import type { GameDayWeather } from '../../engine/simulation/weather';
import type { PitchTargetIntent } from '../../engine/simulation/pitchMindGames';
import { parkLight } from '../ballpark/parkWeather';
import { barrelReplayTime, crowdReaction, decayExcitement } from './impactTiming';
import { FORCE_HOLD_SECONDS, forceReplayTime, isSwingPreview, previewShot, rehearsalPose, targetOffset, type AtBatPreview, type PlayerEntranceCue } from './firstAtBatPresentation';
import { playReadout } from './playReadout';
import { WalkoffTeammates } from '../characters/walkoffTeammates';
import { pitchFlightScale } from '../vfx/ballFlightVisual';
import { batterBox, headingToward, CATCHER_HOME } from './diamondLayout';
import { createDelivery, sampleDeliveryFlight, type ShowcaseDelivery } from '../vfx/showcaseDelivery';
import { runBases } from './outfieldPlay';
import { buntRunnerPose, diamondCamera, diamondPlay, forceAtFirst, heldRunnerLead, type DiamondPlay } from './diamondPlay';
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
  fitFieldOfView,
  dampCameraPose,
  getCameraPresetPose,
  type CameraPose,
  type CameraPresetId,
} from '../camera/cameraRig';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE, type CharacterAnimClip } from '../characters/animationState';
import { createPaintedPlayerRig, type PaintedPlayerRig } from '../characters/paintedPlayer';
import { createBallparkVfxSystem, inSwingArcWindow } from '../vfx/vfxSystem';
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

/** Default matchup camera: behind the catcher when batting, behind the pitcher when pitching. */
export function defaultMatchupCameraPreset(isHumanBatting: boolean): CameraPresetId {
  return isHumanBatting ? 'over_shoulder_batter' : 'over_shoulder_pitcher';
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
  private weather: GameDayWeather | null = null;
  private sky = new THREE.Color();
  private fog = new THREE.Fog(0xffffff,48,115);
  private ambient = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private crowdExcitement = .2;
  private queuedTarget: PitchTargetIntent | null = null;
  private calledTarget: PitchTargetIntent | null = null;
  private targetPlaced = false;

  private replay: { play: DiamondPlay; cheer: ReturnType<typeof crowdReaction>; cast: DiamondCast; start: number; rate: number; freezeAt?: number; readout: ReturnType<typeof playReadout>; runnerDestinations?: number[] } | null = null;
  private pitch: { play: ShowcaseDelivery; start: number; rate: number; initialized: boolean; callout?: ChoreographedStep['callout'] } | null = null;
  private targetRing = new THREE.Mesh(new THREE.RingGeometry(.19, .23, 40),
    new THREE.MeshBasicMaterial({ color: 0xffdc66, transparent: true, depthTest: false, depthWrite: false }));
  private pitcherRitual: CharacterAnimClip = 'pitch_gather';
  private batterRitual: CharacterAnimClip = 'bat_stance';
  private bats: EffectiveBatSide = 'R';
  private throws: ThrowsHand = 'R';
  private preview: AtBatPreview | null = null;
  private previewStart = 0;
  private queuedStance?: ReturnType<typeof rehearsalPose>;
  private shakeOffStart = -Infinity;

  public triggerPitcherShakeOff() {
    this.shakeOffStart = this.elapsedSec;
  }
  private entrance: PlayerEntranceCue | null = null;
  private entranceTime = 0;
  private finishEntrance?: () => void;
  private battingPlayers: Readonly<Record<string, Player>> = {};
  private battingColors = FALLBACK_TEAM;

  public setEntrance(cue: PlayerEntranceCue | null, onFinish?: () => void) {
    if (this.entrance?.outgoingId) {
      this.welcome.hide();
      const box = batterBox(this.bats);
      this.batterRig.root.position.copy(box.position);
      this.batterRig.logicalYaw = box.yaw;
    }
    this.entrance = this.cameraOverride ? null : cue;
    this.finishEntrance = onFinish;
    this.entranceTime = 0;
    if (cue && this.cameraOverride) onFinish?.();
    const outgoing = this.entrance?.outgoingId && this.battingPlayers[this.entrance.outgoingId];
    if (outgoing) {
      this.welcome.set([{ traits: outgoing.traits, team: this.battingColors, jerseyNumber: outgoing.jerseyNumber,
        throwsHand: outgoing.throws, batSide: resolveEffectiveBatSide(outgoing.bats, this.throws), role: 'batter' }]);
    }
  }

  private showGloveTap(time: number) {
    const outgoing = this.welcome.rigs[0];
    if (!outgoing) return;
    const contact = new THREE.Vector3(-4.1, .82, 1.6);
    const gap = .42 * (1 - THREE.MathUtils.smoothstep(time, 0, .56) + THREE.MathUtils.smoothstep(time, .78, 1.48));
    for (const [rig, direction] of [[outgoing, 1], [this.batterRig, -1]] as const) {
      rig.root.visible = true;
      rig.logicalYaw = direction * 1.25;
      rig.root.position.set(contact.x-direction*(.64+gap), .04, contact.z);
      const fist = rig.contactAt('glove_tap', time, rig.root.position, this.camera.position);
      rig.root.position.x += contact.x - direction * gap - fist.x;
      rig.root.position.z += contact.z - fist.z;
      rig.root.position.y += contact.y - fist.y;
      rig.updatePose('glove_tap', time, undefined, this.camera.position);
    }
  }
  public setPreview(intent: AtBatPreview | null) {
    this.setIdlePreview(intent);
  }

  public setIdlePreview(intent: AtBatPreview | null) {
    if (intent === this.preview) return;
    this.queuedStance = !intent && isSwingPreview(this.preview)
      ? rehearsalPose(this.preview,this.elapsedSec-this.previewStart,this.steadyCamera) : undefined;
    if (this.preview && !isSwingPreview(this.preview) && intent === null) this.queuedTarget = this.preview;
    if (intent) this.queuedTarget = null;
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
    this.targetRing.name = 'called pitch target';
    this.targetRing.visible = false;
    this.targetRing.renderOrder = 5;
    this.scene.add(this.targetRing);
    this.welcome=new WalkoffTeammates(this.scene);
    this.scene.background = this.sky;
    this.scene.fog = this.fog;

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

    this.scene.add(this.ambient, this.sun);

    this.ballpark = createMiniBallpark();
    this.scene.add(this.ballpark.group);
    this.setWeather(null);

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
      rig.root.name = role === 'fielder' ? coord.pos : role;
      this.defenders.set(coord.pos, rig);
      this.scene.add(rig.root);
    }

    this.batterRig = createPaintedPlayerRig(
      { traits: baseTraits, team: FALLBACK_TEAM, jerseyNumber: 7, role: 'batter' },
      batterBox('R').yaw,
    );
    this.batterRig.root.position.copy(batterBox('R').position);
    this.batterRig.root.name = 'batter';
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

  public setWeather(weather: GameDayWeather | null): void {
    this.weather = weather;
    const light = parkLight(weather);
    this.sky.set(light.sky);
    this.fog.color.setHex(light.fog);
    this.fog.far = weather?.condition === 'drizzle' ? 86 : 115;
    this.ambient.color.setHex(light.ambient);
    this.ambient.groundColor.setHex(light.ground);
    this.ambient.intensity = light.night ? .82 : 1.15;
    this.sun.color.setHex(light.sun);
    this.sun.intensity = light.intensity;
    this.sun.position.set(16,weather?.condition === 'golden_sunset' ? 9 : 28,18);
    this.ballpark.setWeather(weather,this.steadyCamera);
  }

  public setCameraOverride(preset: CameraPresetId | null, steady = false): void {
    this.steadyCamera = steady;
    this.ballpark.setWeather(this.weather,steady);
    this.vfx.setReducedMotion(steady);
    this.cameraOverride = preset;
  }

  public syncMatchup(
    awayClub: Club,
    homeClub: Club,
    session: GameSessionState,
    choreo?: ChoreographedStep | null,
    event?: PlayEvent | null,
  ): void {
    if (choreo && this.entrance) this.setEntrance(null);
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
    this.battingPlayers = battingSide.playersById;
    this.battingColors = battingTeam;
    this.targetRing.visible = false;

    const pitcher = fieldingSide.playersById[(choreo && event?.pitcherId) || fieldingSide.activePitcherId];
    const batterSlot = battingSide.lineup[battingSide.lineupIndex % battingSide.lineup.length];
    const batter = (choreo && event?.batterId && battingSide.playersById[event.batterId]) || battingSide.playersById[batterSlot.playerId];
    const effectiveBat = resolveEffectiveBatSide(batter.bats, pitcher.throws);

    this.batterRitual = batter.personality === 'superstitious' || batter.traits.seed % 3 === 0
      ? 'helmet_tip' : batter.traits.seed % 3 === 1 ? 'bat_contact_set' : 'bat_power_set';
    this.pitcherRitual = pitcher.personality === 'showboat' || pitcher.traits.seed % 3 === 0 ? 'pitch_salute' : 'pitch_gather';
    this.bats = effectiveBat;
    this.throws = pitcher.throws;
    const battingPreview = isSwingPreview(this.preview)
      ? rehearsalPose(this.preview,this.elapsedSec-this.previewStart,this.steadyCamera) : this.queuedStance;
    this.queuedStance = undefined;
    this.batterRig.updateAppearance({
      battingPreview: choreo ? battingPreview : undefined,
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
      rig.root.scale.y = 1;
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
        quietInfielder: defender.personality === 'quiet_assassin',
        checkedBase: (choreo?.basesBefore ?? session.bases).findIndex(Boolean) + 1,
        quietPitcher: defender.personality === 'quiet_assassin',
        reassurePitcher: coord.pos === 'C' && (session.balls >= 2 || fieldingSide.pitcherFatigue >= 60 || session.bases.filter(Boolean).length >= 2),
        team: fieldingTeam,
        jerseyNumber: defender.jerseyNumber,
        role: coord.pos === 'P' ? 'pitcher' : coord.pos === 'C' ? 'catcher' : 'fielder',
        throwsHand: defender.throws,
      });
      rig.preparePlayback();
    }

    const bases = (choreo?.outfield || choreo?.close || choreo?.infield === 'bunt_out' || choreo?.infield === 'bunt_single' || choreo?.infield === 'fielding_error') && choreo.basesBefore ? choreo.basesBefore : session.bases;
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

    const selected = this.preview && !isSwingPreview(this.preview) ? this.preview : this.queuedTarget;
    this.calledTarget = choreo ? choreo.play?.pitchTarget ?? selected : null;
    this.queuedTarget = null;
    this.targetPlaced = false;
    this.defenders.get('C')!.setCatchHeight(this.calledTarget ? targetOffset(this.calledTarget,this.bats).y : 0);
    this.replay = null;
    this.pitch = null;
    this.vfx.clear();
    this.welcome.hide();
    if (!choreo) {
      this.cameraPreset = defaultMatchupCameraPreset(battingSide.isHuman);
      this.pitcherClip = session.bases.some(Boolean) ? 'pitch_stretch_set' : 'pitch_set';
      this.batterClip = 'bat_stance';
      this.fielderClip = 'field_ready';
      this.highlightPos = null;
    }
    const play = choreo?.play ?? choreo?.close ?? choreo?.outfield ?? (choreo?.infield ? diamondPlay(choreo.infield, choreo.highlightFielderPos, event ?? undefined, undefined, event?.pitchThrown, (choreo.basesBefore ?? session.bases).some(Boolean)) : undefined);
    if (choreo) this.shakeOffStart = -Infinity;
    if (play && choreo) {
      const calledTarget = this.calledTarget ?? play.pitchTarget;
      if (play.close?.steal || play.kind === 'bullpen') this.calledTarget = null;
      else this.calledTarget = calledTarget ?? (play.close ? 'attack_zone' : null);
      if (play.outfield && (play.scorerBase || play.runnerToThird) && play.ending?.kind !== 'walkoff') {
        const candidates = battingClub.roster.filter(p => p.id !== batter.id && !bases.includes(p.id));
        const buddy = candidates.find(p => p.personality === 'showboat' || p.personality === 'prankster') ?? candidates[0];
        if (buddy) this.welcome.set([{traits:buddy.traits,jerseyNumber:buddy.jerseyNumber,throwsHand:buddy.throws,team:battingTeam,role:'fielder'}]);
      }
      if (play.ending?.kind==='walkoff') {
        const teammates=battingSide.lineup.map(slot=>battingSide.playersById[slot.playerId])
          .filter(p=>p && p.id!==batter.id && !bases.includes(p.id)).slice(0,2);
        this.welcome.set(teammates.map(p=>({traits:p.traits,jerseyNumber:p.jerseyNumber,throwsHand:p.throws,team:battingTeam,role:'fielder'})));
      }
      const at = (pos: DiamondDefenderPos) => this.defenders.get(pos)!;
      const reliefStrikeout = pitcher.position === 'RP' && event?.outcome === 'strikeout'
        && (event.isClutchMoment || (event.leverageIndex ?? 0) >= 1.3 || Boolean(choreo.basesBefore?.some(Boolean)));
      const rate = (play.duration + (play.holdForceCall ? FORCE_HOLD_SECONDS : 0) - (choreo.startAt ?? 0)) * 1000 / choreo.durationMs;
      this.replay = { freezeAt:choreo.freezeAt, play: { ...play, battingPreview, batterView: play.batterView ?? battingSide.isHuman, pitchTarget: calledTarget ?? play.pitchTarget, reliefStrikeout, mascotCannon: homeClub.stadium.hasMascotCannon },
        cheer: crowdReaction(play), readout: playReadout(event), cast: { C: at('C'), P: at('P'), SS: at('SS'), '1B': at('1B'), '2B': at('2B'),
        '3B': at('3B'), LF: at('LF'), CF: at('CF'), RF: at('RF'),
        BAT: this.batterRig, RUN: this.runnerRigs[play.scorerBase ? play.scorerBase-1 : play.runnerToThird ? play.runnerToThird-1 : play.close?.steal ? play.close.fromBase - 1 : play.kind === 'sac_fly' ? 2 : 0] },
        runnerDestinations: (play.outfield || play.close || play.kind === 'bunt_single' || play.kind === 'fielding_error') && event ? bases.map((id, i) => {
          if (!id) return i + 1;
          const dest = event.basesAfter.indexOf(id);
          if (dest >= 0) return dest + 1;
          return play.outfield?.caught && play.kind !== 'sac_fly' ? i + 1 : 4;
        }) : undefined,
        start: this.elapsedSec - (choreo.startAt ?? 0) / rate, rate };
      return;
    }
    if (choreo) {
      this.cameraPreset =
        battingSide.isHuman && choreo.cameraPreset === 'over_shoulder_pitcher'
          ? 'over_shoulder_batter'
          : choreo.cameraPreset;
      this.pitcherClip = choreo.pitcherClip;
      this.batterClip = choreo.batterClip;
      this.fielderClip = choreo.fielderClip;
      this.highlightPos =
        choreo.highlightFielderPos === 'SP' || choreo.highlightFielderPos === 'RP'
          ? 'P'
          : (choreo.highlightFielderPos ?? null);

      if (event?.type === 'pitch_thrown' && choreo.ballStyle) {
        const play = createDelivery(choreo.ballStyle, this.throws, this.bats, choreo.pitcherClip, choreo.batterClip);
        // The Design Lab showcase defaults to a full windup. Match standalone live
        // cues to the same occupied-base clock as a complete diamond replay.
        if (choreo.pitcherClip === 'pitch_stretch') {
          const release = CLIP_DURATIONS.pitch_stretch * PITCH_RELEASE_PHASE;
          const advance = play.releaseAt - release;
          play.pitcherClip = 'pitch_stretch';
          play.releaseAt = release;
          play.swingAt -= advance;
          play.plateAt -= advance;
        }
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

  public finishReplay() {
    if (!this.replay) return;
    const { play, rate } = this.replay;
    const duration = play.duration + (play.holdForceCall ? FORCE_HOLD_SECONDS : 0);
    this.replay.start = this.elapsedSec - duration / rate;
  }

  private showCalledTarget(time: number, plate: number, cameraPosition: THREE.Vector3Like) {
    this.targetRing.visible = Boolean(this.calledTarget && time < plate + .32);
    if (!this.targetRing.visible || !this.calledTarget) return;
    if (!this.targetPlaced) {
      const offset = targetOffset(this.calledTarget,this.bats);
      const origin = { ...CATCHER_HOME, x:CATCHER_HOME.x + offset.x };
      const catcher = this.defenders.get('C')!;
      catcher.setCatchHeight(offset.y);
      this.targetRing.position.copy(catcher.contactAt('catch_target',0,origin,cameraPosition));
      this.targetPlaced = true;
    }
    this.targetRing.material.opacity = .46 * (1 - THREE.MathUtils.smoothstep(time,plate+.16,plate+.32));
  }

  private drawPitch(pitch: NonNullable<GameSceneController['pitch']>) {
    const { play } = pitch;
    const time = (this.elapsedSec - pitch.start) * pitch.rate;
    const pitcher = this.defenders.get('P')!;
    const catcher = this.defenders.get('C')!;
    this.showCalledTarget(time,play.plateAt,this.camera.position);
    this.targetRing.quaternion.copy(this.camera.quaternion);
    if (this.calledTarget) catcher.root.position.x = CATCHER_HOME.x + targetOffset(this.calledTarget,this.bats).x;
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
    const fullSwing = this.batterClip === 'bat_swing' || this.batterClip === 'bat_bomb';
    const barrel = fullSwing && !this.vfx.reducedMotion && inSwingArcWindow(receive)
      ? this.batterRig.contactAt(this.batterClip,play.plateAt-play.swingAt,this.batterRig.root.position,this.camera.position) : null;
    this.vfx.drawSwingArc(barrel,this.bats,receive);
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
      this.crowdExcitement = decayExcitement(this.crowdExcitement,elapsed);
      this.updateScene(dt, elapsed);
      this.ballpark.update(this.elapsedSec,this.crowdExcitement);
      this.vfx.update(dt,this.camera,this.container.clientHeight);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateScene(dt: number, elapsed: number): void {
    if (this.replay) {
      const { play, cast, start, rate, runnerDestinations } = this.replay;
      const raw = (this.elapsedSec - start) * rate;
      const limit = this.replay.freezeAt ?? Infinity;
      const clock = Math.min(raw, limit);
      const previous = Math.min(raw - elapsed * rate, limit);
      const sample = (value: number) => {
        const held = play.holdForceCall ? forceReplayTime(value,play.finish) : value;
        return this.steadyCamera ? held : barrelReplayTime(play,held,rate);
      };
      const t = sample(clock), prior = sample(previous);
      const cheer = this.replay.cheer;
      if (cheer && prior < cheer.at && t >= cheer.at) {
        this.crowdExcitement = Math.max(this.crowdExcitement,cheer.level);
        if (cheer.stand) this.ballpark.cheerBehindHome(this.elapsedSec);
      }
      if (cheer?.stand && play.ending?.kind === 'walkoff' && prior < play.pickupAt && t >= play.pickupAt) {
        this.crowdExcitement = Math.max(this.crowdExcitement,.72);
        this.ballpark.cheerBehindHome(this.elapsedSec);
      }
      const fixedShot = this.cameraOverride
        ? getCameraPresetPose(this.cameraOverride,this.elapsedSec,0,this.throws,this.bats) : undefined;
      if (this.calledTarget && (this.targetRing.visible || !this.targetPlaced)) {
        const eye = this.targetPlaced ? this.camera.position : (fixedShot ?? diamondCamera(play,0,this.bats,this.throws)).position;
        this.showCalledTarget(t,play.legs[0].end,eye);
      }
      renderDiamondPlay(play, cast, this.bats, t, prior, this.camera, this.container.clientHeight,
        this.vfx, this.throws, fixedShot, this.welcome.rigs, this.replay.readout);
      this.runnerRigs.forEach((runner, i) => {
        if (!runner.root.visible || ((play.scorerBase || play.runnerToThird || play.kind === 'double_play' || play.kind === 'sac_fly' || play.close?.steal) && runner === cast.RUN)) return;
        const advancing = play.buntAdvances?.some(from => from === i + 1);
        const destination = advancing ? i + 2 : runnerDestinations?.[i];
        if (destination === undefined) {
          if (forceAtFirst(play)) runner.root.position.copy(heldRunnerLead(play, i+1, t));
          runner.updatePose('runner_lead', t, undefined, this.camera.position);
          return;
        }
        const go = play.close?.steal ? .52 : play.kind === 'ball_four' ? play.pickupAt+.60
          : (play.outfield?.caught ? play.pickupAt : play.legs[0].end) + .12;
        const arrival = advancing ? play.leadArrival : play.kind === 'ball_four' ? play.batterArrival : play.close?.steal ? play.leadArrival : go + (destination - i - 1) * 1.30;
        const state = advancing ? buntRunnerPose(play, i + 1, t) : runBases(BASE_PATH_VERTICES[i + 1], i + 1, destination, t, go, arrival);
        runner.root.position.copy(state.pos);
        runner.logicalYaw = state.yaw;
        runner.updatePose(state.clip, state.local, undefined, this.camera.position);
        if (destination === 4 && t > arrival + .28) runner.root.visible = false;
      });
      this.targetRing.quaternion.copy(this.camera.quaternion);
      return;
    }
    const swing = isSwingPreview(this.preview) ? this.preview : null;
    const activePreset = this.cameraOverride ?? this.cameraPreset;
    const preview = this.cameraOverride ? null : this.preview;
    // Loading a texture or compiling the first frame can take longer than the entrance.
    if (this.entrance) this.entranceTime += Math.min(elapsed, .10);
    const entranceTime = this.entranceTime;
    if (this.entrance && (entranceTime >= 1.6 || this.cameraOverride)) {
      const finished = this.finishEntrance;
      this.setEntrance(null);
      finished?.();
      this.previewStart = this.elapsedSec;
    }
    const tap = Boolean(this.entrance?.outgoingId && this.welcome.rigs[0]);
    const mound = this.defenders.get('P')!.root.position;
    const targetPose = tap ? {
      position: {x:-4.1,y:1.25,z:4.65}, lookAt: {x:-4.1,y:1,z:1.6}, fov: 40,
    } : this.entrance?.role === 'pitcher' ? {
      position: {x:mound.x+(this.throws === 'R' ? 1 : -1)*.42,y:mound.y+1.21,z:mound.z+1.94},
      lookAt: {x:mound.x,y:mound.y+1.08,z:mound.z}, fov: 32,
    } : preview ? previewShot(preview,this.bats)
      : getCameraPresetPose(activePreset, this.elapsedSec, 0, this.throws, this.bats);
    const fov = fitFieldOfView(targetPose.fov, this.camera.aspect);
    if (this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.cameraPose = (preview || this.entrance) ? targetPose : dampCameraPose(this.cameraPose, targetPose, dt, 6);
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

    this.targetRing.visible = Boolean(this.preview && !swing && !this.entrance && !this.pitch);
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
        rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, home.x+offset.x, 14, dt);
        rig.setCatchHeight(offset.y);
        if (this.targetRing.visible) {
          this.targetRing.material.opacity = .76;
          this.targetRing.position.copy(rig.contactAt('catch_target', this.elapsedSec, rig.root.position, this.camera.position));
          this.targetRing.quaternion.copy(this.camera.quaternion);
        } else rig.updatePose(clip, this.elapsedSec, undefined, this.camera.position);
      } else if (pos === 'P' && this.elapsedSec-this.shakeOffStart < CLIP_DURATIONS.pitch_shake_off) {
        rig.updatePose('pitch_shake_off',this.elapsedSec-this.shakeOffStart,undefined,this.camera.position);
      } else if (pos === 'P' && this.entrance?.role === 'pitcher') {
        rig.updatePose(this.pitcherRitual, entranceTime, undefined, this.camera.position);
      } else rig.updatePose(clip, this.elapsedSec, undefined, this.camera.position);
    }
    if (this.pitch) this.drawPitch(this.pitch);
    else if (tap) this.showGloveTap(entranceTime);
    else if (this.entrance?.role === 'batter') this.batterRig.updatePose(this.batterRitual, entranceTime, undefined, this.camera.position);
    else if (swing) {
      const pose = rehearsalPose(swing,this.elapsedSec-this.previewStart,this.steadyCamera);
      this.batterRig.updatePose(pose.clip,pose.time,undefined,this.camera.position);
    } else this.batterRig.updatePose(this.batterClip, this.elapsedSec, undefined, this.camera.position);
    for (const runner of this.runnerRigs) {
      if (runner.root.visible) {
        runner.updatePose('runner_lead', this.elapsedSec, undefined, this.camera.position);
      }
    }


  }

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.targetRing.geometry.dispose();
    this.targetRing.material.dispose();
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
