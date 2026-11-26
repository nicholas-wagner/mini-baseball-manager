import { fireEvent, render, screen, within } from '@testing-library/react';
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
  });
});
