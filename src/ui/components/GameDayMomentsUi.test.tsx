import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';

describe('Game Day Moments UI (Clutch Jump-In, Series Tally, Broadcast Lower-Third & Scout Cards)', () => {
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

  it('shows probable pitching matchup + rival star scout cards pre-game and lets you jump straight into a late-inning Clutch Moment with TV Broadcast Lower-Third', () => {
    render(<GameDayScreen />);

    // Pre-Game Probable Matchup strip with tappable scout cards
    expect(screen.getByTestId('probable-matchup-strip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('scout-rival-starter-btn'));
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // Jump straight into late-inning Clutch Moment!
    fireEvent.click(screen.getByTestId('start-clutch-moment-btn'));
    expect(screen.getByTestId('live-game-3d-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('clutch-recap-banner')).toBeInTheDocument();
    expect(screen.getByTestId('broadcast-lower-third')).toBeInTheDocument();
    expect(screen.getByTestId('broadcast-lower-third').textContent).toMatch(/on deck/i);
    expect(screen.getByTestId('broadcast-lower-third').textContent).toMatch(/P • \d+%/i);
  });

  it('tracks live 3-game series results on the 7-series schedule strip and displays series stakes mid-series', () => {
    render(<GameDayScreen />);

    // Sim Game 1 via Instant Sim -> Series 1 stays active with 1-0 or 0-1 live series stakes badge!
    fireEvent.click(screen.getByRole('button', { name: /instant sim game/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to clubhouse/i }));
    expect(screen.getByTestId('series-stakes-badge').textContent).toMatch(/1-0|0-1/i);

    // Finish Series 1 -> Series 1 pill on schedule strip displays final W-L score (e.g. 2-1, 3-0, 1-2, 0-3)
    fireEvent.click(screen.getByRole('button', { name: /sim next 3-game series/i }));
    const firstSeriesPill = screen.getAllByTestId('schedule-series-pill')[0];
    expect(firstSeriesPill.textContent).toMatch(/[WL]\s*[0-3]-[0-3]|SWEEP/i);
  });

  it('lets you inspect any Free Agent 90s baseball card before spending cash to sign them', () => {
    render(<RosterLineupScreen onPlayBall={vi.fn()} />);

    const scoutButtons = screen.getAllByTestId('fa-scout-card-btn');
    expect(scoutButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(scoutButtons[0]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
  });
});
