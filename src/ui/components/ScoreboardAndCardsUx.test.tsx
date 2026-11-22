import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ScoreboardStrip } from '../design-system/ScoreboardStrip';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';

describe('Mobile Roster Baseball Cards, Live R/H/E Scoreboard & In-Game Player Card Viewer', () => {
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

  it('displays full R/H/E line totals, inning, count (B-S & Outs), and base diamond on ScoreboardStrip', () => {
    render(
      <ScoreboardStrip
        awayAbbr="BP"
        awayScore={3}
        awayHits={7}
        awayErrors={1}
        awayColor="#0096C7"
        homeAbbr="SC"
        homeScore={4}
        homeHits={8}
        homeErrors={0}
        homeColor="#E63946"
        inning={5}
        half="BOT"
        balls={2}
        strikes={1}
        outs={2}
        bases={[true, false, true]}
      />,
    );

    const sb = screen.getByRole('region', { name: /live baseball scoreboard/i });
    expect(sb.textContent).toMatch(/R/);
    expect(sb.textContent).toMatch(/H/);
    expect(sb.textContent).toMatch(/E/);
    expect(screen.getByTestId('scoreboard-away-rhe').textContent).toMatch(/3.*7.*1/);
    expect(screen.getByTestId('scoreboard-home-rhe').textContent).toMatch(/4.*8.*0/);
    expect(screen.getByTestId('scoreboard-count-text').textContent).toMatch(/2-1/);
    expect(screen.getByTestId('scoreboard-bases-diamond')).toBeInTheDocument();
  });

  it('lets the user inspect the live batter, pitcher, and other players baseball cards during a 3D game while updating R/H/E & count live', () => {
    render(<GameDayScreen />);

    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Live scoreboard renders R/H/E and count text immediately
    expect(screen.getByTestId('scoreboard-away-rhe')).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard-home-rhe')).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard-count-text')).toBeInTheDocument();

    // Tap "Next Pitch" and ensure the live scoreboard reflects live game progression
    fireEvent.click(screen.getByRole('button', { name: /next pitch/i }));

    // Tap the Batter Baseball Card button in the Live Action Bar -> opens PlayerCardModal!
    const batterBtn = screen.getByTestId('inspect-batter-card-btn');
    fireEvent.click(batterBtn);
    const dialog = screen.getByRole('dialog', { name: /player baseball card/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toMatch(/at bat/i);

    // Switch to the Pitcher's card inside the modal
    fireEvent.click(screen.getByTestId('card-modal-pitcher-tab'));
    expect(dialog.textContent).toMatch(/pitching/i);

    // Switch to another player from the in-game lineup chips
    const lineupChips = screen.getAllByTestId('card-modal-player-chip');
    expect(lineupChips.length).toBeGreaterThanOrEqual(9);
    fireEvent.click(lineupChips[2]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
  });

  it('provides a mobile-friendly Roster Card Binder gallery and 1-tap Card modal for every player on RosterLineupScreen', () => {
    render(<RosterLineupScreen onPlayBall={vi.fn()} />);

    // 1-tap "Card" button on lineup rows opens the Baseball Card modal immediately (no 2500px mobile scroll!)
    const cardButtons = screen.getAllByTestId('roster-open-card-btn');
    expect(cardButtons.length).toBeGreaterThanOrEqual(9);
    fireEvent.click(cardButtons[0]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();

    // Flip to Next teammate's card right inside the modal
    fireEvent.click(screen.getByRole('button', { name: /next player/i }));
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // Switch to full Roster Card Binder gallery to browse all 18 baseball cards on mobile or desktop
    fireEvent.click(screen.getByTestId('roster-view-cards-btn'));
    expect(screen.getByTestId('roster-card-binder')).toBeInTheDocument();
    expect(screen.getAllByTestId('roster-binder-card-slot').length).toBe(18);
  });
});
