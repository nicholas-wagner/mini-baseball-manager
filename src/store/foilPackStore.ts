import { create } from 'zustand';
import {
  applyFoilPackRewardsToClub,
  openFoilBoosterPack,
  type FoilPackTierId,
  type OpenedFoilPackResult,
} from '../engine/events/foilPacks';
import type { Club, LeagueTierId } from '../engine/models/club';
import { createSeededRng } from '../engine/rng/seededRng';
import { useGameStore } from './gameStore';

export interface PendingFoilPack {
  id: string;
  tier: FoilPackTierId;
  reason: string;
}

interface FoilPackStoreState {
  unopenedPacks: PendingFoilPack[];
  openedCount: number;
  lastOpened: { pack: OpenedFoilPackResult; summaryLines: string[] } | null;
  awardPack: (tier: FoilPackTierId, reason: string) => void;
  ripNextPack: () => { pack: OpenedFoilPackResult; summaryLines: string[] } | null;
  clearLastOpened: () => void;
  resetPacks: () => void;
}

const STORAGE_KEY = 'mbm.foil.packs.v1';

const DEFAULT_STARTER_PACK: PendingFoilPack = {
  id: 'pack-opening-day',
  tier: 'sandlot_foil',
  reason: 'Opening Day Welcome Pack',
};

function loadSavedPacks(): { unopenedPacks: PendingFoilPack[]; openedCount: number } {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return { unopenedPacks: [DEFAULT_STARTER_PACK], openedCount: 0 };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unopenedPacks: [DEFAULT_STARTER_PACK], openedCount: 0 };
    const parsed = JSON.parse(raw) as { unopenedPacks?: PendingFoilPack[]; openedCount?: number };
    return {
      unopenedPacks: Array.isArray(parsed.unopenedPacks) ? parsed.unopenedPacks : [DEFAULT_STARTER_PACK],
      openedCount: typeof parsed.openedCount === 'number' ? parsed.openedCount : 0,
    };
  } catch {
    return { unopenedPacks: [DEFAULT_STARTER_PACK], openedCount: 0 };
  }
}

function savePacks(unopenedPacks: PendingFoilPack[], openedCount: number): void {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ unopenedPacks, openedCount }));
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
  lastOpened: null,

  awardPack: (tier, reason) => {
    const nextPack: PendingFoilPack = {
      id: `pack-${Date.now()}-${get().unopenedPacks.length + get().openedCount + 1}`,
      tier,
      reason,
    };
    const unopenedPacks = [...get().unopenedPacks, nextPack];
    savePacks(unopenedPacks, get().openedCount);
    set({ unopenedPacks });
  },

  ripNextPack: () => {
    const { unopenedPacks, openedCount } = get();
    if (unopenedPacks.length === 0) return null;
    const [current, ...rest] = unopenedPacks;
    const game = useGameStore.getState();
    const club = game.getHumanClub();
    const seed = (game.worldSeed + (openedCount + 1) * 7919 + rest.length * 37) >>> 0;
    const opened = openFoilBoosterPack(createSeededRng(seed), current.tier);

    let summaryLines = opened.cards.map((c) => c.title);
    if (club) {
      const applied = applyFoilPackRewardsToClub(club, opened);
      summaryLines = applied.summaryLines;
      useGameStore.setState({
        leagues: replaceHumanClubInLeagues(game.leagues, applied.club),
      });
    }

    const nextOpenedCount = openedCount + 1;
    savePacks(rest, nextOpenedCount);
    const result = { pack: opened, summaryLines };
    set({ unopenedPacks: rest, openedCount: nextOpenedCount, lastOpened: result });
    return result;
  },

  clearLastOpened: () => set({ lastOpened: null }),

  resetPacks: () => {
    savePacks([], 0);
    set({ unopenedPacks: [], openedCount: 0, lastOpened: null });
  },
}));
