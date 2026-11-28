import type { Club, LeagueTierId, RelicInventoryEntry } from '../models/club';
import { isPitcherPosition, type Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  getRelicById,
  MAX_RELICS_PER_PLAYER,
  RELIC_CATALOG,
  type BaseballRelic,
  type RelicRarity,
} from './relics';

export const STARTER_CLUB_RELIC_IDS: readonly string[] = [
  'pine_tar_holo_rag',
  'knuckle_wax_tin',
];

export const RELIC_SHOP_PRICE_BY_RARITY: Readonly<Record<RelicRarity, number>> = {
  common: 900,
  rare: 2_200,
  legendary: 4_800,
};

export const RELIC_RECYCLE_VALUE_BY_RARITY: Readonly<Record<RelicRarity, number>> = {
  common: 450,
  rare: 1_100,
  legendary: 2_500,
};

export interface VintageRelicShopOffer {
  relic: BaseballRelic;
  price: number;
}

export function createStarterRelicInventory(): RelicInventoryEntry[] {
  return STARTER_CLUB_RELIC_IDS.map((relicId) => ({ relicId, count: 1, foilTier: 1 }));
}

function mergeEquippedRelicsIntoMap(
  roster: readonly Player[],
  map: Map<string, RelicInventoryEntry>,
): void {
  const equippedCounts = new Map<string, number>();
  for (const p of roster) {
    for (const relicId of p.equippedRelicIds ?? []) {
      equippedCounts.set(relicId, (equippedCounts.get(relicId) ?? 0) + 1);
    }
  }
  for (const [relicId, eqCount] of equippedCounts.entries()) {
    const existing = map.get(relicId);
    const nextCount = existing ? Math.max(existing.count, eqCount) : eqCount;
    map.set(relicId, { relicId, count: nextCount, foilTier: existing?.foilTier ?? 1 });
  }
}

/** Hydrates a club's real Relic Locker inventory safely for both new clubs and legacy saves. */
export function resolveClubRelicInventory(
  club: Pick<Club, 'relicInventory' | 'roster'>,
): RelicInventoryEntry[] {
  const map = new Map<string, RelicInventoryEntry>();
  for (const entry of club.relicInventory ?? []) {
    if (getRelicById(entry.relicId) && entry.count > 0) {
      map.set(entry.relicId, { ...entry });
    }
  }
  mergeEquippedRelicsIntoMap(club.roster, map);
  if (map.size === 0 && club.relicInventory === undefined) {
    for (const starter of createStarterRelicInventory()) {
      map.set(starter.relicId, starter);
    }
  }
  return Array.from(map.values());
}

/** Lists all distinct Relic IDs discovered by this club (`X / 26` Collector Tracker). */
export function resolveDiscoveredRelicIds(club: Pick<Club, 'relicInventory' | 'discoveredRelicIds' | 'roster'>): string[] {
  const seen = new Set<string>(club.discoveredRelicIds ?? []);
  for (const entry of resolveClubRelicInventory(club)) {
    seen.add(entry.relicId);
  }
  return Array.from(seen);
}

/** Builds a lookup map of `relicId -> foilTier (1|2|3)` for stat calculation. */
export function buildRelicFoilTierMap(club: Pick<Club, 'relicInventory' | 'roster'>): Record<string, 1 | 2 | 3> {
  const out: Record<string, 1 | 2 | 3> = {};
  for (const entry of resolveClubRelicInventory(club)) {
    out[entry.relicId] = entry.foilTier;
  }
  return out;
}

/** Enforces role-aware relic slot compatibility (Pitchers cannot equip Bats; Hitters cannot equip Pitching gear). */
export function checkRelicRoleCompatibility(
  player: Pick<Player, 'position' | 'name'>,
  relicId: string,
): { compatible: boolean; reason?: string } {
  const relic = getRelicById(relicId);
  if (!relic) return { compatible: false, reason: 'Unknown relic.' };
  const isPitcher = isPitcherPosition(player.position);
  if (isPitcher && relic.category === 'bat') {
    return {
      compatible: false,
      reason: `${relic.name} is a Batting relic — equip Pitching, Glove, Cleats, or Flair gear on pitchers.`,
    };
  }
  if (!isPitcher && relic.category === 'pitching') {
    return {
      compatible: false,
      reason: `${relic.name} is a Pitching relic — equip Batting, Glove, Cleats, or Flair gear on position players.`,
    };
  }
  return { compatible: true };
}

/** Returns players currently holding copies of a relic and remaining spare unequipped copies. */
export function getRelicOwnershipUsage(
  club: Pick<Club, 'relicInventory' | 'roster'>,
  relicId: string,
): { owned: number; equippedBy: Player[]; spare: number; foilTier: 1 | 2 | 3 } {
  const inv = resolveClubRelicInventory(club);
  const entry = inv.find((e) => e.relicId === relicId);
  const owned = entry?.count ?? 0;
  const equippedBy = club.roster.filter((p) => (p.equippedRelicIds ?? []).includes(relicId));
  return {
    owned,
    equippedBy,
    spare: Math.max(0, owned - equippedBy.length),
    foilTier: entry?.foilTier ?? 1,
  };
}

/** Adds 1+ copies of a relic into the Club Relic Locker & discovery checklist. */
export function addRelicToClubLocker(club: Club, relicId: string, quantity = 1): Club {
  if (!getRelicById(relicId) || quantity <= 0) return club;
  const inv = resolveClubRelicInventory(club);
  const existing = inv.find((e) => e.relicId === relicId);
  const nextInv = existing
    ? inv.map((e) => (e.relicId === relicId ? { ...e, count: e.count + quantity } : e))
    : [...inv, { relicId, count: quantity, foilTier: 1 as const }];
  const discovered = Array.from(new Set([...resolveDiscoveredRelicIds(club), relicId]));
  return {
    ...club,
    relicInventory: nextInv,
    discoveredRelicIds: discovered,
  };
}

function checkLockerCopyAvailability(
  club: Club,
  relicId: string,
  swapFromHolder: boolean,
): { ok: boolean; reason?: string; holderIdToSwap?: string } {
  const usage = getRelicOwnershipUsage(club, relicId);
  if (usage.owned <= 0) {
    return { ok: false, reason: 'You do not own this relic yet — pull it in Foil Packs or buy it in the Vintage Shop!' };
  }
  if (usage.spare > 0) return { ok: true };
  const holder = usage.equippedBy[0];
  if (swapFromHolder && holder) return { ok: true, holderIdToSwap: holder.id };
  return { ok: false, reason: `All copies equipped (${holder?.name ?? 'teammate'}) — swap or unequip first.` };
}

function validateLockerEquip(
  club: Club,
  player: Player,
  relicId: string,
  swapFromHolder: boolean,
): { ok: boolean; reason?: string; holderIdToSwap?: string } {
  const compat = checkRelicRoleCompatibility(player, relicId);
  if (!compat.compatible) return { ok: false, reason: compat.reason };
  const held = player.equippedRelicIds ?? [];
  if (held.includes(relicId)) return { ok: false, reason: `${player.name} already has this relic equipped.` };
  if (held.length >= MAX_RELICS_PER_PLAYER) {
    return { ok: false, reason: `${player.name} already holds ${MAX_RELICS_PER_PLAYER}/2 relics — unequip one first.` };
  }
  return checkLockerCopyAvailability(club, relicId, swapFromHolder);
}

/** Equips an owned relic from the Club Relic Locker onto a player (with optional clean teammate swap). */
export function equipRelicFromClubLocker(
  club: Club,
  playerId: string,
  relicId: string,
  options?: { swapFromHolder?: boolean },
): { equipped: boolean; reason?: string; club: Club; swappedFromName?: string } {
  const target = club.roster.find((p) => p.id === playerId);
  if (!target) return { equipped: false, reason: 'Player not on roster.', club };

  const check = validateLockerEquip(club, target, relicId, Boolean(options?.swapFromHolder));
  if (!check.ok) return { equipped: false, reason: check.reason, club };

  let swappedFromName: string | undefined;
  const nextRoster = club.roster.map((p) => {
    if (check.holderIdToSwap && p.id === check.holderIdToSwap) {
      swappedFromName = p.name;
      return { ...p, equippedRelicIds: (p.equippedRelicIds ?? []).filter((id) => id !== relicId) };
    }
    if (p.id === playerId) {
      return { ...p, equippedRelicIds: [...(p.equippedRelicIds ?? []), relicId] };
    }
    return p;
  });

  return {
    equipped: true,
    swappedFromName,
    club: {
      ...club,
      relicInventory: resolveClubRelicInventory(club),
      roster: nextRoster,
    },
  };
}

/** Fuses 1 spare duplicate copy to upgrade a relic's Foil Star Tier (`★ -> ★★ (+25%) -> ★★★ (+50%)`). */
export function fuseDuplicateRelic(
  club: Club,
  relicId: string,
): { fused: boolean; reason?: string; newFoilTier?: 1 | 2 | 3; club: Club } {
  const usage = getRelicOwnershipUsage(club, relicId);
  if (usage.owned < 2 || usage.spare < 1) {
    return { fused: false, reason: 'Need at least 2 copies (with 1 spare unequipped) to fuse!', club };
  }
  if (usage.foilTier >= 3) {
    return { fused: false, reason: 'Already forged to max ★★★ Prismatic Foil!', club };
  }
  const nextTier = (usage.foilTier + 1) as 2 | 3;
  const inv = resolveClubRelicInventory(club).map((entry) =>
    entry.relicId === relicId
      ? { ...entry, count: entry.count - 1, foilTier: nextTier }
      : entry,
  );
  return {
    fused: true,
    newFoilTier: nextTier,
    club: { ...club, relicInventory: inv },
  };
}

/** Recycles 1 spare unequipped relic copy into Club Cash. */
export function recycleSpareRelic(
  club: Club,
  relicId: string,
): { recycled: boolean; cashAwarded: number; reason?: string; club: Club } {
  const relic = getRelicById(relicId);
  if (!relic) return { recycled: false, cashAwarded: 0, reason: 'Unknown relic.', club };
  const usage = getRelicOwnershipUsage(club, relicId);
  if (usage.spare <= 0) {
    return { recycled: false, cashAwarded: 0, reason: 'Unequip a copy before recycling for cash.', club };
  }
  const cashAwarded = RELIC_RECYCLE_VALUE_BY_RARITY[relic.rarity];
  const nextInv = resolveClubRelicInventory(club)
    .map((entry) => (entry.relicId === relicId ? { ...entry, count: entry.count - 1 } : entry))
    .filter((entry) => entry.count > 0);
  return {
    recycled: true,
    cashAwarded,
    club: {
      ...club,
      relicInventory: nextInv,
      economy: { ...club.economy, cash: club.economy.cash + cashAwarded },
    },
  };
}

/** Returns 3 deterministic rotating Vintage Gear Shop offers for the current series & league tier. */
export function getRotatingVintageRelicShop(
  worldSeed: number,
  seriesIndex: number,
  leagueTier: LeagueTierId,
): VintageRelicShopOffer[] {
  const tierOffset =
    leagueTier === 'majors' ? 6 : leagueTier === 'aaa' ? 5 : leagueTier === 'aa' ? 4 : leagueTier === 'high_a' ? 3 : leagueTier === 'low_a' ? 2 : 1;
  const rng = createSeededRng((worldSeed ^ ((seriesIndex + 1) * 4099) ^ (tierOffset * 97)) >>> 0);
  const commons = RELIC_CATALOG.filter((r) => r.rarity === 'common');
  const rares = RELIC_CATALOG.filter((r) => r.rarity === 'rare');
  const legends = RELIC_CATALOG.filter((r) => r.rarity === 'legendary');

  const slot1 = rng.pick(commons);
  const slot2 = rng.pick(rares);
  const slot3 = tierOffset >= 3 || rng.chance(0.35) ? rng.pick(legends) : rng.pick(rares.filter((r) => r.id !== slot2.id));

  return [slot1, slot2, slot3].map((relic) => ({
    relic,
    price: RELIC_SHOP_PRICE_BY_RARITY[relic.rarity],
  }));
}

/** Purchases a relic from the Vintage Gear Shop directly into the Club Relic Locker. */
export function purchaseVintageRelic(
  club: Club,
  relicId: string,
): { purchased: boolean; reason?: string; price: number; club: Club } {
  const relic = getRelicById(relicId);
  if (!relic) return { purchased: false, reason: 'Unknown relic.', price: 0, club };
  const price = RELIC_SHOP_PRICE_BY_RARITY[relic.rarity];
  if (club.economy.cash < price) {
    return { purchased: false, reason: `Need $${price.toLocaleString()} cash to buy ${relic.name}.`, price, club };
  }
  const withRelic = addRelicToClubLocker(club, relicId, 1);
  return {
    purchased: true,
    price,
    club: {
      ...withRelic,
      economy: { ...withRelic.economy, cash: withRelic.economy.cash - price },
    },
  };
}
