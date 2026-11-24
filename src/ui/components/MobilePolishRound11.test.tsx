import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { FlipBaseballCard } from './FlipBaseballCard';
import { LiveActionBar } from './LiveActionBar';
import { PlayerCardModal } from './PlayerCardModal';
import { UniformDesignerPanel } from './UniformDesignerPanel';
import { toBaseballCardPlayer } from '../utils/playerCardAdapter';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { LeagueScreen } from '../screens/LeagueScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';

function seedCareer(seed = 1994) {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
    managerName: 'Coach Skip',
    seed,
  });
}

describe('TASK-085 — Mobile Drawers Under Thumb, Lobby Auto-Scroll, Card Icons, Customize, League, Uniforms & Skill Tree', () => {
  beforeEach(() => {
    seedCareer();
  });

  it('mounts LiveActionBar drawers and ArcadeTimingMeter inside live-control-grid and hides duplicate Throw Pitch when timing is active', () => {
    const baseProps = {
      cue: {
        kind: 'power_ready' as const,
        urgency: 'calm' as const,
        turnLabel: 'TOP 1 • PITCHING',
        badgeText: 'ON THE MOUND',
        headline: 'Pitch to the corner',
        detail: 'Stay ahead.',
        primaryButtonLabel: 'Throw Pitch',
        coachLine: 'Attack the zone.',
        suggestedAction: null,
      },
      matchupLabel: 'Batter vs Pitcher',
      basesLabel: 'Bases: · · ·',
      latestEvent: null,
      controlMode: 'simple' as const,
      watchMode: 'paused' as const,
      smartPauseReason: null,
      tacticalCall: 'normal' as const,
      pitchTarget: 'paint_corners' as const,
      isBatting: false,
      gameCompleted: false,
      defensiveShift: 'standard' as const,
      onSelectDefensiveShift: vi.fn(),
      bullpenOptions: [{ id: 'rp1', name: 'Rex Flame', throws: 'R', roleLabel: 'Setup' }],
      onSelectBullpenReliever: vi.fn(),
      arcadeTimingEnabled: false,
      onToggleArcadeTiming: vi.fn(),
      onNextPitch: vi.fn(),
      onToggleWatchMode: vi.fn(),
      onSimAtBat: vi.fn(),
      onSimHalfInning: vi.fn(),
      onClutchSim: vi.fn(),
      onSimToEnd: vi.fn(),
      onSelectTacticalCall: vi.fn(),
      onSelectPitchTarget: vi.fn(),
      onSuggestedAction: vi.fn(),
      onToggleControlMode: vi.fn(),
    };

    const { rerender } = render(<LiveActionBar {...baseProps} />);
    const controlGrid = screen.getByTestId('live-control-grid');

    // Fast Sim drawer renders INSIDE live-control-grid (right under Sim button!) as a 2-col grid
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    const simDrawer = within(controlGrid).getByTestId('fast-sim-drawer');
    expect(simDrawer.className).toMatch(/grid-cols-2/);

    // Shift drawer renders INSIDE live-control-grid
    fireEvent.click(screen.getByTestId('arcade-shift-toggle'));
    expect(within(controlGrid).getByTestId('arcade-shift-drawer')).toBeInTheDocument();

    // Bullpen drawer renders INSIDE live-control-grid
    fireEvent.click(screen.getByTestId('arcade-bullpen-toggle'));
    expect(within(controlGrid).getByTestId('arcade-bullpen-drawer')).toBeInTheDocument();

    // Timing meter renders INSIDE live-control-grid and hides duplicate top Throw Pitch button
    rerender(<LiveActionBar {...baseProps} arcadeTimingEnabled />);
    const updatedGrid = screen.getByTestId('live-control-grid');
    expect(within(updatedGrid).getByTestId('arcade-timing-meter')).toBeInTheDocument();
    expect(screen.queryByTestId('live-primary-pitch-btn')).toBeNull();
  });

  it('renders Meet Your 3 Stars in a compact 3-column mobile strip and scrolls expanded GM options into view', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(<GameDayScreen />);
    const squadCard = screen.getByTestId('meet-your-squad-card');
    const starGrid = within(squadCard).getByTestId('squad-star-grid');
    expect(starGrid.className).toMatch(/grid-cols-3/);

    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    expect(screen.getByTestId('scheduled-matchup-card')).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('removes doubled emoji icons on PlayerCardModal and puts Flip Stats inline on FlipBaseballCard', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const player = club.roster[0];

    render(
      <PlayerCardModal
        open
        entry={{ player, club, roleTag: 'LINEUP #1' }}
        allEntries={[{ player, club }]}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        onCustomizePlayer={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const favBtn = screen.getByTestId('toggle-favorite-player-btn');
    const nickBtn = screen.getByTestId('edit-nickname-toggle');
    expect(favBtn.textContent).not.toMatch(/☆|⭐/);
    expect(favBtn.textContent).toMatch(/star favorite/i);
    expect(nickBtn.textContent).not.toMatch(/✏️/);
    expect(nickBtn.textContent).toMatch(/nickname & #/i);

    const { container } = render(
      <FlipBaseballCard
        player={toBaseballCardPlayer(player)}
        team={{
          primary: club.colors.primary,
          secondary: club.colors.secondary,
          accent: club.colors.accent,
          monogram: club.colors.monogram,
        }}
      />,
    );
    const metaRow = container.querySelector('[data-testid="card-meta-strip"]');
    expect(metaRow).not.toBeNull();
    expect(within(metaRow as HTMLElement).getByRole('button', { name: /flip .* to stats/i })).toBeInTheDocument();
  });

  it('gives Customize Club a Back button, 5-column single-row mascot picker, and side-by-side action bar', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change club' }));

    const backBtn = screen.getByTestId('creator-back-btn');
    expect(backBtn).toBeInTheDocument();

    const mascotGrid = within(screen.getByTestId('mascot-animal-picker')).getByTestId(
      'mascot-picker-grid',
    );
    expect(mascotGrid.className).toMatch(/grid-cols-5/);

    const actionRow = screen.getByTestId('creator-primary-actions');
    expect(actionRow.className).toMatch(/grid-cols-\[1fr_auto\]/);

    // Clicking Back returns to Opening Cover
    fireEvent.click(backBtn);
    expect(screen.getByRole('button', { name: 'Change club' })).toBeInTheDocument();
  });

  it('uses a single-row scrollable tier strip on LeagueScreen, hides disabled Playoffs on Day 1, and omits card emoji clutter in standings', () => {
    render(<LeagueScreen />);
    const tierTabs = screen.getByTestId('league-tier-tabs');
    expect(tierTabs.className).toMatch(/flex-nowrap/);
    expect(tierTabs.className).toMatch(/overflow-x-auto/);

    // On Day 1 (0/7 series), Playoffs & Offseason button is hidden instead of wasting space disabled
    expect(screen.queryByRole('button', { name: /playoffs & offseason/i })).toBeNull();

    // Standings club rows use clean color dots rather than 🃏 emoji prefix
    const clubBtns = screen.getAllByTestId('standings-club-btn');
    expect(clubBtns[0].textContent).not.toContain('🃏');
  });

  it('renders Uniform Studio throwback presets in a 2-column mobile grid and SkillTreeScreen with ready-players hint & compact summary', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const { unmount } = render(<UniformDesignerPanel club={club} onNotice={vi.fn()} />);
    expect(screen.getByTestId('uniform-presets-grid').className).toMatch(/grid-cols-2/);
    unmount();

    // Give exactly 2 players unspent SP so ready-hint displays deterministically
    const buffedRoster = club.roster.map((p, i) => ({ ...p, skillPoints: i < 2 ? 2 : 0 }));
    useGameStore.setState((state) => ({
      leagues: {
        ...state.leagues,
        [club.leagueTier]: state.leagues[club.leagueTier].map((c) =>
          c.id === club.id ? { ...c, roster: buffedRoster } : c,
        ),
      },
    }));

    render(<SkillTreeScreen />);
    expect(screen.getByTestId('skill-tree-ready-hint')).toHaveTextContent(/2 ready/i);
    expect(screen.getByTestId('skill-tree-player-summary')).toBeInTheDocument();
    expect(screen.getByTestId('skill-tree-player-portrait')).toBeInTheDocument();
  });
});
