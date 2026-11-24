import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { simFullGame } from '../../engine/simulation/baseballEngine';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';

it('carries the park lineup edit into play and stops Smart Watch before the selected hitter’s first pitch', () => {
  useUserPreferencesStore.getState().resetDefaults();
  startClub();
  render(<GameDayScreen />);
  fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
  fireEvent.click(screen.getByText(/park scouting/i));
  const club = useGameStore.getState().getHumanClub()!;
  const hitter = club.roster.find((p) => p.id === club.lineup[1].playerId)!;
  fireEvent.click(screen.getByRole('button', { name: /move up/i }));
  expect(useGameStore.getState().getHumanClub()!.lineup[0].playerId).toBe(
    hitter.id,
  );
  fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
  fireEvent.click(screen.getByTestId('fast-sim-toggle'));
  vi.useFakeTimers();
  try {
    fireEvent.click(screen.getByRole('button', { name: /sim half-inn/i }));
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByLabelText('Out-of-town scoreboard')).toHaveTextContent(
      'FINAL',
    );
    expect(
      useGameStore.getState().getHumanClub()!.leagueWireFinal?.gameIndex,
    ).toBe(0);
    fireEvent.change(screen.getByLabelText('Pause Smart Watch'), {
      target: { value: hitter.id },
    });
    fireEvent.click(screen.getByTestId('smart-watch-toggle'));
    expect(
      screen.getByText('Smart Watch paused · ' + hitter.name + ' is up'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: 'Matchup cards' })).getByRole(
        'button',
        { name: 'Inspect ' + hitter.name + ' card' },
      ),
    ).toBeVisible();
  } finally {
    vi.useRealTimers();
  }
});

function startClub() {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
    managerName: 'Skip',
    startingPreset: 'balanced',
    seed: 2089,
  });
}

it('settles each out-of-town game once when the manager sweeps via instant sim', () => {
  startClub();
  const state = useGameStore.getState();
  const human = state.getHumanClub()!;
  const tier = state.leagues.rookie;
  const opponent = tier[tier.length - 1];
  let game = simFullGame(opponent, human, 1, 5);
  for (let seed = 2; game.winnerClubId !== human.id; seed++) {
    game = simFullGame(opponent, human, seed, 5);
  }
  for (let index = 0; index < 3; index++) {
    state.commitCompletedGame(opponent.id, game, true);
  }
  const finished = useGameStore.getState();
  expect(finished.currentSeriesIndex).toBe(1);
  expect(finished.leagues.rookie.map((c) => c.wins + c.losses)).toEqual(Array(8).fill(3));
});
