import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';

describe('Simplified First-Experience Game Day & Design-Lab-Only Soundboard', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('keeps the Ballpark Soundboard exclusively in Design Lab and off GameDayScreen', () => {
    render(<GameDayScreen />);
    expect(screen.queryByTestId('ballpark-soundboard')).not.toBeInTheDocument();
  });

  it('starts in Arcade Mode with an obvious action bar right under the 3D field and expands Pro Manager controls on 1 tap', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Live 3D field + attached Action Bar + clear Coach Cue are immediately present
    expect(screen.getByTestId('live-game-3d-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('live-action-bar')).toBeInTheDocument();
    expect(screen.getByTestId('coach-action-cue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next pitch/i })).toBeInTheDocument();

    // Complex Pro Manager panels stay cleanly collapsed in default Arcade Mode
    expect(screen.queryByTestId('mind-games-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dugout-chess-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pitch-selector-bar')).not.toBeInTheDocument();

    // Toggling to Pro Manager unlocks all deep controls cleanly
    fireEvent.click(screen.getByTestId('control-mode-toggle'));
    expect(useUserPreferencesStore.getState().gameDayControlMode).toBe('advanced');
    expect(screen.getByTestId('mind-games-bar')).toBeInTheDocument();
    expect(screen.getByTestId('dugout-chess-card')).toBeInTheDocument();
    expect(screen.getByTestId('pitch-selector-bar')).toBeInTheDocument();

    // Toggling back returns to clean Arcade Mode
    fireEvent.click(screen.getByTestId('control-mode-toggle'));
    expect(useUserPreferencesStore.getState().gameDayControlMode).toBe('simple');
    expect(screen.queryByTestId('mind-games-bar')).not.toBeInTheDocument();
  });
});
