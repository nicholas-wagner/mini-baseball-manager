import { beforeEach, describe, expect, it } from 'vitest';
import { useUserPreferencesStore } from './userPreferences';

describe('UserPreferencesStore — One-Pitch Mode persistence (TASK-111)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUserPreferencesStore.getState().resetDefaults();
  });

  it('defaults onePitchMode to false, supports set/toggle, persists to mbm.user.prefs.v1, and resets cleanly', () => {
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);

    useUserPreferencesStore.getState().setOnePitchMode(true);
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    const savedOn = JSON.parse(window.localStorage.getItem('mbm.user.prefs.v1') ?? '{}');
    expect(savedOn.onePitchMode).toBe(true);

    useUserPreferencesStore.getState().toggleOnePitchMode();
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);
    const savedOff = JSON.parse(window.localStorage.getItem('mbm.user.prefs.v1') ?? '{}');
    expect(savedOff.onePitchMode).toBe(false);

    useUserPreferencesStore.getState().toggleOnePitchMode();
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);

    useUserPreferencesStore.getState().resetDefaults();
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(false);
  });
});
