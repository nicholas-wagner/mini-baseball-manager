import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../../store/gameStore';
import { GameDayScreen } from '../screens/GameDayScreen';
import { LeagueScreen } from '../screens/LeagueScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';

describe('Pitch Math / Dice-Roll Inspector & Deep Player Scouting Dossier Modal', () => {
  beforeEach(() => {
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

  it('toggles Show Math / Dice Rolls on Game Day Play-by-Play Ticker to reveal live formula breakdowns', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    fireEvent.click(screen.getByRole('button', { name: /next pitch/i }));

    // Off by default for clean arcade feed
    expect(screen.queryByTestId('pitch-math-breakdown')).not.toBeInTheDocument();

    // Turn ON Math / Dice Rolls inspector
    fireEvent.click(screen.getByRole('button', { name: /show math/i }));
    expect(screen.getAllByTestId('pitch-math-breakdown').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('pitch-math-breakdown')[0].textContent).toMatch(/d100/i);
  });

  it('opens Deep Player Scouting Dossier Modal from Roster showing 15 ratings vs caps, heritage & sabermetrics', () => {
    render(<RosterLineupScreen onPlayBall={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /full scouting dossier/i }));
    const modal = screen.getByTestId('player-dossier-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.textContent).toMatch(/stat caps/i);
    expect(modal.textContent).toMatch(/national heritage/i);
    expect(modal.textContent).toMatch(/career service/i);

    fireEvent.click(screen.getByRole('button', { name: /close scouting dossier/i }));
    expect(screen.queryByTestId('player-dossier-modal')).not.toBeInTheDocument();
  });

  it('opens Player Scouting Dossier Modal when clicking a League Leader on LeagueScreen', () => {
    useGameStore.getState().simNextSeriesRound(5);
    render(<LeagueScreen />);

    const leaderButtons = screen.getAllByRole('button', { name: /inspect leader/i });
    expect(leaderButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(leaderButtons[0]);
    expect(screen.getByTestId('player-dossier-modal')).toBeInTheDocument();
  });
});
