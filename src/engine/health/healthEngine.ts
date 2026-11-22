import type { Player, PlayerRatings } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import {
  getAllHealthConditions,
  getHealthConditionById,
  type ConditionCategory,
  type ConditionKind,
  type ConditionRarity,
  type HealthConditionDefinition,
} from './conditionsCatalog';
import {
  evaluateMedicalStaffEffects,
  type ClubMedicalStaff,
} from './medicalStaff';

export interface HealthToggleSettings {
  enableInjuries: boolean;
  enableIllnesses: boolean;
}

export interface ActiveHealthStatus {
  conditionId: string;
  name: string;
  kind: ConditionKind;
  rarity: ConditionRarity;
  category: ConditionCategory;
  gamesRemaining: number;
  seasonEnding: boolean;
  canPlayThrough: boolean;
  playingThrough: boolean;
  careerEndingTriggered: boolean;
  statPenalties: Partial<Record<keyof PlayerRatings, number>>;
}

// Low, fun-preserving base per-player-game probabilities
const BASE_INJURY_RATE_PER_GAME = 0.0042;
const BASE_ILLNESS_RATE_PER_GAME = 0.0024;

const RARITY_ROLL_THRESHOLDS: readonly { rarity: ConditionRarity; ceiling: number }[] = [
  { rarity: 'common', ceiling: 0.72 },
  { rarity: 'uncommon', ceiling: 0.93 },
  { rarity: 'rare', ceiling: 0.985 },
  { rarity: 'ultra_rare', ceiling: 1.0 },
];

function rollRarity(rng: SeededRng): ConditionRarity {
  const r = rng.next();
  for (const band of RARITY_ROLL_THRESHOLDS) {
    if (r <= band.ceiling) return band.rarity;
  }
  return 'common';
}

function matchesPlayerSex(def: HealthConditionDefinition, player: Player): boolean {
  if (def.applicableTo === 'all') return true;
  const look = player.traits.playerLook === 'female' ? 'female' : 'male';
  return def.applicableTo === look;
}

function getAgedVeteranCareerEndingChance(age: number): number {
  if (age < 32) return 0;
  if (age <= 33) return 0.04;
  if (age <= 35) return 0.18;
  if (age <= 37) return 0.4;
  return 0.65;
}

/** Instantiates a live ActiveHealthStatus for a specific condition and attaches it to a player. */
export function applyHealthConditionToPlayer(
  rng: SeededRng,
  player: Player,
  def: HealthConditionDefinition,
  medicalStaff?: ClubMedicalStaff,
): Player {
  const med = evaluateMedicalStaffEffects(def.category, medicalStaff);
  const rawGames = rng.int(def.minGamesOut, def.maxGamesOut);
  const adjustedGames = Math.max(1, Math.round(rawGames / med.healingSpeedMultiplier));
  const rawCareerRisk =
    def.severity === 'career_ending_risk' ? getAgedVeteranCareerEndingChance(player.age) : 0;
  const finalCareerRisk = Math.max(0, rawCareerRisk * (1 - med.careerEndingRiskReduction));

  const status: ActiveHealthStatus = {
    conditionId: def.id,
    name: def.name,
    kind: def.kind,
    rarity: def.rarity,
    category: def.category,
    gamesRemaining: adjustedGames,
    seasonEnding: def.severity === 'season_ending' || def.severity === 'career_ending_risk',
    canPlayThrough: def.canPlayThrough,
    playingThrough: false,
    careerEndingTriggered: finalCareerRisk > 0 && rng.chance(finalCareerRisk),
    statPenalties: { ...def.statPenalties },
  };
  return { ...player, activeHealthStatus: status };
}

function pickConditionForKind(
  rng: SeededRng,
  player: Player,
  kind: ConditionKind,
  catalog: readonly HealthConditionDefinition[],
): HealthConditionDefinition | null {
  const eligible = catalog.filter((c) => c.kind === kind && matchesPlayerSex(c, player));
  if (eligible.length === 0) return null;
  const rarity = rollRarity(rng);
  const tierMatches = eligible.filter((c) => c.rarity === rarity);
  return rng.pick(tierMatches.length > 0 ? tierMatches : eligible);
}

function tryRollConditionKind(
  rng: SeededRng,
  player: Player,
  kind: ConditionKind,
  baseRate: number,
  catalog: readonly HealthConditionDefinition[],
  medicalStaff?: ClubMedicalStaff,
): ActiveHealthStatus | null {
  const candidate = pickConditionForKind(rng, player, kind, catalog);
  if (!candidate) return null;
  const med = evaluateMedicalStaffEffects(candidate.category, medicalStaff);
  if (!rng.chance(baseRate * med.preventionMultiplier)) return null;
  return applyHealthConditionToPlayer(rng, player, candidate, medicalStaff).activeHealthStatus ?? null;
}

/** Runs the subtle, low-frequency post-game health check respecting independent toggles & medical prevention. */
export function evaluatePostGameHealthRoll(
  rng: SeededRng,
  player: Player,
  settings: HealthToggleSettings,
  medicalStaff?: ClubMedicalStaff,
  customConditions: readonly HealthConditionDefinition[] = [],
): ActiveHealthStatus | null {
  if (player.activeHealthStatus) return null;
  const catalog = getAllHealthConditions(customConditions);
  const fatigueBump = player.fatigue >= 75 ? 1.35 : 1.0;

  if (settings.enableInjuries) {
    const injury = tryRollConditionKind(
      rng,
      player,
      'injury',
      BASE_INJURY_RATE_PER_GAME * fatigueBump,
      catalog,
      medicalStaff,
    );
    if (injury) return injury;
  }

  if (settings.enableIllnesses) {
    return tryRollConditionKind(
      rng,
      player,
      'illness',
      BASE_ILLNESS_RATE_PER_GAME,
      catalog,
      medicalStaff,
    );
  }
  return null;
}

/** Toggles whether a player plays through a minor condition; strictly blocks mandatory-IL conditions like broken arms. */
export function setPlayerPlayThroughStatus(
  player: Player,
  playThrough: boolean,
): { allowed: boolean; reason?: string; player: Player } {
  const current = player.activeHealthStatus;
  if (!current) {
    return { allowed: false, reason: 'Player is currently healthy.', player };
  }
  if (playThrough && !current.canPlayThrough) {
    return {
      allowed: false,
      reason: `${current.name} requires mandatory IL rest and cannot be played through.`,
      player,
    };
  }
  return {
    allowed: true,
    player: {
      ...player,
      activeHealthStatus: { ...current, playingThrough: playThrough },
    },
  };
}

/** Returns effective rating penalties when playing through a minor condition (softened by Athletic Trainer). */
export function getActiveHealthRatingPenalties(
  player: Player,
  medicalStaff?: ClubMedicalStaff,
): Record<keyof PlayerRatings, number> {
  const zeros: Record<keyof PlayerRatings, number> = {
    contact: 0,
    power: 0,
    gapPower: 0,
    eye: 0,
    bunt: 0,
    velocity: 0,
    movement: 0,
    control: 0,
    stamina: 0,
    speed: 0,
    fielding: 0,
    range: 0,
    arm: 0,
    clutch: 0,
    luck: 0,
    popularity: 0,
    potential: 0,
  };
  const status = player.activeHealthStatus;
  if (!status || !status.playingThrough) return zeros;

  const med = evaluateMedicalStaffEffects(status.category, medicalStaff);
  for (const [key, delta] of Object.entries(status.statPenalties)) {
    if (typeof delta === 'number') {
      zeros[key as keyof PlayerRatings] = Math.round(delta * med.playThroughPenaltyScale);
    }
  }
  return zeros;
}

/** Advances healing by one game; specialty Team Doctors & resting off the lineup accelerate recovery. */
export function advancePlayerHealthRecovery(
  player: Player,
  medicalStaff?: ClubMedicalStaff,
  restedThisGame = true,
  customConditions: readonly HealthConditionDefinition[] = [],
): Player {
  const status = player.activeHealthStatus;
  if (!status) return player;

  const med = evaluateMedicalStaffEffects(status.category, medicalStaff);
  const restRate = restedThisGame ? 1.0 : 0.45;
  const healProgress = Math.max(0.4, restRate * med.healingSpeedMultiplier);
  const nextRemaining = Number(Math.max(0, status.gamesRemaining - healProgress).toFixed(2));

  if (nextRemaining <= 0) {
    const def = getHealthConditionById(status.conditionId, customConditions);
    const comebackMorale = def?.comebackBoost ? Math.min(100, player.morale + 18) : player.morale;
    return {
      ...player,
      morale: comebackMorale,
      activeHealthStatus: null,
    };
  }

  return {
    ...player,
    activeHealthStatus: {
      ...status,
      gamesRemaining: nextRemaining,
    },
  };
}
