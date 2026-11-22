import type { Club } from '../models/club';
import { isPitcherPosition, type Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import {
  equipRelicOnPlayer,
  getRelicById,
  MAX_RELICS_PER_PLAYER,
  RELIC_CATALOG,
  rollVintageRelicDrop,
  type BaseballRelic,
  type RelicRarity,
} from '../rpg/relics';

export type FoilPackTierId = 'sandlot_foil' | 'rivalry_chrome' | 'championship_holo';

export type FoilCardKind = 'relic' | 'cash_windfall' | 'training_xp' | 'hype_ticket';

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
}

export interface OpenedFoilPackResult {
  tier: FoilPackTierId;
  tierLabel: string;
  cards: [FoilPackCard, FoilPackCard, FoilPackCard];
}

export const FOIL_PACK_TIER_LABELS: Readonly<Record<FoilPackTierId, string>> = {
  sandlot_foil: '1994 Sandlot Foil Pack',
  rivalry_chrome: 'Rivalry Chrome Booster',
  championship_holo: 'Championship Holo Pack',
};

function pickRelicForPackTier(rng: SeededRng, tier: FoilPackTierId): BaseballRelic {
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
  if (roll < 0.45) {
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
  if (roll < 0.8) {
    const xp = Math.round(60 * tierMult);
    return {
      slot: 2,
      kind: 'training_xp',
      rarity: 'rare',
      title: `90s Batting-Cage Pass (+${xp} XP, +1 SP)`,
      subtitle: 'Instant skill-point & XP boost for your rising prospect!',
      xpBonus: xp,
      spBonus: 1,
    };
  }
  const hype = Math.round(15 * tierMult);
  return {
    slot: 2,
    kind: 'hype_ticket',
    rarity: 'common',
    title: `+${hype} Fan Hype Bobblehead Voucher`,
    subtitle: 'Packs the bleachers for your next home series!',
    hypeBonus: hype,
  };
}

function buildWildcardCard(rng: SeededRng, tier: FoilPackTierId): FoilPackCard {
  if (tier === 'championship_holo' || rng.chance(0.45)) {
    return buildRelicCard(3, pickRelicForPackTier(rng, tier));
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

/** Deterministically opens a 3-card 1994 Foil Booster Pack for post-win & milestone rewards. */
export function openFoilBoosterPack(
  rng: SeededRng,
  tier: FoilPackTierId,
): OpenedFoilPackResult {
  const card1 = buildRelicCard(1, pickRelicForPackTier(rng, tier));
  const card2 = buildMiddleBoostCard(rng, tier);
  const card3 = buildWildcardCard(rng, tier);
  return {
    tier,
    tierLabel: FOIL_PACK_TIER_LABELS[tier],
    cards: [card1, card2, card3],
  };
}

function findRelicRecipientIndex(roster: readonly Player[], relicId: string): number {
  const relic = getRelicById(relicId);
  const preferPitcher = relic?.category === 'pitching';
  const eligible = (p: Player): boolean =>
    (p.equippedRelicIds ?? []).length < MAX_RELICS_PER_PLAYER &&
    !(p.equippedRelicIds ?? []).includes(relicId);

  const preferred = roster.findIndex((p) => eligible(p) && isPitcherPosition(p.position) === preferPitcher);
  if (preferred >= 0) return preferred;
  return roster.findIndex(eligible);
}

interface PackRewardAccumulator {
  cash: number;
  teamHype: number;
  roster: Club['roster'];
  summaryLines: string[];
}

function applyRelicCard(acc: PackRewardAccumulator, card: FoilPackCard): void {
  const idx = card.relicId ? findRelicRecipientIndex(acc.roster, card.relicId) : -1;
  if (idx >= 0 && card.relicId) {
    const res = equipRelicOnPlayer(acc.roster[idx], card.relicId);
    acc.roster = acc.roster.map((p, i) => (i === idx ? res.player : p));
    acc.summaryLines.push(`Equipped ${card.title} on ${acc.roster[idx].name}!`);
    return;
  }
  acc.cash += 1000;
  acc.summaryLines.push(`Duplicate ${card.title} sold for +$1,000 cash!`);
}

function applyTrainingCard(acc: PackRewardAccumulator, card: FoilPackCard): void {
  if (acc.roster.length === 0) return;
  const xpGain = card.xpBonus ?? 50;
  const spGain = card.spBonus ?? 1;
  const target = acc.roster[0];
  acc.roster = acc.roster.map((p, idx) =>
    idx === 0 ? { ...p, xp: p.xp + xpGain, skillPoints: p.skillPoints + spGain } : p,
  );
  acc.summaryLines.push(`${target.name} gained +${xpGain} XP & +${spGain} SP!`);
}

function applySingleFoilCard(acc: PackRewardAccumulator, card: FoilPackCard): void {
  if (card.kind === 'relic') {
    applyRelicCard(acc, card);
  } else if (card.kind === 'cash_windfall' && card.cashBonus) {
    acc.cash += card.cashBonus;
    acc.summaryLines.push(`Banked +$${card.cashBonus.toLocaleString()} cash`);
  } else if (card.kind === 'hype_ticket' && card.hypeBonus) {
    acc.teamHype = Math.min(100, acc.teamHype + card.hypeBonus);
    acc.summaryLines.push(`Team Hype surged +${card.hypeBonus}`);
  } else if (card.kind === 'training_xp') {
    applyTrainingCard(acc, card);
  }
}

/** Purely applies all 3 revealed 1994 Foil Pack cards onto the human Club. */
export function applyFoilPackRewardsToClub(
  club: Club,
  opened: OpenedFoilPackResult,
): { club: Club; summaryLines: string[] } {
  const acc: PackRewardAccumulator = {
    cash: club.economy.cash,
    teamHype: club.economy.teamHype,
    roster: [...club.roster],
    summaryLines: [],
  };

  for (const card of opened.cards) {
    applySingleFoilCard(acc, card);
  }

  return {
    club: {
      ...club,
      roster: acc.roster,
      economy: { ...club.economy, cash: acc.cash, teamHype: acc.teamHype },
    },
    summaryLines: acc.summaryLines,
  };
}
