import { isPitcherPosition, type Player, type PlayerSeasonStats } from '../models/player';
import type { BatterBoxLine, PitcherBoxLine } from '../simulation/gameState';
import { SKILL_NODES_BY_ID, type SkillTreeNode } from './skillTrees';

export type SkillMasteryDiscipline =
  | 'power'
  | 'contact'
  | 'speed'
  | 'fielding'
  | 'heat'
  | 'spin'
  | 'command';

export type PlayerSkillMastery = Record<SkillMasteryDiscipline, number>;

export const DISCIPLINE_LABELS: Readonly<Record<SkillMasteryDiscipline, { label: string; icon: string; color: string }>> = {
  power: { label: 'Slugger Power', icon: '💣', color: '#E63946' },
  contact: { label: 'Contact & Eye', icon: '🎯', color: '#2FB356' },
  speed: { label: 'Speed & Small-Ball', icon: '⚡', color: '#F59E0B' },
  fielding: { label: 'Gold Glove Craft', icon: '🧤', color: '#0EA5E9' },
  heat: { label: 'Flamethrower Heat', icon: '🔥', color: '#E63946' },
  spin: { label: 'Spin Wizardry', icon: '🌀', color: '#9B5DE5' },
  command: { label: 'Pinpoint Command', icon: '🧊', color: '#0284C7' },
};

const NODE_DISCIPLINE_BY_ID: Readonly<Record<string, SkillMasteryDiscipline>> = {
  p_heat_1: 'heat',
  p_heat_2: 'heat',
  cap_blazing_comet: 'heat',
  p_spin_1: 'spin',
  p_spin_2: 'spin',
  cap_ghost_knuckle: 'spin',
  cap_tornado_slider: 'spin',
  p_paint_1: 'command',
  p_paint_2: 'command',
  p_stamina_2: 'command',
  cap_ice_veins: 'command',
  b_pwr_1: 'power',
  b_pwr_2: 'power',
  cap_moonshot_bomb: 'power',
  b_con_1: 'contact',
  b_con_2: 'contact',
  b_eye_2: 'contact',
  cap_rally_spark: 'contact',
  cap_laser_eye: 'contact',
  b_spd_1: 'speed',
  b_spd_2: 'speed',
  cap_ninja_bunt: 'speed',
  f_range_1: 'fielding',
  f_glove_1: 'fielding',
  f_arm_1: 'fielding',
  f_range_2: 'fielding',
  f_glove_2: 'fielding',
  f_arm_2: 'fielding',
  cap_sky_high_leap: 'fielding',
  cap_iron_vacuum: 'fielding',
  cap_cannon_arm: 'fielding',
};

const TIER_MASTERY_REQUIREMENT: Readonly<Record<1 | 2 | 3, number>> = {
  1: 0,
  2: 20,
  3: 50,
};

function clampMastery(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Maps any player skill tree node to its Skyrim-style Baseball Discipline Mastery lane. */
export function getNodeMasteryDiscipline(nodeOrId: string | SkillTreeNode): SkillMasteryDiscipline {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
  const direct = NODE_DISCIPLINE_BY_ID[id];
  if (direct) return direct;
  const node = typeof nodeOrId === 'string' ? SKILL_NODES_BY_ID[nodeOrId] : nodeOrId;
  if (node?.branch === 'pitcher') return 'command';
  if (node?.branch === 'fielder') return 'fielding';
  return 'contact';
}

/** Returns the Discipline Mastery score (`0`, `20`, or `50`) required to unlock a node's tier. */
export function getNodeMasteryRequirement(nodeOrId: string | SkillTreeNode): number {
  const node = typeof nodeOrId === 'string' ? SKILL_NODES_BY_ID[nodeOrId] : nodeOrId;
  if (!node) return 0;
  return TIER_MASTERY_REQUIREMENT[node.tier];
}

function seedFromRating(rating: number): number {
  // Smooth baseline: 30 rating -> ~12 mastery (ready to grow into Tier 2 in 1 season); 75+ -> 55+
  return clampMastery(Math.round(Math.max(0, (rating - 14) * 0.85)));
}

function pickSavedOrSeed(saved: number | undefined, fallbackRating: number): number {
  return saved === undefined ? seedFromRating(fallbackRating) : clampMastery(saved);
}

/**
 * Resolves a player's Discipline Mastery (`0..100` per baseball discipline).
 * Hydrates cleanly from existing ratings and already-unlocked nodes so legacy saves stay valid.
 */
export function resolvePlayerSkillMastery(
  player: Pick<Player, 'ratings' | 'unlockedSkillIds' | 'skillMastery'>,
): PlayerSkillMastery {
  const saved = player.skillMastery ?? {};
  const r = player.ratings;
  const base: PlayerSkillMastery = {
    power: pickSavedOrSeed(saved.power, r.power),
    contact: pickSavedOrSeed(saved.contact, (r.contact + r.eye) * 0.5),
    speed: pickSavedOrSeed(saved.speed, (r.speed + r.bunt) * 0.5),
    fielding: pickSavedOrSeed(saved.fielding, (r.fielding + r.range) * 0.5),
    heat: pickSavedOrSeed(saved.heat, r.velocity),
    spin: pickSavedOrSeed(saved.spin, r.movement),
    command: pickSavedOrSeed(saved.command, r.control),
  };

  for (const nodeId of player.unlockedSkillIds) {
    const disc = getNodeMasteryDiscipline(nodeId);
    base[disc] = Math.max(base[disc], getNodeMasteryRequirement(nodeId));
  }
  return base;
}

/** Evaluates whether a player's use-based Mastery meets a skill node's Skyrim tier threshold. */
export function checkNodeMasteryGate(
  player: Pick<Player, 'ratings' | 'unlockedSkillIds' | 'skillMastery'>,
  nodeId: string,
): { met: boolean; discipline: SkillMasteryDiscipline; current: number; required: number } {
  const discipline = getNodeMasteryDiscipline(nodeId);
  const required = getNodeMasteryRequirement(nodeId);
  const current = resolvePlayerSkillMastery(player)[discipline];
  return { met: current >= required, discipline, current, required };
}

const nz = (val: number | undefined): number => val ?? 0;

function applyBatterBoxMastery(next: PlayerSkillMastery, line: Partial<BatterBoxLine>): void {
  const pa = nz(line.atBats) + nz(line.walks);
  if (pa <= 0) return;
  const xbh = nz(line.doubles) + nz(line.triples) + nz(line.homeRuns) * 2;
  next.power = clampMastery(next.power + 1 + xbh * 3);
  next.contact = clampMastery(next.contact + 1 + nz(line.hits) * 2 + nz(line.walks) * 2);
  next.speed = clampMastery(next.speed + 1 + nz(line.stolenBases) * 4 + nz(line.runs));
  next.fielding = clampMastery(next.fielding + 2);
}

function applyPitcherBoxMastery(next: PlayerSkillMastery, line: Partial<PitcherBoxLine>): void {
  const work = nz(line.outsRecorded) + nz(line.pitchesThrown);
  if (work <= 0) return;
  const innings = Math.floor(nz(line.outsRecorded) / 3);
  const cleanCommand = nz(line.walks) === 0 && innings >= 1 ? 4 : 1;
  const ks = nz(line.strikeouts);
  next.heat = clampMastery(next.heat + 1 + ks * 2);
  next.spin = clampMastery(next.spin + 1 + Math.ceil(ks * 1.5) + innings);
  next.command = clampMastery(next.command + cleanCommand + innings * 2);
}

/** Awards brisk, non-grindy use-based Baseball Discipline Mastery after any live, 1-Pitch, or simmed game. */
export function awardDisciplineMasteryFromGame(
  player: Player,
  batterLine?: Partial<BatterBoxLine> | null,
  pitcherLine?: Partial<PitcherBoxLine> | null,
): Player {
  const next: PlayerSkillMastery = { ...resolvePlayerSkillMastery(player) };
  if (batterLine) applyBatterBoxMastery(next, batterLine);
  if (pitcherLine) applyPitcherBoxMastery(next, pitcherLine);
  return { ...player, skillMastery: next };
}

/** Awards brisk use-based Discipline Mastery from post-game `PlayerSeasonStats` deltas (live & simmed games). */
export function awardDisciplineMasteryFromStatDelta(
  player: Player,
  delta?: PlayerSeasonStats | null,
): Player {
  const current = resolvePlayerSkillMastery(player);
  if (!delta) return { ...player, skillMastery: current };
  const next: PlayerSkillMastery = { ...current };

  if (delta.atBats + delta.walks > 0) {
    const xbh = delta.doubles + delta.triples + delta.homeRuns * 2;
    next.power = clampMastery(next.power + 1 + xbh * 3);
    next.contact = clampMastery(next.contact + 1 + delta.hits * 2 + delta.walks * 2);
    next.speed = clampMastery(next.speed + 1 + delta.stolenBases * 4 + delta.hits);
    next.fielding = clampMastery(next.fielding + 2 + delta.putouts + delta.assists);
  }
  if (delta.inningsPitchedOuts + delta.pitchesThrown > 0) {
    const innings = Math.floor(delta.inningsPitchedOuts / 3);
    const cleanCommand = delta.pitchingWalks === 0 && innings >= 1 ? 4 : 1;
    next.heat = clampMastery(next.heat + 1 + delta.pitchingStrikeouts * 2);
    next.spin = clampMastery(next.spin + 1 + Math.ceil(delta.pitchingStrikeouts * 1.5) + innings);
    next.command = clampMastery(next.command + cleanCommand + innings * 2);
  }
  return { ...player, skillMastery: next };
}

const PRACTICE_MASTERY_MAP: Readonly<Record<string, readonly SkillMasteryDiscipline[]>> = {
  power_launch_cage: ['power'],
  contact_choke_up: ['contact'],
  fielding_fungos: ['fielding'],
  speed_sprint_track: ['speed'],
  velocity_conditioning: ['heat'],
  command_pinpoint: ['command', 'spin'],
  pitch_lab_improve: ['spin', 'command'],
  pitch_lab_learn: ['spin'],
  pitch_recognition: ['contact'],
};

/** Awards focused Discipline Mastery (`+6`) when a player trains in the Practice Complex. */
export function awardDisciplineMasteryFromPractice(player: Player, activityId: string): Player {
  const targets = PRACTICE_MASTERY_MAP[activityId];
  if (!targets || targets.length === 0) return player;
  const current = resolvePlayerSkillMastery(player);
  const next: PlayerSkillMastery = { ...current };
  for (const disc of targets) {
    next[disc] = clampMastery(next[disc] + 6);
  }
  return { ...player, skillMastery: next };
}

/** Returns the ordered primary disciplines for a player's role (3 pitching or 4 hitting/fielding). */
export function getDisciplinesForPlayer(player: Pick<Player, 'position'>): readonly SkillMasteryDiscipline[] {
  return isPitcherPosition(player.position)
    ? ['heat', 'spin', 'command']
    : ['power', 'contact', 'speed', 'fielding'];
}
