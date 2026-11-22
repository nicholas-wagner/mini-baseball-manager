import { create } from 'zustand';
import { soundEngine } from '../audio/soundEngine';

export type GameDayControlMode = 'simple' | 'advanced';

export interface UserPreferences {
  sfxVolume: number;
  hapticsEnabled: boolean;
  wakeLockEnabled: boolean;
  reducedMotion: boolean;
  colorblindStatSymbols: boolean;
  enableInjuries: boolean;
  enableIllnesses: boolean;
  gameDayControlMode: GameDayControlMode;
}

const PREFS_STORAGE_KEY = 'mbm.user.prefs.v1';

const DEFAULT_PREFS: UserPreferences = {
  sfxVolume: 0.7,
  hapticsEnabled: true,
  wakeLockEnabled: true,
  reducedMotion: false,
  colorblindStatSymbols: false,
  enableInjuries: true,
  enableIllnesses: true,
  gameDayControlMode: 'simple',
};

function readSavedPrefs(): UserPreferences {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return { ...DEFAULT_PREFS };
    }
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      sfxVolume:
        typeof parsed.sfxVolume === 'number' && Number.isFinite(parsed.sfxVolume)
          ? Math.max(0, Math.min(1, parsed.sfxVolume))
          : DEFAULT_PREFS.sfxVolume,
      hapticsEnabled: parsed.hapticsEnabled ?? DEFAULT_PREFS.hapticsEnabled,
      wakeLockEnabled: parsed.wakeLockEnabled ?? DEFAULT_PREFS.wakeLockEnabled,
      reducedMotion: parsed.reducedMotion ?? DEFAULT_PREFS.reducedMotion,
      colorblindStatSymbols: parsed.colorblindStatSymbols ?? DEFAULT_PREFS.colorblindStatSymbols,
      enableInjuries: parsed.enableInjuries ?? DEFAULT_PREFS.enableInjuries,
      enableIllnesses: parsed.enableIllnesses ?? DEFAULT_PREFS.enableIllnesses,
      gameDayControlMode:
        parsed.gameDayControlMode === 'advanced' ? 'advanced' : DEFAULT_PREFS.gameDayControlMode,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function writeSavedPrefs(prefs: UserPreferences): void {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
      return;
    }
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore restricted storage environments.
  }
}

function syncDomPreferences(prefs: UserPreferences): void {
  soundEngine.setVolume(prefs.sfxVolume);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.reducedMotion = prefs.reducedMotion ? 'true' : 'false';
    document.documentElement.dataset.colorblindSymbols = prefs.colorblindStatSymbols
      ? 'true'
      : 'false';
  }
}

interface UserPreferencesStore extends UserPreferences {
  setSfxVolume: (volume: number) => void;
  toggleHaptics: () => void;
  toggleWakeLock: () => void;
  toggleReducedMotion: () => void;
  toggleColorblindStatSymbols: () => void;
  toggleInjuries: () => void;
  toggleIllnesses: () => void;
  setGameDayControlMode: (mode: GameDayControlMode) => void;
  toggleGameDayControlMode: () => void;
  resetDefaults: () => void;
}

const initialPrefs = readSavedPrefs();
syncDomPreferences(initialPrefs);

function extractPrefs(state: UserPreferencesStore): UserPreferences {
  return {
    sfxVolume: state.sfxVolume,
    hapticsEnabled: state.hapticsEnabled,
    wakeLockEnabled: state.wakeLockEnabled,
    reducedMotion: state.reducedMotion,
    colorblindStatSymbols: state.colorblindStatSymbols,
    enableInjuries: state.enableInjuries,
    enableIllnesses: state.enableIllnesses,
    gameDayControlMode: state.gameDayControlMode,
  };
}

export const useUserPreferencesStore = create<UserPreferencesStore>((set, get) => {
  const applyPatch = (patch: Partial<UserPreferences>) => {
    const next: UserPreferences = { ...extractPrefs(get()), ...patch };
    syncDomPreferences(next);
    writeSavedPrefs(next);
    set(next);
  };

  return {
    ...initialPrefs,
    setSfxVolume: (volume) => applyPatch({ sfxVolume: Math.max(0, Math.min(1, volume)) }),
    toggleHaptics: () => applyPatch({ hapticsEnabled: !get().hapticsEnabled }),
    toggleWakeLock: () => applyPatch({ wakeLockEnabled: !get().wakeLockEnabled }),
    toggleReducedMotion: () => applyPatch({ reducedMotion: !get().reducedMotion }),
    toggleColorblindStatSymbols: () =>
      applyPatch({ colorblindStatSymbols: !get().colorblindStatSymbols }),
    toggleInjuries: () => applyPatch({ enableInjuries: !get().enableInjuries }),
    toggleIllnesses: () => applyPatch({ enableIllnesses: !get().enableIllnesses }),
    setGameDayControlMode: (mode) => applyPatch({ gameDayControlMode: mode }),
    toggleGameDayControlMode: () =>
      applyPatch({
        gameDayControlMode: get().gameDayControlMode === 'simple' ? 'advanced' : 'simple',
      }),
    resetDefaults: () => applyPatch({ ...DEFAULT_PREFS }),
  };
});
