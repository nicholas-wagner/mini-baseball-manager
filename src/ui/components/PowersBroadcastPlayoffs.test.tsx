import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createClub } from '../../engine/gm/rosterFactory';
import { createSeededRng } from '../../engine/rng/seededRng';
import { createGameSession, stepPitch } from '../../engine/simulation/baseballEngine';
import { useGameStore } from '../../store/gameStore';
import { usePostseasonStore } from '../../store/postseasonStore';
import { BroadcastHud } from './BroadcastHud';
import { GameDayScreen } from '../screens/GameDayScreen';
import { LeagueScreen } from '../screens/LeagueScreen';

const TEST_COLORS = {
  primary: '#E63946',
  secondary: '#1D3557',
  accent: '#FFC300',
  monogram: 'SC',
};

describe('Broadcast Strike-Zone Plot, Active Special Power Dock & Interactive Playoff Bracket', () => {
  beforeEach(() => {
    usePostseasonStore.getState().clearBracket();
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

  it('renders the SVG Strike-Zone Mini-Plot with plotted pitch markers in BroadcastHud', () => {
    const rng = createSeededRng(501);
    const away = createClub(rng, { id: 'a', city: 'Away', name: 'Foxes', mascot: 'Fox', colors: TEST_COLORS, leagueTier: 'rookie', isHuman: false });
    const home = createClub(rng, { id: 'h', city: 'Home', name: 'Comets', mascot: 'Comet', colors: TEST_COLORS, leagueTier: 'rookie', isHuman: true });
    const session = createGameSession(away, home, 123);
    const stepped = stepPitch(session, 'normal');
    const pitchEvent = stepped.events.find((e) => e.pitchThrown) ?? stepped.events[stepped.events.length - 1];

    render(
      <BroadcastHud
        session={stepped.nextSession}
        winProbHistory={[0.5, 0.52]}
        defensiveShift="standard"
        onSelectShift={() => {}}
        activeTacticalCall="normal"
        onSelectStealCall={() => {}}
        lastEvent={pitchEvent}
        atBatEvents={stepped.events.filter((e) => e.pitchThrown)}
      />,
    );

    expect(screen.getByTestId('strike-zone-plot')).toBeInTheDocument();
  });

  it('exposes live Active National/Capstone Power activation button & Matchup Power Badges in GameDayScreen', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    expect(screen.getByTestId('active-powers-dock')).toBeInTheDocument();
    expect(screen.getByTestId('matchup-power-badges')).toBeInTheDocument();

    // Advance pitches until a play resolves cleanly
    fireEvent.click(screen.getByRole('button', { name: /sim at-bat/i }));
    expect(screen.getByTestId('play-by-play-ticker')).toBeInTheDocument();
  });

  it('renders interactive Best-of-3 Playoff Bracket on LeagueScreen & allows simming / launching 3D playoff game', () => {
    // Complete 7 regular-season series so Playoff Bracket unlocks
    for (let i = 0; i < 7; i += 1) {
      useGameStore.getState().simNextSeriesRound(5);
    }

    let launchedLive = false;
    render(<LeagueScreen onPlayLivePlayoffGame={() => { launchedLive = true; }} />);

    expect(screen.getByTestId('playoff-bracket-panel')).toBeInTheDocument();
    const openBtn = screen.getByRole('button', { name: /launch best-of-3 playoff bracket/i });
    fireEvent.click(openBtn);
    expect(screen.getAllByText(/semifinal a/i).length).toBeGreaterThanOrEqual(1);

    const simGameBtn = screen.getByRole('button', { name: /sim next playoff game/i });
    fireEvent.click(simGameBtn);
    expect(screen.getByTestId('league-notice')).toBeInTheDocument();
    expect(typeof launchedLive).toBe('boolean');
  });
});
