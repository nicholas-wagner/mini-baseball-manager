import { create } from 'zustand';
import {
  recordMatchupEvents,
  type NemesisHistoryMap,
} from '../engine/league/nemesisTracker';
import type { PlayEvent } from '../engine/models/playEvent';

interface NemesisStoreState {
  history: NemesisHistoryMap;
  recordEvents: (events: readonly PlayEvent[]) => void;
  resetHistory: () => void;
}

const STORAGE_KEY = 'mbm.nemesis.history.v1';

function loadNemesisHistory(): NemesisHistoryMap {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return {};
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NemesisHistoryMap) : {};
  } catch {
    return {};
  }
}

function saveNemesisHistory(history: NemesisHistoryMap): void {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore storage limits
  }
}

export const useNemesisStore = create<NemesisStoreState>((set, get) => ({
  history: loadNemesisHistory(),

  recordEvents: (events) => {
    if (events.length === 0) return;
    const next = recordMatchupEvents(get().history, events);
    saveNemesisHistory(next);
    set({ history: next });
  },

  resetHistory: () => {
    saveNemesisHistory({});
    set({ history: {} });
  },
}));
