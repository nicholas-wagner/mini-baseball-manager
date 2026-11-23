import { finishPlay } from './teamReactions';
import { closeKindFor, stealFrom } from './plateAndSteals';
import { BASE_PATH_VERTICES, OUTFIELD_STARTS } from './diamondLayout';
export { BASE_PATH_VERTICES } from './diamondLayout';
import { selectOutfieldKind } from './outfieldPlay';
import { diamondPlay, type DiamondPlay, selectDiamondPlay, type DiamondPlayKind } from './diamondPlay';
import type { FieldPosition } from '../../engine/handedness/types';
import type { AtBatOutcome, PlayEvent, PlaySoundCue } from '../../engine/models/playEvent';
import type { BallVfxStyle } from '../../engine/vfx/types';
import type { CameraPresetId, Vec3 } from '../camera/cameraRig';
import type { CharacterAnimClip } from '../characters/animationState';

export type DiamondDefenderPos = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export interface DefenderCoord {
  pos: DiamondDefenderPos;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export const DIAMOND_DEFENDER_COORDS: readonly DefenderCoord[] = [
  { pos: 'P', x: 0, y: 0.24, z: -10.2, yaw: 0 },
  { pos: 'C', x: 0, y: 0.04, z: 1.75, yaw: Math.PI },
  { pos: '1B', x: 8.8, y: 0.04, z: -11.4, yaw: 0 },
  { pos: '2B', x: 4.6, y: 0.04, z: -17.6, yaw: 0 },
  { pos: '3B', x: -8.8, y: 0.04, z: -11.4, yaw: 0 },
  { pos: 'SS', x: -4.6, y: 0.04, z: -17.6, yaw: 0 },
  { pos: 'LF', ...OUTFIELD_STARTS.LF, yaw: 0 },
  { pos: 'CF', ...OUTFIELD_STARTS.CF, yaw: 0 },
  { pos: 'RF', ...OUTFIELD_STARTS.RF, yaw: 0 },
] as const;

export interface ChoreographedStep {
  play?: DiamondPlay;
  close?: DiamondPlay;
  infield?: DiamondPlayKind;
  outfield?: DiamondPlay;
  basesBefore?: PlayEvent['basesAfter'];
  leadRunnerId?: string;
  cameraPreset: CameraPresetId;
  pitcherClip: CharacterAnimClip;
  batterClip: CharacterAnimClip;
  fielderClip: CharacterAnimClip;
  highlightFielderPos?: FieldPosition;
  ballStyle: BallVfxStyle | null;
  soundCue: PlaySoundCue | null;
  callout?: { text: string; color: string };
  durationMs: number;
}

const SPEED_DIVISOR: Record<1 | 2 | 4, number> = {
  1: 1,
  2: 1.85,
  4: 3.4,
};

interface OutcomePreset {
  cameraPreset: CameraPresetId;
  pitcherClip: CharacterAnimClip;
  batterClip: CharacterAnimClip;
  fielderClip: CharacterAnimClip;
  ballStyle: BallVfxStyle | null;
  baseDurationMs: number;
  callout?: { text: string; color: string };
}

const OUTCOME_PRESETS: Readonly<Record<AtBatOutcome, OutcomePreset>> = {
  ball: {
    cameraPreset: 'over_shoulder_pitcher',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_stance',
    fielderClip: 'field_ready',
    ballStyle: 'fastball',
    baseDurationMs: 750,
  },
  called_strike: {
    cameraPreset: 'over_shoulder_pitcher',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_stance',
    fielderClip: 'field_ready',
    ballStyle: 'fastball',
    baseDurationMs: 750,
    callout: { text: 'STRIKE!', color: '#FFC300' },
  },
  swinging_strike: {
    cameraPreset: 'over_shoulder_batter',
    pitcherClip: 'pitch_super',
    batterClip: 'bat_swing',
    fielderClip: 'field_ready',
    ballStyle: 'tornado_slider',
    baseDurationMs: 820,
    callout: { text: 'WHIFF!', color: '#4CC3FF' },
  },
  foul: {
    cameraPreset: 'over_shoulder_batter',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_swing',
    fielderClip: 'field_ready',
    ballStyle: 'fastball',
    baseDurationMs: 720,
    callout: { text: 'FOUL!', color: '#FBF4E4' },
  },
  walk: {
    cameraPreset: 'over_shoulder_pitcher',
    pitcherClip: 'idle',
    batterClip: 'idle',
    fielderClip: 'field_ready',
    ballStyle: 'fastball',
    baseDurationMs: 920,
    callout: { text: 'WALK!', color: '#2FB356' },
  },
  strikeout: {
    cameraPreset: 'over_shoulder_pitcher',
    pitcherClip: 'pitch_super',
    batterClip: 'bat_swing',
    fielderClip: 'field_ready',
    ballStyle: 'blazing_comet',
    baseDurationMs: 1100,
    callout: { text: 'STRUCK HIM OUT!', color: '#FF4D6D' },
  },
  single: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_swing',
    fielderClip: 'field_run',
    ballStyle: 'line_drive',
    baseDurationMs: 1200,
    callout: { text: 'BASE HIT!', color: '#2FB356' },
  },
  double: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_bomb',
    fielderClip: 'field_run',
    ballStyle: 'line_drive',
    baseDurationMs: 1400,
    callout: { text: 'DOUBLE!', color: '#FFC300' },
  },
  triple: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_bomb',
    fielderClip: 'field_dive',
    ballStyle: 'line_drive',
    baseDurationMs: 1550,
    callout: { text: 'TRIPLE!', color: '#00E5FF' },
  },
  home_run: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_bomb',
    fielderClip: 'field_high_jump',
    ballStyle: 'moonshot_hr',
    baseDurationMs: 1950,
    callout: { text: 'KA-BOOM! HOME RUN!', color: '#FFC300' },
  },
  ground_out: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_swing',
    fielderClip: 'field_run',
    ballStyle: 'line_drive',
    baseDurationMs: 1050,
  },
  fly_out: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_swing',
    fielderClip: 'field_run',
    ballStyle: 'line_drive',
    baseDurationMs: 1150,
  },
  line_out: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_swing',
    fielderClip: 'field_dive',
    ballStyle: 'line_drive',
    baseDurationMs: 1100,
    callout: { text: 'SNAGGED!', color: '#9B5DE5' },
  },
  double_play: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_swing',
    fielderClip: 'field_run',
    ballStyle: 'line_drive',
    baseDurationMs: 1350,
    callout: { text: 'DOUBLE PLAY!', color: '#FF4D6D' },
  },
  sac_fly: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_swing',
    fielderClip: 'field_run',
    ballStyle: 'line_drive',
    baseDurationMs: 1250,
    callout: { text: 'SAC FLY RBI!', color: '#2FB356' },
  },
  fielding_error: {
    cameraPreset: 'broadcast_diamond',
    pitcherClip: 'idle',
    batterClip: 'bat_swing',
    fielderClip: 'field_dive',
    ballStyle: 'line_drive',
    baseDurationMs: 1150,
    callout: { text: 'ERROR!', color: '#FF4D6D' },
  },
  bunt_single: {
    cameraPreset: 'over_shoulder_batter',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_bunt',
    fielderClip: 'field_run',
    ballStyle: 'ninja_bunt',
    baseDurationMs: 1150,
    callout: { text: 'NINJA BUNT!', color: '#00E5FF' },
  },
  bunt_out: {
    cameraPreset: 'over_shoulder_batter',
    pitcherClip: 'pitch_windup',
    batterClip: 'bat_bunt',
    fielderClip: 'field_run',
    ballStyle: 'ninja_bunt',
    baseDurationMs: 1000,
  },
};

/** Linearly interpolates along diamond basepaths between consecutive bases. */
export function interpolateBaserunnerPosition(
  fromBase: 0 | 1 | 2 | 3,
  toBase: 1 | 2 | 3 | 4,
  progress01: number,
): Vec3 {
  const clamped = Math.max(0, Math.min(1, progress01));
  const span = Math.max(1, toBase - fromBase);
  const scaled = clamped * span;
  const segOffset = Math.min(span - 1, Math.floor(scaled));
  const localT = scaled - segOffset;
  const start = BASE_PATH_VERTICES[fromBase + segOffset];
  const end = BASE_PATH_VERTICES[fromBase + segOffset + 1];

  return {
    x: start.x + (end.x - start.x) * localT,
    y: start.y + (end.y - start.y) * localT,
    z: start.z + (end.z - start.z) * localT,
  };
}

/** Maps a domain `PlayEvent` and game speed (1x/2x/4x) into timed 3D scene choreography. */
export function choreographPlayEvent(
  event: PlayEvent,
  speed: 1 | 2 | 4,
  basesBefore?: PlayEvent['basesAfter'],
  context: {walkoff?:boolean; winningRunIndex?:number; runsScored?:number} = {},
): ChoreographedStep {
  const divisor = SPEED_DIVISOR[speed];

  const closeKind = closeKindFor(event);
  const fromBase = basesBefore && stealFrom(basesBefore, event.basesAfter);
  const close = closeKind && (event.type !== 'stolen_base_attempt' || fromBase)
    ? diamondPlay(closeKind, undefined, event, fromBase) : undefined;

  if (event.type === 'stolen_base_attempt') {
    if (close) finishPlay(close,event.outsAfter===3,Boolean(context.walkoff),undefined);
    const stoleBase = event.outsAfter === event.outsBefore;
    return {
      play:close, close, basesBefore,
      cameraPreset: 'broadcast_diamond',
      pitcherClip: 'pitch_windup',
      batterClip: 'bat_stance',
      fielderClip: stoleBase ? 'field_run' : 'field_dive',
      highlightFielderPos: 'C',
      ballStyle: null,
      soundCue: event.soundCue ?? 'glove_pop',
      callout: stoleBase
        ? { text: 'SAFE! STOLEN BASE!', color: '#2FB356' }
        : { text: 'GUNNED DOWN!', color: '#FF4D6D' },
      durationMs: Math.round((close ? close.duration * 1000 : 1100) / divisor),
    };
  }

  if (event.outcome && OUTCOME_PRESETS[event.outcome]) {
    const preset = OUTCOME_PRESETS[event.outcome];
    const infield = selectDiamondPlay(event.outcome, event.battedBallType, event.fieldingHighlight?.fielderPos);
    const kind = selectOutfieldKind(event);
    const outfield = kind ? diamondPlay(kind, undefined, event) : undefined;
    const cover = infield==='ground_out' && event.fieldingHighlight?.fielderPos==='1B' &&
      (event.seq % 2 === 0 || (event.ballFlight && event.ballFlight.landingX < 8));
    const timed = close ?? outfield ?? (infield ? diamondPlay(cover?'cover_first':infield, event.fieldingHighlight?.fielderPos,event) : undefined);
    if (timed) {
      const scoringPlay = Boolean(outfield && (!outfield.outfield?.caught || kind==='sac_fly')) || context.walkoff;
      const crossed = ([3,2,1] as const).filter(base=>{
        const id = basesBefore?.[base-1];
        return id && !event.basesAfter.includes(id);
      });
      const scorer = scoringPlay && context.runsScored!==0 ? crossed[context.winningRunIndex ?? 0] : undefined;
      if (!scorer && (kind === 'double' || kind === 'triple') && event.basesAfter[2]) {
        timed.runnerToThird = ([2, 1] as const).find(base => basesBefore?.[base - 1] === event.basesAfter[2]);
        if (timed.runnerToThird) timed.leadArrival = timed.pickupAt + 1.35;
      }
      finishPlay(timed,event.outsAfter===3,Boolean(context.walkoff),scorer);
    }
    return {
      play:timed, infield, outfield, close, basesBefore,
      cameraPreset: event.isClutchMoment && preset.cameraPreset === 'over_shoulder_pitcher'
        ? 'over_shoulder_batter'
        : preset.cameraPreset,
      pitcherClip: close ? 'pitch_windup' : preset.pitcherClip,
      batterClip: close ? close.kind === 'swinging_third' || close.kind === 'foul_back' ? 'bat_swing' : 'bat_stance' : preset.batterClip,
      fielderClip: event.fieldingHighlight?.anim ?? preset.fielderClip,
      highlightFielderPos: event.fieldingHighlight?.fielderPos,
      ballStyle: event.ballFlight?.style ?? preset.ballStyle,
      soundCue: event.soundCue ?? null,
      callout: event.specialPowerTriggered
        ? { text: event.specialPowerTriggered.calloutText, color: event.specialPowerTriggered.vfxColor }
        : preset.callout,
      durationMs: Math.round((timed ? timed.duration * 1000 : preset.baseDurationMs) / divisor),
    };
  }

  const relief = event.type==='pitching_change' ? diamondPlay('bullpen') : undefined;
  return {
    play:relief, basesBefore,
    cameraPreset: event.type === 'game_end' ? 'broadcast_diamond' : 'over_shoulder_pitcher',
    pitcherClip: 'idle',
    batterClip: event.type === 'game_end' ? 'celebrate_hr' : 'bat_stance',
    fielderClip: event.type === 'game_end' ? 'celebrate_hr' : 'field_ready',
    ballStyle: null,
    soundCue: event.soundCue ?? null,
    callout: event.type === 'pitching_change' ? { text: 'BULLPEN CALL!', color: '#4CC3FF' } : undefined,
    durationMs: Math.round((relief ? relief.duration*1000 : 700) / divisor),
  };
}
