import { rollBatsHand, rollThrowsHand } from '../handedness/handedness';
import type { FieldPosition } from '../handedness/types';
import {
  createInitialEconomy,
  createInitialStadium,
  type AiArchetype,
  type Club,
  type ClubColors,
  type DefensiveLineupPosition,
  type LeagueTierId,
  type LineupSlot,
} from '../models/club';
import { createDefaultCoachStaff } from '../models/manager';
import {
  computePlayerOverall,
  createEmptySeasonStats,
  deriveCardRarity,
  isPitcherPosition,
  rollPlayerPortraitTraits,
  type PersonalityArchetype,
  type Player,
  type PlayerRatings,
} from '../models/player';
import { generatePlayerIdentity } from '../nationalities/pickNationality';
import type { NationalityId } from '../nationalities/types';
import type { SeededRng } from '../rng/seededRng';

export interface CreatePlayerOptions {
  position: FieldPosition;
  tier: LeagueTierId;
  forcedNationalityId?: NationalityId;
  jerseyNumber?: number;
  idPrefix?: string;
}

export interface CreateClubOptions {
  id: string;
  city: string;
  name: string;
  mascot: string;
  colors: ClubColors;
  leagueTier: LeagueTierId;
  isHuman: boolean;
  aiArchetype?: AiArchetype;
  stadiumName?: string;
}

export interface LineupValidationResult {
  valid: boolean;
  errors: string[];
}

const TIER_RATING_BANDS: Readonly<
  Record<LeagueTierId, { min: number; max: number; salaryBase: number }>
> = {
  rookie: { min: 42, max: 66, salaryBase: 600 },
  low_a: { min: 49, max: 72, salaryBase: 1100 },
  high_a: { min: 56, max: 78, salaryBase: 1800 },
  aa: { min: 62, max: 84, salaryBase: 3200 },
  aaa: { min: 68, max: 90, salaryBase: 6000 },
  majors: { min: 74, max: 96, salaryBase: 12000 },
};

const CORE_FIELD_POSITIONS: readonly Exclude<FieldPosition, 'SP' | 'RP'>[] = [
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];

const EXTRA_POSITION_POOL: readonly Exclude<FieldPosition, 'SP' | 'RP'>[] = [
  '1B',
  'LF',
  'CF',
  'RF',
  '3B',
  'C',
];

const REQUIRED_DEFENSIVE_POSITIONS: readonly DefensiveLineupPosition[] = [
  ...CORE_FIELD_POSITIONS,
  'DH',
];

const SECONDARY_POSITIONS_MAP: Readonly<Record<FieldPosition, readonly FieldPosition[]>> = {
  SP: ['RP'],
  RP: ['SP'],
  C: ['1B'],
  '1B': ['LF', '3B'],
  '2B': ['SS', '3B'],
  '3B': ['1B', '2B'],
  SS: ['2B', '3B'],
  LF: ['RF', 'CF'],
  CF: ['LF', 'RF'],
  RF: ['LF', 'CF'],
};

const PERSONALITIES: readonly PersonalityArchetype[] = [
  'prankster',
  'clutch_captain',
  'quiet_assassin',
  'showboat',
  'gym_rat',
  'superstitious',
  'rival_hunter',
];

const NICKNAMES = [
  'Sandlot Kid',
  'Turbo Cleats',
  'Laser Arm',
  'Bubblegum Bam',
  'Ghost Heater',
  'Corner Painter',
  'Dust Cloud',
  'Moonshot',
  'Iron Glove',
  'Rally Cap',
] as const;

const BIOS = [
  'Always arrives early with a pocket full of sunflower seeds and extra pine tar.',
  'Famous across the circuit for towering pre-game batting practice launches.',
  'Never steps on a chalk line and tips their cap toward the bullpen every inning.',
  'Built a backyard radar tunnel out of milk crates and a porch screen.',
] as const;

interface PositionBias {
  contact: number;
  power: number;
  eye: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  movement: number;
  control: number;
  stamina: number;
}

const ZERO_BIAS: PositionBias = {
  contact: 0,
  power: 0,
  eye: 0,
  speed: 0,
  fielding: 0,
  arm: 0,
  velocity: 0,
  movement: 0,
  control: 0,
  stamina: 0,
};

const POSITION_BIASES: Readonly<Record<FieldPosition, PositionBias>> = {
  SP: { ...ZERO_BIAS, stamina: 12, control: 4 },
  RP: { ...ZERO_BIAS, velocity: 8, movement: 6, stamina: -18 },
  C: { ...ZERO_BIAS, fielding: 6, arm: 8, speed: -8 },
  '1B': { ...ZERO_BIAS, power: 10, speed: -6, contact: 3 },
  '2B': { ...ZERO_BIAS, contact: 5, fielding: 6, speed: 5, power: -5 },
  '3B': { ...ZERO_BIAS, power: 7, arm: 7, speed: -2 },
  SS: { ...ZERO_BIAS, fielding: 9, arm: 6, speed: 6, power: -4 },
  LF: { ...ZERO_BIAS, power: 6, contact: 4 },
  CF: { ...ZERO_BIAS, speed: 10, fielding: 7 },
  RF: { ...ZERO_BIAS, power: 5, arm: 9 },
};

function clampStat(value: number): number {
  return Math.max(20, Math.min(99, Math.round(value)));
}

function rollRatingsForRole(
  rng: SeededRng,
  position: FieldPosition,
  min: number,
  max: number,
): PlayerRatings {
  const bias = POSITION_BIASES[position];
  const isPitcher = isPitcherPosition(position);
  const offRoleMax = Math.max(28, min - 6);
  const roll = (offset: number): number => clampStat(rng.int(min, max) + offset);
  const rollOff = (): number => clampStat(rng.int(22, offRoleMax));

  return {
    contact: isPitcher ? rollOff() : roll(bias.contact),
    power: isPitcher ? rollOff() : roll(bias.power),
    eye: isPitcher ? rollOff() : roll(bias.eye),
    bunt: clampStat(rng.int(Math.max(30, min - 10), max)),
    velocity: isPitcher ? roll(bias.velocity) : rollOff(),
    movement: isPitcher ? roll(bias.movement) : rollOff(),
    control: isPitcher ? roll(bias.control) : rollOff(),
    stamina: isPitcher ? roll(bias.stamina) : rollOff(),
    speed: clampStat(rng.int(min, max) + bias.speed),
    fielding: clampStat(rng.int(min, max) + bias.fielding),
    arm: clampStat(rng.int(min, max) + bias.arm),
    clutch: clampStat(rng.int(min, max)),
    popularity: clampStat(rng.int(min, Math.min(99, max + 6))),
    potential: clampStat(rng.int(min + 4, Math.min(99, max + 10))),
  };
}

/** Generates a single deterministic player calibrated to position and tier. */
export function createPlayer(rng: SeededRng, options: CreatePlayerOptions): Player {
  const band = TIER_RATING_BANDS[options.tier];
  const identity = generatePlayerIdentity(rng, options.forcedNationalityId);
  const bats = rollBatsHand(rng);
  const throws = rollThrowsHand(rng, options.position);
  const traitSeed = rng.int(1, 999999);
  const traits = rollPlayerPortraitTraits(rng, traitSeed);
  const ratings = rollRatingsForRole(rng, options.position, band.min, band.max);
  const overall = computePlayerOverall({ position: options.position, ratings });
  const token = rng.int(100000, 999999);
  const prefix = options.idPrefix ?? 'plyr';

  return {
    id: `${prefix}-${options.position.toLowerCase()}-${token}`,
    name: identity.fullName,
    nickname: rng.pick(NICKNAMES),
    age: rng.int(19, 32),
    position: options.position,
    secondaryPositions: [...SECONDARY_POSITIONS_MAP[options.position]],
    bats,
    throws,
    jerseyNumber: options.jerseyNumber ?? rng.int(1, 99),
    nationalityId: identity.nationality.id,
    hometown: identity.hometown,
    personality: rng.pick(PERSONALITIES),
    rarity: deriveCardRarity(overall),
    traits,
    bio: rng.pick(BIOS),
    level: 1,
    xp: 0,
    skillPoints: 1,
    unlockedSkillIds: [],
    equippedPowerIds: [],
    equippedRelicIds: [],
    heritageTierUnlocked: 0,
    ratings,
    fatigue: 0,
    morale: 75,
    formScore: 0,
    formState: 'neutral',
    contract: {
      salaryPerSeason: Math.round(band.salaryBase * (overall / 60)),
      yearsRemaining: rng.int(1, 3),
      signingBonus: Math.round(band.salaryBase * 0.25),
    },
    formerClubIds: [],
    seasonStats: createEmptySeasonStats(),
    careerStats: createEmptySeasonStats(),
    awards: [],
  };
}

function pickUniqueJerseyNumbers(rng: SeededRng, count: number): number[] {
  const chosen: number[] = [];
  const used = new Set<number>();
  while (chosen.length < count) {
    const candidate = rng.int(1, 99);
    if (!used.has(candidate)) {
      used.add(candidate);
      chosen.push(candidate);
    }
  }
  return chosen;
}

function scoreBatterValue(player: Player): number {
  const r = player.ratings;
  return r.contact * 0.35 + r.power * 0.35 + r.eye * 0.15 + r.speed * 0.15;
}

function takeBestCandidate<T>(
  pool: T[],
  scoreFn: (item: T) => number,
): T {
  let bestIndex = 0;
  let bestScore = scoreFn(pool[0]);
  for (let i = 1; i < pool.length; i += 1) {
    const candidateScore = scoreFn(pool[i]);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestIndex = i;
    }
  }
  const [selected] = pool.splice(bestIndex, 1);
  return selected;
}

function assignFieldStarters(
  hitters: readonly Player[],
): { player: Player; defensivePosition: DefensiveLineupPosition }[] {
  const remaining = [...hitters].sort((a, b) => scoreBatterValue(b) - scoreBatterValue(a));
  const assigned: { player: Player; defensivePosition: DefensiveLineupPosition }[] = [];

  for (const pos of CORE_FIELD_POSITIONS) {
    const fitBonus = (p: Player): number =>
      p.position === pos ? 200 : p.secondaryPositions.includes(pos) ? 80 : 0;
    const starter = takeBestCandidate(
      remaining,
      (p) => fitBonus(p) + p.ratings.fielding * 0.5 + scoreBatterValue(p),
    );
    assigned.push({ player: starter, defensivePosition: pos });
  }

  const dh = takeBestCandidate(remaining, scoreBatterValue);
  assigned.push({ player: dh, defensivePosition: 'DH' });
  return assigned;
}

/** Builds an optimal 9-man batting order covering every required defensive slot. */
export function buildOptimalLineup(roster: readonly Player[]): LineupSlot[] {
  const hitters = roster.filter((p) => !isPitcherPosition(p.position));
  const pool = assignFieldStarters(hitters);

  const slotScorers: ((player: Player) => number)[] = [
    (p) => p.ratings.speed * 0.5 + p.ratings.eye * 0.25 + p.ratings.contact * 0.25,
    (p) => p.ratings.contact * 0.5 + p.ratings.eye * 0.3 + p.ratings.speed * 0.2,
    (p) => p.ratings.contact * 0.4 + p.ratings.power * 0.4 + p.ratings.clutch * 0.2,
    (p) => p.ratings.power * 0.65 + p.ratings.clutch * 0.2 + p.ratings.contact * 0.15,
  ];

  const ordered: LineupSlot[] = [];
  for (const scorer of slotScorers) {
    const chosen = takeBestCandidate(pool, (entry) => scorer(entry.player));
    ordered.push({
      orderIndex: ordered.length,
      playerId: chosen.player.id,
      defensivePosition: chosen.defensivePosition,
    });
  }

  pool.sort((a, b) => scoreBatterValue(b.player) - scoreBatterValue(a.player));
  for (const leftover of pool) {
    ordered.push({
      orderIndex: ordered.length,
      playerId: leftover.player.id,
      defensivePosition: leftover.defensivePosition,
    });
  }
  return ordered;
}

/** Generates a complete 18-man seeded club with rotation, bullpen, and optimal lineup. */
export function createClub(rng: SeededRng, options: CreateClubOptions): Club {
  const jerseys = pickUniqueJerseyNumbers(rng, 18);
  const positions: FieldPosition[] = [
    ...CORE_FIELD_POSITIONS,
    ...Array.from({ length: 4 }, (_, i) => EXTRA_POSITION_POOL[(i + rng.int(0, 5)) % EXTRA_POSITION_POOL.length]),
    'SP',
    'SP',
    'SP',
    'RP',
    'RP',
    'RP',
  ];

  const roster = positions.map((position, idx) =>
    createPlayer(rng, {
      position,
      tier: options.leagueTier,
      jerseyNumber: jerseys[idx],
      idPrefix: options.id,
    }),
  );

  const byOvrDesc = (a: Player, b: Player): number =>
    computePlayerOverall(b) - computePlayerOverall(a);

  const rotationIds = roster.filter((p) => p.position === 'SP').sort(byOvrDesc).map((p) => p.id);
  const bullpenIds = roster.filter((p) => p.position === 'RP').sort(byOvrDesc).map((p) => p.id);

  return {
    id: options.id,
    isHuman: options.isHuman,
    city: options.city,
    name: options.name,
    mascot: options.mascot,
    colors: options.colors,
    leagueTier: options.leagueTier,
    aiArchetype: options.aiArchetype ?? 'moneyball',
    roster,
    academyProspects: [],
    lineup: buildOptimalLineup(roster),
    rotationIds,
    bullpenIds,
    rotationCursor: 0,
    coaches: createDefaultCoachStaff(),
    stadium: createInitialStadium(
      options.stadiumName ?? `${options.city} Sandlot Park`,
      options.leagueTier,
    ),
    economy: createInitialEconomy(options.leagueTier),
    wins: 0,
    losses: 0,
    streak: 0,
  };
}

function validateLineupIndices(lineup: readonly LineupSlot[], errors: string[]): void {
  if (lineup.length !== 9) {
    errors.push(`Lineup must have exactly 9 slots (received ${lineup.length}).`);
  }
  const hasBadIndex = lineup.some((slot, idx) => slot.orderIndex !== idx);
  if (hasBadIndex) {
    errors.push('Lineup slots must have sequential orderIndex values 0..8.');
  }
}

function validateLineupPlayers(
  rosterById: ReadonlyMap<string, Player>,
  lineup: readonly LineupSlot[],
  errors: string[],
): void {
  const seenIds = new Set<string>();
  for (const slot of lineup) {
    if (seenIds.has(slot.playerId)) {
      errors.push(`Duplicate player in lineup: ${slot.playerId}.`);
    }
    seenIds.add(slot.playerId);

    const player = rosterById.get(slot.playerId);
    if (!player) {
      errors.push(`Player ${slot.playerId} is not on club roster.`);
      continue;
    }
    if (isPitcherPosition(player.position)) {
      errors.push(`Pitcher ${player.name} (${player.position}) cannot bat in lineup.`);
    }
  }
}

function validateDefensivePositions(lineup: readonly LineupSlot[], errors: string[]): void {
  const assigned = new Set(lineup.map((slot) => slot.defensivePosition));
  const missing = REQUIRED_DEFENSIVE_POSITIONS.filter((pos) => !assigned.has(pos));
  if (missing.length > 0) {
    errors.push(`Missing defensive positions: ${missing.join(', ')}.`);
  }
}

/** Validates that a club's 9-man lineup contains 9 unique non-pitchers covering C..RF + DH. */
export function validateLineup(club: Pick<Club, 'roster' | 'lineup'>): LineupValidationResult {
  const errors: string[] = [];
  const rosterById = new Map(club.roster.map((player) => [player.id, player]));

  validateLineupIndices(club.lineup, errors);
  validateLineupPlayers(rosterById, club.lineup, errors);
  validateDefensivePositions(club.lineup, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}
