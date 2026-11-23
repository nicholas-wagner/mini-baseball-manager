import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { LeagueScreen } from '../screens/LeagueScreen';

describe('Sports-Page Series Recap, Arcade Bullpen, Pre-Game Auto-Tune & Clickable League Cards', () => {
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

  it('shows a Sports-Page Series Recap card after simming a series with 3 game scores and clickable Series MVP baseball card', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));

    fireEvent.click(screen.getByRole('button', { name: /sim next 3-game series/i }));
    const recap = screen.getByTestId('series-recap-card');
    expect(recap).toBeInTheDocument();
    expect(screen.getAllByTestId('series-recap-game-chip')).toHaveLength(3);

    // Click Series MVP to flip their 90s baseball card!
    fireEvent.click(screen.getByTestId('series-recap-mvp-btn'));
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // Dismiss clears the Sports-Page card cleanly
    fireEvent.click(screen.getByRole('button', { name: /dismiss series recap/i }));
    expect(screen.queryByTestId('series-recap-card')).not.toBeInTheDocument();
  });

  it('offers 1-tap Pre-Game Auto-Tune vs today starter and 1-tap Arcade Mode Bullpen reliever picker in 3D games', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));

    // Pre-game Lineup Check + 1-tap Auto-Tune vs Rival Starter
    expect(screen.getByTestId('pregame-lineup-check')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('auto-tune-lineup-btn'));

    // Start Live 3D Game in Simple Arcade Mode -> open 1-tap Bullpen Picker & bring in a reliever!
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    expect(screen.getByTestId('arcade-bullpen-toggle')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('arcade-bullpen-toggle'));
    expect(screen.getByTestId('arcade-bullpen-drawer')).toBeInTheDocument();

    const relieverBtns = screen.getAllByTestId('arcade-bullpen-bring-in');
    expect(relieverBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(relieverBtns[0]);
    expect(screen.queryByTestId('arcade-bullpen-drawer')).not.toBeInTheDocument();
  });

  it('lets you click any League Leader or Rival Club in Standings on LeagueScreen to flip their 90s baseball cards', () => {
    // Sim 1 series so League Leaders have populated stats
    useGameStore.getState().simNextSeriesRound(5);
    render(<LeagueScreen />);

    // Click a Rival Club in Standings -> opens PlayerCardModal with their roster cards!
    const clubBtns = screen.getAllByTestId('standings-club-btn');
    expect(clubBtns.length).toBe(8);
    fireEvent.click(clubBtns[1]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // Click a League Leader -> opens PlayerCardModal with their 90s baseball card!
    const leaderBtns = screen.getAllByTestId('league-leader-card-btn');
    expect(leaderBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(leaderBtns[0]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
  });
});
