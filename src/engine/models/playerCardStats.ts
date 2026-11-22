import type { FieldPosition } from '../handedness/types';
import {
  computeBattingSabermetrics,
  computeFieldingSabermetrics,
  computePitchingSabermetrics,
  formatRate3,
} from '../simulation/sabermetrics';
import { isPitcherPosition, type Player } from './player';

export type CardRoleGroup = 'pitcher' | 'position_player';

export interface CardStatRow {
  key: string;
  label: string;
  value: number;
}

export interface PlayerCardStatProfile {
  roleGroup: CardRoleGroup;
  ratings: readonly CardStatRow[];
  statLine: string;
}

export interface LegacyCardStats {
  contact: number;
  power: number;
  speed: number;
  pitching: number;
  fielding: number;
}

function clampStat(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

/** Builds role-authentic rating bars and derived sabermetric stat line for a player card back. */
export function buildPlayerCardStatProfile(player: Player): PlayerCardStatProfile {
  if (isPitcherPosition(player.position)) {
    const p = computePitchingSabermetrics(player.seasonStats);
    return {
      roleGroup: 'pitcher',
      ratings: [
        { key: 'velocity', label: 'Velocity', value: player.ratings.velocity },
        { key: 'movement', label: 'Movement', value: player.ratings.movement },
        { key: 'control', label: 'Control', value: player.ratings.control },
        { key: 'stamina', label: 'Stamina', value: player.ratings.stamina },
        { key: 'clutch', label: 'Clutch', value: player.ratings.clutch },
      ],
      statLine: `ERA ${p.era.toFixed(2)} • WHIP ${p.whip.toFixed(2)} • K/9 ${p.kPer9.toFixed(1)} • Strk ${Math.round(p.strikeRate * 100)}%`,
    };
  }

  const b = computeBattingSabermetrics(player.seasonStats);
  const f = computeFieldingSabermetrics(player.seasonStats);
  return {
    roleGroup: 'position_player',
    ratings: [
      { key: 'contact', label: 'Contact', value: player.ratings.contact },
      { key: 'power', label: 'Power', value: player.ratings.power },
      { key: 'speed', label: 'Speed', value: player.ratings.speed },
      { key: 'fielding', label: 'Fielding', value: player.ratings.fielding },
      { key: 'arm', label: 'Arm', value: player.ratings.arm },
    ],
    statLine: `AVG ${formatRate3(b.avg)} • OBP ${formatRate3(b.obp)} • OPS ${formatRate3(b.ops)} • FPCT ${formatRate3(f.fpct)}`,
  };
}

/** Derives role-authentic card stat rows when only lightweight legacy showcase stats are provided. */
export function buildFallbackCardStatRows(
  position: FieldPosition,
  legacy: LegacyCardStats,
): readonly CardStatRow[] {
  if (isPitcherPosition(position)) {
    const staminaBase = position === 'SP' ? legacy.pitching - 4 : legacy.pitching - 14;
    return [
      { key: 'velocity', label: 'Velocity', value: clampStat(legacy.pitching) },
      { key: 'movement', label: 'Movement', value: clampStat(legacy.pitching - 2) },
      { key: 'control', label: 'Control', value: clampStat((legacy.pitching + legacy.fielding) / 2) },
      { key: 'stamina', label: 'Stamina', value: clampStat(staminaBase) },
      { key: 'fielding', label: 'Fielding', value: clampStat(legacy.fielding) },
    ];
  }

  return [
    { key: 'contact', label: 'Contact', value: clampStat(legacy.contact) },
    { key: 'power', label: 'Power', value: clampStat(legacy.power) },
    { key: 'speed', label: 'Speed', value: clampStat(legacy.speed) },
    { key: 'fielding', label: 'Fielding', value: clampStat(legacy.fielding) },
    { key: 'arm', label: 'Arm', value: clampStat((legacy.fielding + legacy.power) / 2) },
  ];
}
