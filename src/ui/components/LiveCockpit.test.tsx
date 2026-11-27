import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';

const originalMatchMedia = window.matchMedia;

function installMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('TASK-099 live cockpit', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('throws the first pitch from Space and toggles the tactics sheet with T', () => {
    installMatchMedia(true);
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    expect(screen.getByTestId('studio-shortcuts')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByTestId('play-by-play-ticker').textContent).toMatch(/mph|ball|strike|out|hit|walk/i);

    fireEvent.keyDown(window, { key: 't' });
    expect(screen.getByRole('dialog', { name: 'Tactics' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Tactics' })).toBeNull();
  });

  it('opens More controls as one bottom sheet on a phone instead of stacking a second cockpit', () => {
    installMatchMedia(false);
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^Pitch with / }));

    expect(screen.queryByTestId('game-weather-banner')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Tactics' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'More controls' }));
    const sheet = screen.getByRole('dialog', { name: 'Tactics' });
    expect(within(sheet).getByTestId('live-action-bar')).toBeInTheDocument();
    expect(within(sheet).getByTestId('game-weather-banner')).toBeInTheDocument();
    expect(within(sheet).getByTestId('broadcast-hud')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'First at-bat' }).querySelector('h3')).toBeNull();
    expect(within(sheet).getByTestId('fast-sim-toggle')).toBeVisible();
    expect(within(sheet).queryByRole('button', { name: 'Tactics' })).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Tactics' })).toBeNull();
    const dock = screen.getByTestId('live-action-bar');
    expect(within(dock).getByTestId('live-primary-pitch-btn')).toHaveAccessibleName(/next pitch/i);
    expect(screen.getByRole('button', { name: 'Fewer controls' })).toBeVisible();
    fireEvent.click(within(dock).getByRole('button', { name: 'Tactics' }));
    expect(screen.getByRole('dialog', { name: 'Tactics' })).toBeVisible();
  });

  it('lets Space activate a focused button instead of throwing a pitch', () => {
    installMatchMedia(true);
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    const before = screen.getByTestId('play-by-play-ticker').textContent;
    const tactics = screen.getByRole('button', { name: /^Tactics/ });
    tactics.focus();
    fireEvent.keyDown(tactics, { key: ' ' });
    expect(screen.getByTestId('play-by-play-ticker').textContent).toBe(before);
  });

  it('locks Throw Pitch and Space until the current pitch or play completes', () => {
    vi.useFakeTimers();
    try {
      installMatchMedia(true);
      render(<GameDayScreen />);
      fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
      fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

      const pitchBtn = screen.getByTestId('live-primary-pitch-btn');
      expect(pitchBtn).not.toBeDisabled();

      // First click fires pitch #1 and immediately locks the button
      fireEvent.click(pitchBtn);
      const afterFirst = screen.getAllByTestId('play-by-play-ticker')[0].querySelectorAll('li').length;
      expect(afterFirst).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('live-primary-pitch-btn')).toBeDisabled();

      // Rapid clicks and Space key presses while animating must NOT fire another pitch
      fireEvent.click(screen.getByTestId('live-primary-pitch-btn'));
      fireEvent.keyDown(window, { key: ' ' });
      expect(screen.getAllByTestId('play-by-play-ticker')[0].querySelectorAll('li').length).toBe(afterFirst);

      // Once the pitch/play finishes, Throw Pitch unlocks and fires the next pitch cleanly
      act(() => vi.advanceTimersByTime(10000));
      expect(screen.getByTestId('live-primary-pitch-btn')).not.toBeDisabled();
      fireEvent.click(screen.getByTestId('live-primary-pitch-btn'));
      expect(screen.getAllByTestId('play-by-play-ticker')[0].querySelectorAll('li').length).toBeGreaterThan(afterFirst);
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks rapid double-taps on Swing during guided Opening Day until the play completes', () => {
    vi.useFakeTimers();
    try {
      installMatchMedia(false);
      useGameStore.getState().startNewCareer({
        city: 'Sandlot',
        clubName: 'Comets',
        mascot: 'Rocket Dog',
        monogram: 'SC',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        accentColor: '#FFD166',
        managerName: 'Coach Skip',
        seed: 2089,
        startingPreset: 'balanced',
      });
      render(<GameDayScreen />);
      fireEvent.click(screen.getByRole('button', { name: /Bat with / }));

      const swingBtn = screen.getByRole('button', { name: 'Swing' });
      expect(swingBtn).not.toBeDisabled();

      // Clicking Swing locks immediately and a second click before play completion is ignored
      fireEvent.click(swingBtn);
      expect(swingBtn).toBeDisabled();
      fireEvent.click(swingBtn);

      // Play completes and shows Play result for the first swing only
      act(() => vi.advanceTimersByTime(15000));
      expect(screen.getByRole('region', { name: 'Play result' })).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });
});

