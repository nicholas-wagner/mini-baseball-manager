import { create } from 'zustand';
import { getStadiumTierProfile } from '../engine/ballparks/stadiumProgression';
import type { LeagueTierId } from '../engine/models/club';
import { createSeededRng } from '../engine/rng/seededRng';
import {
  applyBackstoryStartingModifiers,
  getManagerBackstory,
  type ManagerBackstoryId,
} from '../engine/story/backstories';
import {
  createInitialStoryState,
  resolveManagerEpithet,
  resolveStoryChapterChoice,
  type CareerStoryState,
  type StoryChoiceOption,
} from '../engine/story/storyEngine';
import { useGameStore } from './gameStore';

export type CareerSlotId = 'slot-1' | 'slot-2' | 'slot-3' | 'slot-4';

export const CAREER_SLOT_IDS: readonly CareerSlotId[] = [
  'slot-1',
  'slot-2',
  'slot-3',
  'slot-4',
] as const;

export interface CareerSlotRecord {
  slotId: CareerSlotId;
  savedAtIso: string;
  clubName: string;
  clubMonogram: string;
  clubPrimaryColor: string;
  leagueTier: LeagueTierId;
  stadiumLabel: string;
  seasonNumber: number;
  recordLabel: string;
  backstoryId: ManagerBackstoryId;
  epithetTitle: string;
  chaptersDone: number;
  backstoryApplied: boolean;
  storyState: CareerStoryState;
  careerJson: string;
}

const STORAGE_PREFIX = 'mbm.autosave.v2.';
const ACTIVE_SLOT_KEY = 'mbm.autosave.v2.activeSlot';

const memoryFallbackStore = new Map<string, string>();

interface SimpleKeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const memoryStorageAdapter: SimpleKeyValueStorage = {
  getItem: (key) => memoryFallbackStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryFallbackStore.set(key, value);
  },
  removeItem: (key) => {
    memoryFallbackStore.delete(key);
  },
};

function getSafeStorage(): SimpleKeyValueStorage {
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function'
    ) {
      return window.localStorage;
    }
  } catch {
    return memoryStorageAdapter;
  }
  return memoryStorageAdapter;
}

export function clearAllCareerSlotsStorage(): void {
  const storage = getSafeStorage();
  for (const id of CAREER_SLOT_IDS) {
    storage.removeItem(`${STORAGE_PREFIX}${id}`);
  }
  storage.removeItem(ACTIVE_SLOT_KEY);
  memoryFallbackStore.clear();
}

function readSlotFromStorage(slotId: CareerSlotId): CareerSlotRecord | null {
  const storage = getSafeStorage();
  const raw = storage.getItem(`${STORAGE_PREFIX}${slotId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CareerSlotRecord>;
    if (!parsed.slotId || !parsed.careerJson || !parsed.storyState) return null;
    return parsed as CareerSlotRecord;
  } catch {
    return null;
  }
}

function readAllSlotsFromStorage(): Record<CareerSlotId, CareerSlotRecord | null> {
  return {
    'slot-1': readSlotFromStorage('slot-1'),
    'slot-2': readSlotFromStorage('slot-2'),
    'slot-3': readSlotFromStorage('slot-3'),
    'slot-4': readSlotFromStorage('slot-4'),
  };
}

function readSavedActiveSlotId(): CareerSlotId {
  const storage = getSafeStorage();
  const val = storage?.getItem(ACTIVE_SLOT_KEY);
  if (val && (CAREER_SLOT_IDS as readonly string[]).includes(val)) {
    return val as CareerSlotId;
  }
  return 'slot-1';
}

function writeActiveSlotId(slotId: CareerSlotId): void {
  const storage = getSafeStorage();
  storage?.setItem(ACTIVE_SLOT_KEY, slotId);
}

interface CareerStoryStoreState {
  activeSlotId: CareerSlotId;
  storyState: CareerStoryState;
  backstoryApplied: boolean;
  lastAutoSavedIso: string | null;
  slots: Record<CareerSlotId, CareerSlotRecord | null>;
  refreshSlots: () => void;
  autoSaveActiveCareer: () => boolean;
  resumeLastSavedCareer: () => boolean;
  loadCareerSlot: (slotId: CareerSlotId) => boolean;
  deleteCareerSlot: (slotId: CareerSlotId) => void;
  startFreshInSlot: (slotId: CareerSlotId, backstoryId?: ManagerBackstoryId) => void;
  chooseCareerBackstory: (backstoryId: ManagerBackstoryId) => { applied: boolean; message: string };
  resolveActiveStoryChoice: (
    chapterId: string,
    choiceId: string,
  ) => { resolved: boolean; choice: StoryChoiceOption | null; boostedPlayerName?: string };
}

export const useCareerStoryStore = create<CareerStoryStoreState>((set, get) => ({
  activeSlotId: readSavedActiveSlotId(),
  storyState: createInitialStoryState('sandlot_hero'),
  backstoryApplied: false,
  lastAutoSavedIso: null,
  slots: readAllSlotsFromStorage(),

  refreshSlots: () => {
    set({ slots: readAllSlotsFromStorage() });
  },

  autoSaveActiveCareer: () => {
    const game = useGameStore.getState();
    const club = game.getHumanClub();
    if (!club || !game.humanClubId) return false;

    const careerJson = game.exportCurrentCareerJson();
    if (!careerJson) return false;

    const { activeSlotId, storyState, backstoryApplied } = get();
    const savedAtIso = new Date().toISOString();
    const record: CareerSlotRecord = {
      slotId: activeSlotId,
      savedAtIso,
      clubName: `${club.city} ${club.name}`,
      clubMonogram: club.colors.monogram,
      clubPrimaryColor: club.colors.primary,
      leagueTier: club.leagueTier,
      stadiumLabel: getStadiumTierProfile(club.leagueTier).label,
      seasonNumber: game.seasonNumber,
      recordLabel: `${club.wins}-${club.losses}`,
      backstoryId: storyState.backstoryId,
      epithetTitle: resolveManagerEpithet(storyState.alignment).title,
      chaptersDone: storyState.completedChapterIds.length,
      backstoryApplied,
      storyState,
      careerJson,
    };

    const storage = getSafeStorage();
    if (storage) {
      storage.setItem(`${STORAGE_PREFIX}${activeSlotId}`, JSON.stringify(record));
      writeActiveSlotId(activeSlotId);
    }

    set((state) => ({
      lastAutoSavedIso: savedAtIso,
      slots: { ...state.slots, [activeSlotId]: record },
    }));
    return true;
  },

  resumeLastSavedCareer: () => {
    const activeSlot = readSavedActiveSlotId();
    const record = readSlotFromStorage(activeSlot);
    if (!record) {
      set({ activeSlotId: activeSlot, slots: readAllSlotsFromStorage() });
      return false;
    }
    const ok = useGameStore.getState().importCareerJson(record.careerJson);
    if (!ok) return false;
    set({
      activeSlotId: activeSlot,
      storyState: record.storyState,
      backstoryApplied: record.backstoryApplied,
      lastAutoSavedIso: record.savedAtIso,
      slots: readAllSlotsFromStorage(),
    });
    return true;
  },

  loadCareerSlot: (slotId) => {
    const record = readSlotFromStorage(slotId);
    if (!record) return false;
    const ok = useGameStore.getState().importCareerJson(record.careerJson);
    if (!ok) return false;
    writeActiveSlotId(slotId);
    set({
      activeSlotId: slotId,
      storyState: record.storyState,
      backstoryApplied: record.backstoryApplied,
      lastAutoSavedIso: record.savedAtIso,
      slots: readAllSlotsFromStorage(),
    });
    return true;
  },

  deleteCareerSlot: (slotId) => {
    const storage = getSafeStorage();
    storage?.removeItem(`${STORAGE_PREFIX}${slotId}`);
    const wasActive = get().activeSlotId === slotId;
    if (wasActive) {
      useGameStore.setState({ humanClubId: null, manager: null });
    }
    set((state) => ({
      slots: { ...state.slots, [slotId]: null },
      ...(wasActive
        ? {
            storyState: createInitialStoryState('sandlot_hero'),
            backstoryApplied: false,
            lastAutoSavedIso: null,
          }
        : {}),
    }));
  },

  startFreshInSlot: (slotId, backstoryId = 'sandlot_hero') => {
    writeActiveSlotId(slotId);
    useGameStore.setState({ humanClubId: null, manager: null });
    set({
      activeSlotId: slotId,
      storyState: createInitialStoryState(backstoryId),
      backstoryApplied: false,
      lastAutoSavedIso: null,
    });
  },

  chooseCareerBackstory: (backstoryId) => {
    const game = useGameStore.getState();
    const club = game.getHumanClub();
    const backstory = getManagerBackstory(backstoryId);
    const nextStory = createInitialStoryState(backstoryId);

    if (!club || !game.manager) {
      set({ storyState: nextStory, backstoryApplied: false });
      return {
        applied: true,
        message: `Selected "${backstory.title}" — its perks will activate as soon as you found your club!`,
      };
    }

    if (get().backstoryApplied) {
      return {
        applied: false,
        message: 'Your current dynasty already locked its origin story. Start a fresh career slot to try another!',
      };
    }

    const res = applyBackstoryStartingModifiers(club, game.manager, backstoryId);
    useGameStore.setState({
      manager: res.manager,
      leagues: {
        ...game.leagues,
        [res.club.leagueTier]: game.leagues[res.club.leagueTier].map((c) =>
          c.id === res.club.id ? res.club : c,
        ),
      },
    });
    set({ storyState: nextStory, backstoryApplied: true });
    get().autoSaveActiveCareer();
    return {
      applied: true,
      message: `Origin locked: ${backstory.badgeIcon} ${backstory.title}! Opening perks applied and auto-saved.`,
    };
  },

  resolveActiveStoryChoice: (chapterId, choiceId) => {
    const game = useGameStore.getState();
    const club = game.getHumanClub();
    if (!club) return { resolved: false, choice: null };

    const { storyState } = get();
    const rng = createSeededRng(
      game.worldSeed + game.seasonNumber * 613 + storyState.completedChapterIds.length * 97,
    );
    const res = resolveStoryChapterChoice(
      rng,
      storyState,
      club,
      chapterId,
      choiceId,
      game.seasonNumber,
    );
    if (!res.resolved) return { resolved: false, choice: null };

    useGameStore.setState({
      leagues: {
        ...game.leagues,
        [res.club.leagueTier]: game.leagues[res.club.leagueTier].map((c) =>
          c.id === res.club.id ? res.club : c,
        ),
      },
    });
    set({ storyState: res.storyState });
    get().autoSaveActiveCareer();
    return {
      resolved: true,
      choice: res.choice,
      boostedPlayerName: res.boostedPlayerName,
    };
  },
}));
