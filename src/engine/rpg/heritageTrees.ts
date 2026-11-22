import { NATIONALITIES_BY_ID } from '../nationalities/nationalitiesCatalog';
import type { HeritageAbilitySpec, NationalityId } from '../nationalities/types';
import type { Player, PlayerRatings } from '../models/player';
import { getMaxEquippedPowerSlots, type SkillRatingKey } from './skillTrees';
import { enforceRatingBudget } from './trainingCompromises';

export interface HeritageTierNode {
  tier: 1 | 2 | 3;
  spCost: 1 | 2 | 3;
  title: string;
  description: string;
  statBonuses: Readonly<Partial<Record<SkillRatingKey, number>>>;
  signaturePowerId?: string;
}

export interface HeritageBranchSpec {
  nationalityId: NationalityId;
  nationName: string;
  ability: HeritageAbilitySpec;
  tiers: readonly [HeritageTierNode, HeritageTierNode, HeritageTierNode];
}

export interface HeritageUnlockResult {
  unlocked: boolean;
  reason?: string;
  player: Player;
}

export interface HeritageCombatBonuses {
  passiveBonus: number;
  clutchBonus: number;
  hypeMultiplierBonus: number;
  signaturePowerReady: boolean;
  signaturePower?: HeritageAbilitySpec;
}

const CATEGORY_TIER1_BONUSES: Readonly<
  Record<HeritageAbilitySpec['category'], Readonly<Partial<Record<SkillRatingKey, number>>>>
> = {
  batting: { contact: 2, gapPower: 2 },
  pitching: { movement: 2, control: 2 },
  fielding: { fielding: 2, range: 2 },
  baserunning: { speed: 2, bunt: 2 },
  luck: { clutch: 2, eye: 2 },
};

const CATEGORY_TIER2_BONUSES: Readonly<
  Record<HeritageAbilitySpec['category'], Readonly<Partial<Record<SkillRatingKey, number>>>>
> = {
  batting: { power: 2, clutch: 2 },
  pitching: { velocity: 2, clutch: 2 },
  fielding: { arm: 2, clutch: 2 },
  baserunning: { speed: 2, clutch: 2 },
  luck: { contact: 2, clutch: 3 },
};

/** Returns the 3-tier Cultural Heritage Myth/Animal skill branch for any nationality. */
export function getHeritageBranch(nationalityId: NationalityId): HeritageBranchSpec {
  const nation = NATIONALITIES_BY_ID[nationalityId];
  const ability = nation.heritageAbility;
  const t1: HeritageTierNode = {
    tier: 1,
    spCost: 1,
    title: `${ability.name} I — Roots`,
    description: `Awaken ${ability.mythOrAnimal} discipline (+2 core heritage tools).`,
    statBonuses: CATEGORY_TIER1_BONUSES[ability.category],
  };
  const t2: HeritageTierNode = {
    tier: 2,
    spCost: 2,
    title: `${ability.name} II — Spirit`,
    description: `High-leverage ${ability.mythOrAnimal} surge (+3 clutch edge at LI >= 1.55).`,
    statBonuses: CATEGORY_TIER2_BONUSES[ability.category],
  };
  const t3: HeritageTierNode = {
    tier: 3,
    spCost: 3,
    title: `${ability.name} III — Signature`,
    description: `Unlocks active Myth/Animal Power: ${ability.shortEffect}`,
    statBonuses: { clutch: 2 },
    signaturePowerId: ability.id,
  };
  return {
    nationalityId,
    nationName: nation.name,
    ability,
    tiers: [t1, t2, t3],
  };
}

/** Checks whether a player can unlock the next Cultural Heritage tier (1 -> 2 -> 3). */
export function canUnlockNextHeritageTier(
  player: Pick<Player, 'nationalityId' | 'heritageTierUnlocked' | 'skillPoints'>,
): { allowed: boolean; nextTier?: HeritageTierNode; reason?: string } {
  const tierIdx = player.heritageTierUnlocked;
  if (tierIdx === 3) {
    return { allowed: false, reason: 'Cultural Heritage mastery already at Tier 3.' };
  }
  const branch = getHeritageBranch(player.nationalityId);
  const nextTier = branch.tiers[tierIdx];
  if (player.skillPoints < nextTier.spCost) {
    return {
      allowed: false,
      nextTier,
      reason: `Need ${nextTier.spCost} SP for ${nextTier.title}.`,
    };
  }
  return { allowed: true, nextTier };
}

function applyCappedBonuses(
  ratings: PlayerRatings,
  statCaps: PlayerRatings,
  bonuses: Readonly<Partial<Record<SkillRatingKey, number>>>,
): PlayerRatings {
  const next = { ...ratings };
  for (const [key, delta] of Object.entries(bonuses) as [SkillRatingKey, number][]) {
    next[key] = Math.min(statCaps[key], next[key] + delta);
  }
  return next;
}

/** Spends SP to unlock the next Cultural Heritage tier, equipping the Tier-3 Myth/Animal power. */
export function unlockNextHeritageTier(player: Player): HeritageUnlockResult {
  const check = canUnlockNextHeritageTier(player);
  if (!check.allowed || !check.nextTier) {
    return { unlocked: false, reason: check.reason, player };
  }

  const tierNode = check.nextTier;
  const boosted = applyCappedBonuses(player.ratings, player.statCaps, tierNode.statBonuses);
  const budgeted = enforceRatingBudget(boosted, player.position, player.totalRatingBudget);

  const nextEquipped = [...player.equippedPowerIds];
  const maxSlots = getMaxEquippedPowerSlots(player.level);
  if (tierNode.signaturePowerId && !nextEquipped.includes(tierNode.signaturePowerId)) {
    if (nextEquipped.length < maxSlots) {
      nextEquipped.push(tierNode.signaturePowerId);
    } else {
      nextEquipped[nextEquipped.length - 1] = tierNode.signaturePowerId;
    }
  }

  return {
    unlocked: true,
    player: {
      ...player,
      skillPoints: player.skillPoints - tierNode.spCost,
      heritageTierUnlocked: tierNode.tier,
      equippedPowerIds: nextEquipped,
      ratings: budgeted,
    },
  };
}

/** Evaluates live passive, high-leverage clutch, and Tier-3 signature heritage power effects. */
export function evaluateHeritageCombatBonuses(
  player: Pick<Player, 'nationalityId' | 'heritageTierUnlocked'>,
  leverageIndex: number,
): HeritageCombatBonuses {
  const tier = player.heritageTierUnlocked;
  if (tier === 0) {
    return {
      passiveBonus: 0,
      clutchBonus: 0,
      hypeMultiplierBonus: 0,
      signaturePowerReady: false,
    };
  }

  const branch = getHeritageBranch(player.nationalityId);
  const isHighLeverage = leverageIndex >= 1.55;
  return {
    passiveBonus: tier >= 1 ? 1.5 : 0,
    clutchBonus: tier >= 2 && isHighLeverage ? 3 : 0,
    hypeMultiplierBonus: tier >= 2 ? 0.1 : 0,
    signaturePowerReady: tier >= 3,
    signaturePower: tier >= 3 ? branch.ability : undefined,
  };
}
