import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';

describe('Predetermined Season Schedule UI & Home/Away Road Trip Play', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
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

  it('shows the predetermined 7-series Home/Away schedule instead of an opponent picker and launches Road Trips with human batting TOP 1', () => {
    render(<GameDayScreen />);

    // No manual opponent picker ("Choose Today's Matchup") — shows predetermined schedule!
    expect(screen.queryByText(/choose today's matchup/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('scheduled-matchup-card')).toBeInTheDocument();
    expect(screen.getByTestId('season-schedule-strip')).toBeInTheDocument();
    expect(screen.getAllByTestId('schedule-series-pill')).toHaveLength(7);
    expect(screen.getByTestId('scheduled-matchup-card').textContent).toMatch(/series 1 of 7/i);
    expect(screen.getByTestId('scheduled-matchup-card').textContent).toMatch(/home/i);

    // Advance Series 1 -> Series 2 is a predetermined ROAD TRIP (@ Rival)
    fireEvent.click(screen.getByRole('button', { name: /sim next 3-game series/i }));
    expect(screen.getByTestId('scheduled-matchup-card').textContent).toMatch(/series 2 of 7/i);
    expect(screen.getByTestId('scheduled-matchup-card').textContent).toMatch(/road|away/i);

    // Launch Live 3D Game on the Road Trip -> human club is AWAY and bats immediately in TOP 1!
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    expect(screen.getByTestId('coach-action-cue').textContent).toMatch(/your turn to bat/i);
  });
});
