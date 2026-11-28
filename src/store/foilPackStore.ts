import { create } from 'zustand';
import {
  applyHoloUpgradeToPlayer,
  applyStaffClinicPassToClub,
  applyTrainingPassToPlayer,
  depositFoilPackBaseRewards,
  openFoilBoosterPack,
  type FoilPackTierId,
  type OpenedFoilPackResult,
} from '../engine/events/foilPacks';
import type { Club, LeagueTierId } from '../engine/models/club';
import { createSeededRng } from '../engine/rng/seededRng';
import { equipRelicFromClubLocker } from '../engine/rpg/relicLocker';
import { useGameStore } from './gameStore';

export interface PendingFoilPack {
  id: string;
  tier: FoilPackTierId;
  reason: string;
}

export interface LastOpenedPackState {
  pack: OpenedFoilPackResult;
  summaryLines: string[];
  claimedSlots: Record<number, string>;
}

interface FoilPackStoreState {
  unopenedPacks: PendingFoilPack[];
  openedCount: number;
  packsSinceLegendary: number;
  lastOpened: LastOpenedPackState | null;
  awardPack: (tier: FoilPackTierId, reason: string) => void;
  ripNextPack: () => LastOpenedPackState | null;
  claimCardForTarget: (slot: 1 | 2 | 3, targetId: string) => { claimed: boolean; message: string };
  clearLastOpened: () => void;
  resetPacks: () => void;
}

const STORAGE_KEY = 'mbm.foil.packs.v1';

const DEFAULT_STARTER_PACK: PendingFoilPack = {
  id: 'pack-opening-day',
  tier: 'sandlot_foil',
  reason: 'Opening Day Welcome Pack',
};

function loadSavedPacks(): {
  unopenedPacks: PendingFoilPack[];
  openedCount: number;
  packsSinceLegendary: number;
} {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return { unopenedPacks: [DEFAULT_STARTER_PACK], openedCount: 0, packsSinceLegendary: 0 };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unopenedPacks: [DEFAULT_STARTER_PACK], openedCount: 0, packsSinceLegendary: 0 };
    const parsed = JSON.parse(raw) as {
      unopenedPacks?: PendingFoilPack[];
      openedCount?: number;
      packsSinceLegendary?: number;
    };
    return {
      unopenedPacks: Array.isArray(parsed.unopenedPacks) ? parsed.unopenedPacks : [DEFAULT_STARTER_PACK],
      openedCount: typeof parsed.openedCount === 'number' ? parsed.openedCount : 0,
      packsSinceLegendary: typeof parsed.packsSinceLegendary === 'number' ? parsed.packsSinceLegendary : 0,
    };
  } catch {
    return { unopenedPacks: [DEFAULT_STARTER_PACK], openedCount: 0, packsSinceLegendary: 0 };
  }
}

function savePacks(
  unopenedPacks: PendingFoilPack[],
  openedCount: number,
  packsSinceLegendary: number,
): void {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ unopenedPacks, openedCount, packsSinceLegendary }),
    );
  } catch {
    // ignore storage errors
  }
}

function replaceHumanClubInLeagues(
  leagues: Record<LeagueTierId, Club[]>,
  updated: Club,
): Record<LeagueTierId, Club[]> {
  return {
    ...leagues,
    [updated.leagueTier]: leagues[updated.leagueTier].map((c) => (c.id === updated.id ? updated : c)),
  };
}

const initial = loadSavedPacks();

export const useFoilPackStore = create<FoilPackStoreState>((set, get) => ({
  unopenedPacks: initial.unopenedPacks,
  openedCount: initial.openedCount,
  packsSinceLegendary: initial.packsSinceLegendary,
  lastOpened: null,

  awardPack: (tier, reason) => {
    const nextPack: PendingFoilPack = {
      id: `pack-${Date.now()}-${get().unopenedPacks.length + get().openedCount + 1}`,
      tier,
      reason,
    };
    const unopenedPacks = [...get().unopenedPacks, nextPack];
    savePacks(unopenedPacks, get().openedCount, get().packsSinceLegendary);
    set({ unopenedPacks });
  },

  ripNextPack: () => {
    const { unopenedPacks, openedCount, packsSinceLegendary } = get();
    if (unopenedPacks.length === 0) return null;
    const [current, ...rest] = unopenedPacks;
    const game = useGameStore.getState();
    const club = game.getHumanClub();
    const seed = (game.worldSeed + (openedCount + 1) * 7919 + rest.length * 37) >>> 0;
    const opened = openFoilBoosterPack(createSeededRng(seed), current.tier, {
      packsSinceLegendary,
    });

    let summaryLines = opened.cards.map((c) => c.title);
    if (club) {
      const deposited = depositFoilPackBaseRewards(club, opened);
      summaryLines = deposited.summaryLines;
      useGameStore.setState({
        leagues: replaceHumanClubInLeagues(game.leagues, deposited.club),
      });
    }

    const gotLegendary = opened.cards.some((c) => c.rarity === 'legendary');
    const nextPity = gotLegendary ? 0 : packsSinceLegendary + 1;
    const nextOpenedCount = openedCount + 1;
    savePacks(rest, nextOpenedCount, nextPity);
    const result: LastOpenedPackState = { pack: opened, summaryLines, claimedSlots: {} };
    set({
      unopenedPacks: rest,
      openedCount: nextOpenedCount,
      packsSinceLegendary: nextPity,
      lastOpened: result,
    });
    return result;
  },

  claimCardForTarget: (slot, targetId) => {
    const { lastOpened } = get();
    const game = useGameStore.getState();
    const club = game.getHumanClub();
    if (!lastOpened || !club) return { claimed: false, message: 'No active pack.' };
    if (lastOpened.claimedSlots[slot]) {
      return { claimed: false, message: lastOpened.claimedSlots[slot] };
    }
    const card = lastOpened.pack.cards.find((c) => c.slot === slot);
    if (!card) return { claimed: false, message: 'Card not found.' };

    let nextClub = club;
    let message = '';

    if (card.kind === 'relic' && card.relicId) {
      const eq = equipRelicFromClubLocker(club, targetId, card.relicId, { swapFromHolder: true });
      if (!eq.equipped) return { claimed: false, message: eq.reason ?? 'Cannot equip on this player.' };
      nextClub = eq.club;
      const name = nextClub.roster.find((p) => p.id === targetId)?.name ?? 'player';
      message = `Equipped ${card.title} on ${name}!`;
    } else if (card.kind === 'training_xp') {
      const res = applyTrainingPassToPlayer(club, targetId, card.xpBonus ?? 65, card.spBonus ?? 1);
      nextClub = res.club;
      message = res.summary;
    } else if (card.kind === 'staff_clinic_pass') {
      const res = applyStaffClinicPassToClub(club, targetId || null, card.staffXpBonus ?? 110);
      nextClub = res.club;
      message = res.summary;
    } else if (card.kind === 'holo_upgrade') {
      const res = applyHoloUpgradeToPlayer(club, targetId);
      nextClub = res.club;
      message = res.summary;
    } else {
      return { claimed: false, message: 'Already banked!' };
    }

    useGameStore.setState({ leagues: replaceHumanClubInLeagues(game.leagues, nextClub) });
    const nextClaimed = { ...lastOpened.claimedSlots, [slot]: message };
    set({
      lastOpened: {
        ...lastOpened,
        claimedSlots: nextClaimed,
        summaryLines: [...lastOpened.summaryLines, message],
      },
    });
    return { claimed: true, message };
  },

  clearLastOpened: () => set({ lastOpened: null }),

  resetPacks: () => {
    savePacks([], 0, 0);
    set({ unopenedPacks: [], openedCount: 0, packsSinceLegendary: 0, lastOpened: null });
  },
}));
