import type { Club } from '../models/club';
import { isPitcherPosition, type CardRarity, type Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { advanceStaffRankXp } from '../gm/staffProgression';
import {
  getRelicById,
  RELIC_CATALOG,
  rollVintageRelicDrop,
  type BaseballRelic,
  type RelicRarity,
} from '../rpg/relics';
import { addRelicToClubLocker, equipRelicFromClubLocker } from '../rpg/relicLocker';
import { applyPlayerXpAndLevelUps } from '../simulation/rewards';

export type FoilPackTierId = 'sandlot_foil' | 'rivalry_chrome' | 'championship_holo';

export type FoilCardKind =
  | 'relic'
  | 'cash_windfall'
  | 'training_xp'
  | 'hype_ticket'
  | 'staff_clinic_pass'
  | 'holo_upgrade';

export interface FoilPackCard {
  slot: 1 | 2 | 3;
  kind: FoilCardKind;
  rarity: RelicRarity;
  title: string;
  subtitle: string;
  relicId?: string;
  cashBonus?: number;
  xpBonus?: number;
  spBonus?: number;
  hypeBonus?: number;
  staffXpBonus?: number;
}

export interface OpenedFoilPackResult {
  tier: FoilPackTierId;
  tierLabel: string;
  cards: [FoilPackCard, FoilPackCard, FoilPackCard];
  gumTrivia?: string;
  pityTriggered?: boolean;
}

export const LEGENDARY_PITY_THRESHOLD = 4;

export const FOIL_PACK_TIER_LABELS: Readonly<Record<FoilPackTierId, string>> = {
  sandlot_foil: '1994 Sandlot Foil Pack',
  rivalry_chrome: 'Rivalry Chrome Booster',
  championship_holo: 'Championship Holo Pack',
};

const WAX_PACK_GUM_TRIVIA: readonly string[] = [
  '🍬 1994 Gum Fact: A major league baseball has exactly 108 double red stitches!',
  '🍬 1994 Gum Fact: The first baseball card bubblegum wax packs debuted in 1933!',
  '🍬 1994 Gum Fact: A pitcher standing 60 ft 6 in away gives batters under 0.4 seconds to swing!',
  '🍬 1994 Gum Fact: Only 15 players in pro history ever stole home in a World Series game!',
  '🍬 1994 Gum Fact: Switch hitters bat from the side opposite the pitcher to see breaking balls longer!',
  '🍬 1994 Gum Fact: The oldest wooden grandstand ballpark tradition began over a century ago!',
  '🍬 1994 Gum Fact: A knuckleball spins less than twice on its entire trip to home plate!',
  '🍬 1994 Gum Fact: Keep your Equipment Manager happy — upgraded ★★★ Relics pack +50% extra punch!',
];

function pickRelicForPackTier(
  rng: SeededRng,
  tier: FoilPackTierId,
  forceLegendary = false,
): BaseballRelic {
  if (forceLegendary) {
    return rng.pick(RELIC_CATALOG.filter((r) => r.rarity === 'legendary'));
  }
  if (tier === 'championship_holo') {
    const elite = RELIC_CATALOG.filter((r) => r.rarity === 'legendary' || r.rarity === 'rare');
    return rng.pick(elite);
  }
  if (tier === 'rivalry_chrome' && rng.chance(0.55)) {
    const shiny = RELIC_CATALOG.filter((r) => r.rarity !== 'common');
    return rng.pick(shiny);
  }
  return rollVintageRelicDrop(rng);
}

function buildRelicCard(slot: 1 | 2 | 3, relic: BaseballRelic): FoilPackCard {
  return {
    slot,
    kind: 'relic',
    rarity: relic.rarity,
    title: relic.name,
    subtitle: `${relic.rarity.toUpperCase()} 90s Relic — ${relic.flavor}`,
    relicId: relic.id,
  };
}

function buildMiddleBoostCard(rng: SeededRng, tier: FoilPackTierId): FoilPackCard {
  const tierMult = tier === 'championship_holo' ? 2 : tier === 'rivalry_chrome' ? 1.5 : 1;
  const roll = rng.next();
  if (roll < 0.28) {
    const cash = Math.round(1500 * tierMult);
    return {
      slot: 2,
      kind: 'cash_windfall',
      rarity: tier === 'sandlot_foil' ? 'common' : 'rare',
      title: `+$${cash.toLocaleString()} Card-Shop Sponsorship`,
      subtitle: 'Local comic & card store sponsors your outfield fence!',
      cashBonus: cash,
    };
  }
  if (roll < 0.56) {
    const xp = Math.round(65 * tierMult);
    return {
      slot: 2,
      kind: 'training_xp',
      rarity: 'rare',
      title: `90s Cage & Lab Pass (+${xp} XP, +1 SP)`,
      subtitle: 'Choose ANY player to receive instant XP & +1 Skill Point!',
      xpBonus: xp,
      spBonus: 1,
    };
  }
  if (roll < 0.78) {
    const staffXp = Math.round(110 * tierMult);
    return {
      slot: 2,
      kind: 'staff_clinic_pass',
      rarity: 'rare',
      title: `Coaching Clinic Pass (+${staffXp} Staff XP)`,
      subtitle: 'Assign to any Coach, Doctor, or Trainer to boost their Star Rank!',
      staffXpBonus: staffXp,
    };
  }
  const hype = Math.round(16 * tierMult);
  return {
    slot: 2,
    kind: 'hype_ticket',
    rarity: 'common',
    title: `+${hype} Fan Hype Bobblehead Voucher`,
    subtitle: 'Packs the bleachers for your next home series!',
    hypeBonus: hype,
  };
}

function buildWildcardCard(
  rng: SeededRng,
  tier: FoilPackTierId,
  forceLegendary: boolean,
): FoilPackCard {
  if (forceLegendary) {
    return buildRelicCard(3, pickRelicForPackTier(rng, tier, true));
  }
  const roll = rng.next();
  if (tier === 'championship_holo' || roll < 0.42) {
    return buildRelicCard(3, pickRelicForPackTier(rng, tier));
  }
  if (roll < 0.68) {
    return {
      slot: 3,
      kind: 'holo_upgrade',
      rarity: 'legendary',
      title: '1994 Chrome Holo Card Stamp',
      subtitle: 'Upgrade any player’s baseball card rarity + +8 Popularity & +5 Fan Hype!',
      hypeBonus: 5,
    };
  }
  const jackpot = tier === 'rivalry_chrome' ? 3200 : 2200;
  return {
    slot: 3,
    kind: 'cash_windfall',
    rarity: 'legendary',
    title: `+$${jackpot.toLocaleString()} Mint Hologram Auction`,
    subtitle: 'Rare misprint card fetches top dollar for club payroll!',
    cashBonus: jackpot,
  };
}

/**
 * Deterministically opens a 3-card 1994 Foil Booster Pack with 6 connected card types,
 * wax-pack gum trivia, and Legendary Pity Protection (`packsSinceLegendary >= 4`).
 */
export function openFoilBoosterPack(
  rng: SeededRng,
  tier: FoilPackTierId,
  options?: { packsSinceLegendary?: number },
): OpenedFoilPackResult {
  const pityTriggered = (options?.packsSinceLegendary ?? 0) >= LEGENDARY_PITY_THRESHOLD;
  const card1 = buildRelicCard(1, pickRelicForPackTier(rng, tier, false));
  const card2 = buildMiddleBoostCard(rng, tier);
  const needsPityOnSlot3 = pityTriggered && card1.rarity !== 'legendary' && card2.rarity !== 'legendary';
  const card3 = buildWildcardCard(rng, tier, needsPityOnSlot3);
  return {
    tier,
    tierLabel: FOIL_PACK_TIER_LABELS[tier],
    cards: [card1, card2, card3],
    gumTrivia: rng.pick(WAX_PACK_GUM_TRIVIA),
    pityTriggered,
  };
}

const NEXT_RARITY_MAP: Readonly<Record<CardRarity, CardRarity>> = {
  rookie: 'allstar',
  allstar: 'mvp',
  mvp: 'mvp',
};

/** Applies a Foil Prospect Pass (`+XP, +SP`) to a player chosen by the manager. */
export function applyTrainingPassToPlayer(
  club: Club,
  playerId: string,
  xpBonus: number,
  spBonus: number,
): { club: Club; summary: string } {
  const target = club.roster.find((p) => p.id === playerId);
  if (!target) return { club, summary: 'Player not found.' };
  const leveled = applyPlayerXpAndLevelUps(target, xpBonus);
  const upgraded: Player = { ...leveled, skillPoints: leveled.skillPoints + spBonus };
  const lvNote = upgraded.level > target.level ? ` (⬆️ LV.${upgraded.level}!)` : '';
  return {
    club: { ...club, roster: club.roster.map((p) => (p.id === playerId ? upgraded : p)) },
    summary: `${target.name} gained +${xpBonus} XP & +${spBonus} SP${lvNote}!`,
  };
}

/** Applies a Foil Coaching Clinic Pass (`+Staff XP`) to a chosen staff member (or banks $900 if none hired). */
export function applyStaffClinicPassToClub(
  club: Club,
  staffId: string | null,
  staffXpBonus: number,
): { club: Club; summary: string } {
  const active = club.coaches.activeStaff ?? [];
  const target = staffId ? active.find((s) => s.id === staffId) : active[0];
  if (!target) {
    return {
      club: { ...club, economy: { ...club.economy, cash: club.economy.cash + 900 } },
      summary: 'No staff hired yet — redeemed Clinic Pass for +$900 cash!',
    };
  }
  const res = advanceStaffRankXp(target, staffXpBonus);
  const rankNote = res.notice ? ` (⭐ Promoted to ${res.notice.toRankLabel}!)` : '';
  return {
    club: {
      ...club,
      coaches: {
        ...club.coaches,
        activeStaff: active.map((s) => (s.id === target.id ? res.member : s)),
      },
    },
    summary: `${target.name} gained +${staffXpBonus} Staff XP${rankNote}!`,
  };
}

/** Applies a 1994 Chrome Holo Card Stamp to promote a chosen player's card rarity + Popularity + Fan Hype. */
export function applyHoloUpgradeToPlayer(
  club: Club,
  playerId: string,
): { club: Club; summary: string } {
  const target = club.roster.find((p) => p.id === playerId);
  if (!target) return { club, summary: 'Player not found.' };
  const nextRarity = NEXT_RARITY_MAP[target.rarity];
  const upgraded: Player = {
    ...target,
    rarity: nextRarity,
    ratings: { ...target.ratings, popularity: Math.min(99, target.ratings.popularity + 8) },
  };
  return {
    club: {
      ...club,
      roster: club.roster.map((p) => (p.id === playerId ? upgraded : p)),
      economy: { ...club.economy, teamHype: Math.min(100, club.economy.teamHype + 5) },
    },
    summary: `${target.name} stamped ${nextRarity.toUpperCase()} Holo (+8 Popularity, +5 Fan Hype)!`,
  };
}

function depositSingleBaseCard(
  club: Club,
  card: FoilPackCard,
): { club: Club; line: string } {
  if (card.kind === 'relic' && card.relicId) {
    return {
      club: addRelicToClubLocker(club, card.relicId, 1),
      line: `Added ${card.title} to your Club Relic Locker!`,
    };
  }
  if (card.kind === 'cash_windfall' && card.cashBonus) {
    return {
      club: { ...club, economy: { ...club.economy, cash: club.economy.cash + card.cashBonus } },
      line: `Banked +$${card.cashBonus.toLocaleString()} cash`,
    };
  }
  if (card.kind === 'hype_ticket' && card.hypeBonus) {
    return {
      club: {
        ...club,
        economy: { ...club.economy, teamHype: Math.min(100, club.economy.teamHype + card.hypeBonus) },
      },
      line: `Team Hype surged +${card.hypeBonus}`,
    };
  }
  const verb = card.kind === 'holo_upgrade' ? 'stamp' : 'assign';
  return { club, line: `Ready to ${verb}: ${card.title}` };
}

/**
 * Deposits pulled Relics into the Club Relic Locker & banks instant Cash/Hype WITHOUT silently auto-equipping
 * onto random players — giving the manager agency to equip or assign boosts interactively in FoilPackModal!
 */
export function depositFoilPackBaseRewards(
  club: Club,
  opened: OpenedFoilPackResult,
): { club: Club; summaryLines: string[] } {
  let nextClub = club;
  const summaryLines: string[] = [];
  for (const card of opened.cards) {
    const step = depositSingleBaseCard(nextClub, card);
    nextClub = step.club;
    summaryLines.push(step.line);
  }
  return { club: nextClub, summaryLines };
}

function findAutoRecipientId(club: Club, relicId: string): string | null {
  const relic = getRelicById(relicId);
  const preferPitcher = relic?.category === 'pitching';
  const match = club.roster.find(
    (p) =>
      isPitcherPosition(p.position) === preferPitcher &&
      (p.equippedRelicIds ?? []).length < 2 &&
      !(p.equippedRelicIds ?? []).includes(relicId),
  );
  return match?.id ?? null;
}

function autoEquipPulledRelic(club: Club, card: FoilPackCard): { club: Club; line: string } {
  if (!card.relicId) return { club, line: `Stored ${card.title} in Club Relic Locker!` };
  const targetId = findAutoRecipientId(club, card.relicId);
  const eq = targetId ? equipRelicFromClubLocker(club, targetId, card.relicId) : null;
  if (eq?.equipped && targetId) {
    const name = eq.club.roster.find((p) => p.id === targetId)?.name ?? 'player';
    return { club: eq.club, line: `Stored & equipped ${card.title} on ${name}!` };
  }
  return {
    club: { ...club, economy: { ...club.economy, cash: club.economy.cash + 1_000 } },
    line: `Duplicate ${card.title} stored + $1,000 collector rebate!`,
  };
}

function pickRisingProspect(roster: readonly Player[]): Player | undefined {
  let best = roster[0];
  let bestScore = -Infinity;
  for (const p of roster) {
    const score = Math.max(0, 28 - p.age) * 3 + p.xpGrowthMultiplier * 15 - p.level * 2;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

function autoAssignSingleCard(club: Club, card: FoilPackCard): { club: Club; line: string } {
  if (card.kind === 'relic') return autoEquipPulledRelic(club, card);
  if (card.kind === 'staff_clinic_pass') {
    const res = applyStaffClinicPassToClub(club, null, card.staffXpBonus ?? 110);
    return { club: res.club, line: res.summary };
  }
  const prospect = pickRisingProspect(club.roster);
  if (card.kind === 'training_xp' && prospect) {
    const res = applyTrainingPassToPlayer(club, prospect.id, card.xpBonus ?? 60, card.spBonus ?? 1);
    return { club: res.club, line: res.summary };
  }
  if (card.kind === 'holo_upgrade' && prospect) {
    const res = applyHoloUpgradeToPlayer(club, prospect.id);
    return { club: res.club, line: res.summary };
  }
  return depositSingleBaseCard(club, card);
}

/** Legacy/batch helper that applies all 3 revealed cards automatically (1 summary line per card). */
export function applyFoilPackRewardsToClub(
  club: Club,
  opened: OpenedFoilPackResult,
): { club: Club; summaryLines: string[] } {
  let nextClub = club;
  const summaryLines: string[] = [];
  for (const card of opened.cards) {
    if (card.kind === 'relic' && card.relicId) {
      nextClub = addRelicToClubLocker(nextClub, card.relicId, 1);
    }
    const step = autoAssignSingleCard(nextClub, card);
    nextClub = step.club;
    summaryLines.push(step.line);
  }
  return { club: nextClub, summaryLines };
}
