import type { CatalogPlayer, DrawCatalogPlayer } from '../catalog/playerCatalog';
import { rollBatsHand, rollThrowsHand } from '../handedness/handedness';
import type { FieldPosition } from '../handedness/types';
import type {
  LeagueTierId,
  LineupSlot,
  AiArchetype,
  Club,
  ClubColors,
  DefensiveLineupPosition,
} from '../models/club';
import {
  computePlayerOverall,
  createEmptySeasonStats,
  deriveCardRarity,
  isPitcherPosition,
  rollPlayerPortraitTraits,
  type CareerServiceProfile,
  type PersonalityArchetype,
  type Player,
  type PlayerMarketTier,
  type PlayerRatings,
  type PlayerSpecialistArchetype,
} from '../models/player';
import { generatePlayerIdentity } from '../nationalities/pickNationality';
import type { NationalityId } from '../nationalities/types';
import type { SeededRng } from '../rng/seededRng';
import { deriveExperienceTier, rollInitialCareerService } from '../rpg/careerExperience';
import {
  applyCoEdAttributeTilt,
  rollCoEdSpecialTrait,
} from '../rpg/coEdArchetypes';
import { rollMentalAndPressureProfile } from '../rpg/mentalAndLeverage';
import {
  computeTotalRatingBudget,
  rollBatterPitchProfile,
  rollPitcherArsenal,
} from '../rpg/pitchArsenals';
import { applyPitcherRoleShape, rollPitcherRole } from '../rpg/pitcherRoles';
import {
  applySpecialistRatingShape,
  evaluatePositionAssignment,
  rollPositionalEligibility,
  rollSpecialistArchetype,
} from '../rpg/specialistsAndPositions';
import { rollBattedBallProfile } from '../simulation/sabermetrics';
import {
  computeMarketContract,
  MARKET_TIER_SPECS,
  rollClubStarterMarketTier,
  rollLeagueTierAge,
  rollStatCapsForMarketTier,
} from './marketTiers';

import { createInitialEconomy, createInitialStadium } from '../models/club';
import { createDefaultCoachStaff } from '../models/manager';

export interface CreatePlayerOptions {
  identity?: CatalogPlayer;
  position: FieldPosition;
  tier: LeagueTierId;
  forcedNationalityId?: NationalityId;
  jerseyNumber?: number;
  idPrefix?: string;
  marketTier?: PlayerMarketTier;
  /** `league` keeps a rolled market tier but uses the league age pyramid. Presets omit this and lock age to the market tier. */
  ageMode?: 'market' | 'league';
  specialistArchetype?: PlayerSpecialistArchetype;
}

export interface CreateClubOptions {
  drawIdentity?: DrawCatalogPlayer;
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

const PERSONALITIES: readonly PersonalityArchetype[] = [
  'prankster',
  'clutch_captain',
  'quiet_assassin',
  'showboat',
  'gym_rat',
  'superstitious',
  'rival_hunter',
];

export const PITCHER_NICKNAMES = [
  'Corner Painter',
  'Ghost Heater',
  'Slider Wizard',
  'Curveball Kid',
  'Ice Mound',
  'Strikeout Star',
  'High Heat',
  'Paint Brush',
  'Wiffle Ace',
  'Sandlot Ace',
] as const;

export const SLUGGER_NICKNAMES = [
  'Moonshot',
  'Boomstick',
  'Sweet Swing',
  'Clutch Bat',
  'Bubblegum Bam',
  'Line Drive',
  'Rally Cap',
  'Sandlot Kid',
  'Gap Crusher',
  'Tape Measure',
] as const;

export const SPEED_DEFENSE_NICKNAMES = [
  'Turbo Cleats',
  'Dust Cloud',
  'Iron Glove',
  'Laser Arm',
  'Flash Step',
  'Gold Mitt',
  'Sparkplug',
  'Quick Hands',
  'Base Thief',
  'Web Gem',
] as const;

export function pickNicknameForRole(
  rng: SeededRng,
  position: FieldPosition,
  ratings: Pick<PlayerRatings, 'speed' | 'fielding' | 'power'>,
): string {
  if (isPitcherPosition(position)) {
    return rng.pick(PITCHER_NICKNAMES);
  }
  const prefersSpeedOrGlove =
    ratings.speed >= 62 ||
    ratings.fielding >= 64 ||
    ((position === 'SS' || position === '2B' || position === 'CF' || position === 'C') &&
      ratings.power < 62);
  return prefersSpeedOrGlove
    ? rng.pick(SPEED_DEFENSE_NICKNAMES)
    : rng.pick(SLUGGER_NICKNAMES);
}

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
    gapPower: isPitcher ? rollOff() : roll(Math.round((bias.power + bias.contact) * 0.5)),
    eye: isPitcher ? rollOff() : roll(bias.eye),
    bunt: clampStat(rng.int(Math.max(30, min - 10), max)),
    velocity: isPitcher ? roll(bias.velocity) : rollOff(),
    movement: isPitcher ? roll(bias.movement) : rollOff(),
    control: isPitcher ? roll(bias.control) : rollOff(),
    stamina: isPitcher ? roll(bias.stamina) : rollOff(),
    speed: clampStat(rng.int(min, max) + bias.speed),
    fielding: clampStat(rng.int(min, max) + bias.fielding),
    range: clampStat(rng.int(min, max) + Math.round((bias.fielding + bias.speed) * 0.5)),
    arm: clampStat(rng.int(min, max) + bias.arm),
    clutch: clampStat(rng.int(min, max)),
    luck: clampStat(rng.int(25, 85)),
    popularity: clampStat(rng.int(min, Math.min(99, max + 6))),
    potential: clampStat(rng.int(min + 4, Math.min(99, max + 10))),
  };
}

function buildPitcherOnlyProfile(
  rng: SeededRng,
  position: FieldPosition,
  throws: 'L' | 'R',
  specialistArchetype: PlayerSpecialistArchetype,
  specialistRatings: PlayerRatings,
  marketTier: PlayerMarketTier,
): {
  ratings: PlayerRatings;
  pitcherRole?: ReturnType<typeof rollPitcherRole>;
  pitchArsenal?: ReturnType<typeof rollPitcherArsenal>;
} {
  if (!isPitcherPosition(position)) {
    return { ratings: specialistRatings };
  }
  const pitcherRole = rollPitcherRole(rng, position, throws, specialistArchetype);
  const ratings = applyPitcherRoleShape(specialistRatings, pitcherRole);
  const pitchArsenal = rollPitcherArsenal(rng, position, specialistArchetype, ratings, marketTier);
  return { ratings, pitcherRole, pitchArsenal };
}

function playerBirthplace(rng: SeededRng, options: CreatePlayerOptions) {
  if (options.identity) return options.identity;
  const birth = generatePlayerIdentity(rng, options.forcedNationalityId);
  return { name: birth.fullName, nationalityId: birth.nationality.id, hometown: birth.hometown };
}

function playerProfile(
  rng: SeededRng,
  options: CreatePlayerOptions,
  marketTier: PlayerMarketTier,
  specialist: PlayerSpecialistArchetype,
) {
  const birthplace = playerBirthplace(rng, options);
  const personality = rng.pick(PERSONALITIES);
  const mental = rollMentalAndPressureProfile(rng, personality, marketTier);
  const bats = options.identity?.bats ?? rollBatsHand(rng);
  const throws = options.identity?.throws ?? rollThrowsHand(rng, options.position);
  const eligibility = rollPositionalEligibility(rng, options.position, throws, specialist);
  const traits = options.identity
    ? { ...options.identity.traits }
    : rollPlayerPortraitTraits(rng, rng.int(1, 999999));
  return { birthplace, bats, throws, traits, personality, mental, eligibility };
}

function alignServiceToLeagueAge(service: CareerServiceProfile, age: number): CareerServiceProfile {
  if (age <= 21) {
    const experienceScore = Math.min(4, service.experienceScore);
    return {
      seasonsPlayed: 0,
      careerPlayoffGames: 0,
      experienceScore,
      experienceTier: deriveExperienceTier(experienceScore),
    };
  }
  if (age >= 34) {
    const seasonsPlayed = Math.min(12, Math.max(7, age - 26));
    const experienceScore = Math.max(service.experienceScore, Math.min(100, seasonsPlayed * 8));
    return {
      seasonsPlayed,
      careerPlayoffGames: Math.max(service.careerPlayoffGames, 2),
      experienceScore,
      experienceTier: deriveExperienceTier(experienceScore),
    };
  }
  return service;
}

function careerServiceForPlayer(
  rng: SeededRng,
  marketTier: PlayerMarketTier,
  age: number,
  position: FieldPosition,
  locked: boolean,
): CareerServiceProfile {
  const rolled = rollInitialCareerService(rng, marketTier, age, position);
  if (locked) return rolled;
  return alignServiceToLeagueAge(rolled, age);
}

function playerId(rng: SeededRng, options: CreatePlayerOptions): string {
  if (options.identity) return options.identity.id;
  const token = rng.int(100000, 999999);
  return [options.idPrefix ?? 'plyr', options.position.toLowerCase(), token].join('-');
}

/** Generates a single deterministic player calibrated to position, league tier, market tier, and specialist role. */
export function createPlayer(rng: SeededRng, options: CreatePlayerOptions): Player {
  const band = TIER_RATING_BANDS[options.tier];
  const lockedAge = options.marketTier != null && options.ageMode !== 'league';
  const marketTier = options.marketTier ?? rollClubStarterMarketTier(rng, options.tier);
  const marketSpec = MARKET_TIER_SPECS[marketTier];
  const specialistArchetype =
    options.specialistArchetype ?? rollSpecialistArchetype(rng, options.position, marketTier);

  const { birthplace, bats, throws, traits, personality, mental, eligibility } =
    playerProfile(rng, options, marketTier, specialistArchetype);

  const shiftedMin = clampStat(band.min + marketSpec.ovrOffset);
  const shiftedMax = clampStat(band.max + marketSpec.ovrOffset);
  const baseRatings = rollRatingsForRole(rng, options.position, shiftedMin, shiftedMax);
  const specialistRatings = applySpecialistRatingShape(baseRatings, specialistArchetype, options.position);
  const { ratings: roleRatings, pitcherRole, pitchArsenal } = buildPitcherOnlyProfile(
    rng,
    options.position,
    throws,
    specialistArchetype,
    specialistRatings,
    marketTier,
  );
  const preCaps = rollStatCapsForMarketTier(rng, roleRatings, marketTier, options.position);
  const presentation = traits.playerLook === 'female' ? 'female' : 'male';
  const ratings = applyCoEdAttributeTilt(roleRatings, preCaps, presentation, options.position);
  const statCaps = rollStatCapsForMarketTier(rng, ratings, marketTier, options.position);
  const coEdTrait = rollCoEdSpecialTrait(rng, presentation, options.position);
  const batterPitchProfile = rollBatterPitchProfile(rng, specialistArchetype, ratings, marketTier);
  const battedBallProfile = rollBattedBallProfile(
    rng,
    options.position,
    specialistArchetype,
    pitchArsenal?.favoritePitch,
  );
  const totalRatingBudget = computeTotalRatingBudget(marketTier, options.position);
  const age = rollLeagueTierAge(rng, options.tier, marketTier, lockedAge);
  const careerService = careerServiceForPlayer(rng, marketTier, age, options.position, lockedAge);
  const overall = computePlayerOverall({ position: options.position, ratings });
  return {
    id: playerId(rng, options),
    name: birthplace.name,
    nickname: pickNicknameForRole(rng, options.position, ratings),
    age,
    position: options.position,
    secondaryPositions: eligibility.secondaryPositions,
    bats,
    throws,
    jerseyNumber: options.jerseyNumber ?? rng.int(1, 99),
    nationalityId: birthplace.nationalityId,
    hometown: birthplace.hometown,
    personality,
    rarity: deriveCardRarity(overall),
    traits,
    bio: rng.pick(BIOS),
    level: 1,
    xp: 0,
    skillPoints: 0,
    unlockedSkillIds: [],
    equippedPowerIds: [],
    equippedRelicIds: [],
    heritageTierUnlocked: 0,
    marketTier,
    specialistArchetype,
    ...(pitcherRole ? { pitcherRole } : {}),
    flexibilityProfile: eligibility.flexibilityProfile,
    favoritePosition: eligibility.favoritePosition,
    positionProficiency: eligibility.positionProficiency,
    ...(pitchArsenal ? { pitchArsenal } : {}),
    batterPitchProfile,
    battedBallProfile,
    mentalTraits: mental.mentalTraits,
    pressureProfile: mental.pressureProfile,
    careerService,
    coEdTrait,
    ratings,
    statCaps,
    totalRatingBudget,
    xpGrowthMultiplier: marketSpec.xpGrowthMultiplier,
    fatigue: 0,
    morale: 75,
    formScore: 0,
    formState: 'neutral',
    contract: computeMarketContract(rng, marketTier, band.salaryBase, overall),
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
    const fitBonus = (p: Player): number => {
      const posEval = evaluatePositionAssignment(p, pos);
      if (posEval.isFavorite) return 240;
      return !posEval.isOutOfPosition ? 110 + posEval.proficiency * 0.4 : 0;
    };
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
      identity: options.drawIdentity?.(position),
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
