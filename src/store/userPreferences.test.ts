import { beforeEach, describe, expect, it } from 'vitest';
import { parseSavedUserPreferences, useUserPreferencesStore } from './userPreferences';

describe('UserPreferencesStore — One-Pitch Mode default in Simple Mode (TASK-111, TASK-113)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUserPreferencesStore.getState().resetDefaults();
  });

  it('defaults onePitchMode to true in Simple Mode, supports set/toggle, persists flags, and resets cleanly', () => {
    expect(useUserPreferencesStore.getState().gameDayControlMode).toBe('simple');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(false);

    useUserPreferencesStore.getState().setOnePitchMode(false);
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(true);
    const savedOff = JSON.parse(window.localStorage.getItem('mbm.user.prefs.v1') ?? '{}');
    expect(savedOff.onePitchMode).toBe(false);
    expect(savedOff.onePitchModeExplicit).toBe(true);

    useUserPreferencesStore.getState().toggleOnePitchMode();
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(true);
    const savedOn = JSON.parse(window.localStorage.getItem('mbm.user.prefs.v1') ?? '{}');
    expect(savedOn.onePitchMode).toBe(true);
    expect(savedOn.onePitchModeExplicit).toBe(true);

    useUserPreferencesStore.getState().resetDefaults();
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(false);
  });

  it('auto-switches onePitchMode with Simple/Advanced control mode until user explicitly overrides it', () => {
    const store = useUserPreferencesStore.getState();
    expect(store.gameDayControlMode).toBe('simple');
    expect(store.onePitchMode).toBe(true);

    // Switching to Advanced without explicit override turns 1-Pitch OFF (classic Pitch-by-Pitch)
    store.setGameDayControlMode('advanced');
    expect(useUserPreferencesStore.getState().gameDayControlMode).toBe('advanced');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(false);

    // Switching back to Simple without explicit override turns 1-Pitch back ON
    store.toggleGameDayControlMode();
    expect(useUserPreferencesStore.getState().gameDayControlMode).toBe('simple');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);

    // Explicit disable in Simple Mode is preserved across mode switches
    store.setOnePitchMode(false);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(true);
    store.setGameDayControlMode('advanced');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);
    store.setGameDayControlMode('simple');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);

    // Explicit enable in Advanced Mode is also preserved across mode switches
    store.resetDefaults();
    store.setGameDayControlMode('advanced');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);
    store.toggleOnePitchMode();
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    expect(useUserPreferencesStore.getState().onePitchModeExplicit).toBe(true);
    store.setGameDayControlMode('simple');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    store.setGameDayControlMode('advanced');
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
  });

  it('preserves older saved mbm.user.prefs.v1 JSON without clobbering explicit false and defaults undefined by control mode', () => {
    const legacyExplicitOff = parseSavedUserPreferences(
      JSON.stringify({ gameDayControlMode: 'simple', onePitchMode: false }),
    );
    expect(legacyExplicitOff.onePitchMode).toBe(false);
    expect(legacyExplicitOff.onePitchModeExplicit).toBe(true);

    const legacyUndefinedSimple = parseSavedUserPreferences(
      JSON.stringify({ gameDayControlMode: 'simple' }),
    );
    expect(legacyUndefinedSimple.onePitchMode).toBe(true);
    expect(legacyUndefinedSimple.onePitchModeExplicit).toBe(false);

    const legacyUndefinedAdvanced = parseSavedUserPreferences(
      JSON.stringify({ gameDayControlMode: 'advanced' }),
    );
    expect(legacyUndefinedAdvanced.onePitchMode).toBe(false);
    expect(legacyUndefinedAdvanced.onePitchModeExplicit).toBe(false);
  });
});
