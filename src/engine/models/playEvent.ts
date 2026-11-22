import type { FieldPosition } from '../handedness/types';
import type { BallVfxStyle } from '../vfx/types';
import type { BattedBallType, PitchType } from './player';

export type PlaySoundCue =
  | 'bat_crack'
  | 'bomb_crack'
  | 'bunt_tap'
  | 'glove_pop'
  | 'pitch_whoosh'
  | 'comet_pitch'
  | 'knuckle_warble'
  | 'tornado_whoosh'
  | 'spring_boing'
  | 'strikeout_punch'
  | 'dirt_slide'
  | 'foul_clank'
  | 'double_play_snap'
  | 'error_bonk'
  | 'crowd_cheer'
  | 'crowd_gasp'
  | 'organ_charge'
  | 'organ_homerun'
  | 'organ_rally'
  | 'stadium_stomp_clap'
  | 'bullpen_phone'
  | 'fireworks_boom'
  | 'clutch_stinger'
  | 'card_flip'
  | 'trophy_fanfare'
  | 'level_up'
  | 'cash_chime'
  | 'ui_pop';

export type TacticalCall =
  | 'normal'
  | 'contact'
  | 'power'
  | 'bunt'
  | 'steal'
  | 'intentional_walk';

export type PlayEventType =
  | 'game_start'
  | 'inning_start'
  | 'at_bat_start'
  | 'manager_power_used'
  | 'pitch_thrown'
  | 'ball_in_play'
  | 'stolen_base_attempt'
  | 'pitching_change'
  | 'inning_end'
  | 'game_end';

export type AtBatOutcome =
  | 'ball'
  | 'called_strike'
  | 'swinging_strike'
  | 'foul'
  | 'walk'
  | 'strikeout'
  | 'single'
  | 'double'
  | 'triple'
  | 'home_run'
  | 'ground_out'
  | 'fly_out'
  | 'line_out'
  | 'double_play'
  | 'sac_fly'
  | 'fielding_error'
  | 'bunt_single'
  | 'bunt_out';

export interface PlayEvent {
  seq: number;
  type: PlayEventType;
  inning: number;
  half: 'TOP' | 'BOT';
  outsBefore: number;
  outsAfter: number;
  balls: number;
  strikes: number;
  awayScore: number;
  homeScore: number;
  basesAfter: [string | null, string | null, string | null];
  batterId?: string;
  pitcherId?: string;
  outcome?: AtBatOutcome;
  isClutchMoment: boolean;
  leverageIndex?: number;
  isRivalrySpark?: boolean;
  specialPowerTriggered?: {
    actor: 'pitcher' | 'batter' | 'fielder' | 'manager';
    powerId: string;
    calloutText: string;
    vfxColor: string;
  };
  ballFlight?: {
    style: BallVfxStyle;
    landingX: number;
    landingZ: number;
    apexY: number;
    durationSec: number;
  };
  fieldingHighlight?: {
    fielderId: string;
    fielderPos: FieldPosition;
    anim: 'field_run' | 'field_dive' | 'field_high_jump';
  };
  pitchThrown?: {
    pitchType: PitchType;
    mph: number;
    isFavoritePitch: boolean;
    isWeakPitchForPitcher: boolean;
    batterAffinity: 'favorite' | 'weak' | 'neutral';
  };
  battedBallType?: BattedBallType;
  commentary: string;
  soundCue?: PlaySoundCue;
  xpAwards?: { playerId: string; xp: number }[];
}

const HIT_OUTCOMES: ReadonlySet<AtBatOutcome> = new Set([
  'single',
  'double',
  'triple',
  'home_run',
  'bunt_single',
]);

/** Returns true when an at-bat outcome is an official base hit. */
export function isScoringOrHitOutcome(outcome: AtBatOutcome): boolean {
  return HIT_OUTCOMES.has(outcome);
}
