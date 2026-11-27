import { create } from 'zustand';
import { soundEngine } from '../audio/soundEngine';
import type { FrontOfficeMode } from '../engine/gm/frontOfficeMode';
import type { BullpenMode } from '../engine/simulation/bullpenManager';
import type { PitchingMode } from '../engine/simulation/pitchMindGames';

export type GameDayControlMode = 'simple' | 'advanced';
export type { FrontOfficeMode } from '../engine/gm/frontOfficeMode';
export type { BullpenMode } from '../engine/simulation/bullpenManager';
export type { PitchingMode } from '../engine/simulation/pitchMindGames';

export interface UserPreferences {
  sfxVolume: number;
  hapticsEnabled: boolean;
  wakeLockEnabled: boolean;
  reducedMotion: boolean;
  colorblindStatSymbols: boolean;
  enableInjuries: boolean;
  enableIllnesses: boolean;
  gameDayControlMode: GameDayControlMode;
  pitchingMode: PitchingMode;
  bullpenMode: BullpenMode;
  frontOfficeMode: FrontOfficeMode;
  hasCustomizedUniform: boolean;
  arcadeTimingEnabled: boolean;
  onePitchMode: boolean;
  onePitchModeExplicit?: boolean;
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
  pitchingMode: 'simple',
  bullpenMode: 'semi_auto',
  frontOfficeMode: 'auto',
  hasCustomizedUniform: false,
  arcadeTimingEnabled: false,
  onePitchMode: true,
  onePitchModeExplicit: false,
};

function parsePitchingMode(raw: unknown): PitchingMode {
  if (raw === 'normal' || raw === 'advanced' || raw === 'simple') return raw;
  return DEFAULT_PREFS.pitchingMode;
}

function parseBullpenMode(raw: unknown): BullpenMode {
  if (raw === 'auto' || raw === 'semi_auto' || raw === 'manual') return raw;
  return DEFAULT_PREFS.bullpenMode;
}

function parseFrontOfficeMode(raw: unknown): FrontOfficeMode {
  if (raw === 'auto' || raw === 'semi_auto' || raw === 'manual') return raw;
  return DEFAULT_PREFS.frontOfficeMode;
}

export function parseSavedUserPreferences(raw: string | null): UserPreferences {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    const gameDayControlMode: GameDayControlMode =
      parsed.gameDayControlMode === 'advanced' ? 'advanced' : DEFAULT_PREFS.gameDayControlMode;
    const defaultOnePitchForMode = gameDayControlMode === 'simple';
    const onePitchMode =
      typeof parsed.onePitchMode === 'boolean' ? parsed.onePitchMode : defaultOnePitchForMode;
    const onePitchModeExplicit =
      typeof parsed.onePitchModeExplicit === 'boolean'
        ? parsed.onePitchModeExplicit
        : typeof parsed.onePitchMode === 'boolean' && parsed.onePitchMode !== defaultOnePitchForMode;

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
      gameDayControlMode,
      pitchingMode: parsePitchingMode(parsed.pitchingMode),
      bullpenMode: parseBullpenMode(parsed.bullpenMode),
      frontOfficeMode: parseFrontOfficeMode(parsed.frontOfficeMode),
      hasCustomizedUniform: parsed.hasCustomizedUniform ?? DEFAULT_PREFS.hasCustomizedUniform,
      arcadeTimingEnabled: parsed.arcadeTimingEnabled ?? DEFAULT_PREFS.arcadeTimingEnabled,
      onePitchMode,
      onePitchModeExplicit,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function readSavedPrefs(): UserPreferences {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return { ...DEFAULT_PREFS };
    }
    return parseSavedUserPreferences(window.localStorage.getItem(PREFS_STORAGE_KEY));
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
  setPitchingMode: (mode: PitchingMode) => void;
  cyclePitchingMode: () => void;
  setBullpenMode: (mode: BullpenMode) => void;
  cycleBullpenMode: () => void;
  setFrontOfficeMode: (mode: FrontOfficeMode) => void;
  cycleFrontOfficeMode: () => void;
  markUniformCustomized: () => void;
  setArcadeTimingEnabled: (enabled: boolean) => void;
  toggleArcadeTiming: () => void;
  setOnePitchMode: (enabled: boolean) => void;
  toggleOnePitchMode: () => void;
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
    pitchingMode: state.pitchingMode,
    bullpenMode: state.bullpenMode,
    frontOfficeMode: state.frontOfficeMode,
    hasCustomizedUniform: state.hasCustomizedUniform,
    arcadeTimingEnabled: state.arcadeTimingEnabled,
    onePitchMode: state.onePitchMode,
    onePitchModeExplicit: state.onePitchModeExplicit ?? false,
  };
}

export const useUserPreferencesStore = create<UserPreferencesStore>((set, get) => {
  const applyPatch = (patch: Partial<UserPreferences>) => {
    const next: UserPreferences = { ...extractPrefs(get()), ...patch };
    syncDomPreferences(next);
    writeSavedPrefs(next);
    set(next);
  };

  const applyControlMode = (mode: GameDayControlMode) => {
    const patch: Partial<UserPreferences> = { gameDayControlMode: mode };
    if (!get().onePitchModeExplicit) {
      patch.onePitchMode = mode === 'simple';
    }
    applyPatch(patch);
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
    setGameDayControlMode: (mode) => applyControlMode(mode),
    toggleGameDayControlMode: () =>
      applyControlMode(get().gameDayControlMode === 'simple' ? 'advanced' : 'simple'),
    setPitchingMode: (mode) => applyPatch({ pitchingMode: mode }),
    cyclePitchingMode: () => {
      const cur = get().pitchingMode;
      const next: PitchingMode = cur === 'simple' ? 'normal' : cur === 'normal' ? 'advanced' : 'simple';
      applyPatch({ pitchingMode: next });
    },
    setBullpenMode: (mode) => applyPatch({ bullpenMode: mode }),
    cycleBullpenMode: () => {
      const cur = get().bullpenMode;
      const next: BullpenMode = cur === 'auto' ? 'semi_auto' : cur === 'semi_auto' ? 'manual' : 'auto';
      applyPatch({ bullpenMode: next });
    },
    setFrontOfficeMode: (mode) => applyPatch({ frontOfficeMode: mode }),
    cycleFrontOfficeMode: () => {
      const cur = get().frontOfficeMode;
      const next: FrontOfficeMode =
        cur === 'auto' ? 'semi_auto' : cur === 'semi_auto' ? 'manual' : 'auto';
      applyPatch({ frontOfficeMode: next });
    },
    markUniformCustomized: () => applyPatch({ hasCustomizedUniform: true }),
    setArcadeTimingEnabled: (enabled) => applyPatch({ arcadeTimingEnabled: enabled }),
    toggleArcadeTiming: () => applyPatch({ arcadeTimingEnabled: !get().arcadeTimingEnabled }),
    setOnePitchMode: (enabled) => applyPatch({ onePitchMode: enabled, onePitchModeExplicit: true }),
    toggleOnePitchMode: () =>
      applyPatch({ onePitchMode: !get().onePitchMode, onePitchModeExplicit: true }),
    resetDefaults: () => applyPatch({ ...DEFAULT_PREFS }),
  };
});
