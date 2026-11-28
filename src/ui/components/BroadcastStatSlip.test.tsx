import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { matchBossClubProfile } from '../../engine/league/bossClubs';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import type { BroadcastStatSlipData } from '../../engine/simulation/broadcastSlips';
import type { GameSessionResult } from '../../engine/simulation/gameState';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { BroadcastStatSlip } from './BroadcastStatSlip';
import { MatchupPrints } from './GameDayPrints';
import { LiveGameCanvas } from './LiveGameCanvas';
import { PostGameSummaryModal } from './PostGameSummaryModal';

const SAMPLE_SLIP: BroadcastStatSlipData = {
  id: 'batter-1-TOP-0-p1',
  kind: 'batter_card',
  kicker: 'AT THE PLATE',
  title: '#24 Maya Chen · CF',
  statLine: '2-3, HR, 2 RBI · .342 AVG · 💣 Power Specialist',
  accentHex: '#E63946',
  badgeText: '🔥 HOT',
};

const MILESTONE_SLIP: BroadcastStatSlipData = {
  id: 'milestone-hr-14-p1',
  kind: 'milestone',
  kicker: 'MOONSHOT!',
  title: '#24 Maya Chen · CF',
  statLine: '2-3, HR, 2 RBI · .342 AVG',
  accentHex: '#FFC300',
  badgeText: '💣 HOME RUN',
};

describe('BroadcastStatSlip — 90s TV Broadcast Lower-Third UI (TASK-120)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUserPreferencesStore.getState().resetDefaults();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders retro non-blocking lower-third with pointer-events-none, accent stripe, and tabular numbers', () => {
    render(<BroadcastStatSlip slip={SAMPLE_SLIP} />);

    const slip = screen.getByTestId('broadcast-stat-slip');
    expect(slip).toBeInTheDocument();
    expect(slip.className).toContain('pointer-events-none');
    expect(slip.className).toContain('select-none');
    expect(slip.className).toMatch(/max-h-\[52px\]/);
    expect(slip).toHaveStyle({ borderLeftColor: '#E63946' });

    expect(slip).toHaveTextContent('AT THE PLATE');
    expect(slip).toHaveTextContent('#24 Maya Chen · CF');
    expect(slip).toHaveTextContent('2-3, HR, 2 RBI · .342 AVG · 💣 Power Specialist');
    expect(slip).toHaveTextContent('🔥 HOT');
  });

  it('auto-fades after 2.8s and resets visibility cleanly whenever slip.id changes', () => {
    const { rerender } = render(<BroadcastStatSlip slip={SAMPLE_SLIP} />);

    expect(screen.getByTestId('broadcast-stat-slip')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByTestId('broadcast-stat-slip')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.queryByTestId('broadcast-stat-slip')).toBeNull();

    // New slip id brings it right back and resets the 2.8s timer
    rerender(<BroadcastStatSlip slip={MILESTONE_SLIP} />);
    const nextSlip = screen.getByTestId('broadcast-stat-slip');
    expect(nextSlip).toHaveTextContent('MOONSHOT!');

    act(() => {
      vi.advanceTimersByTime(2_850);
    });
    expect(screen.queryByTestId('broadcast-stat-slip')).toBeNull();
  });

  it('respects reducedMotion with no slide transform and hides cleanly when slip is null', () => {
    useUserPreferencesStore.getState().toggleReducedMotion();
    const { rerender } = render(<BroadcastStatSlip slip={SAMPLE_SLIP} />);

    const slip = screen.getByTestId('broadcast-stat-slip');
    expect(slip).toHaveAttribute('data-reduced-motion', 'true');
    expect(slip.className).not.toMatch(/translate-x|animate-bounce|animate-pulse/);

    rerender(<BroadcastStatSlip slip={null} />);
    expect(screen.queryByTestId('broadcast-stat-slip')).toBeNull();
  });

  it('settles Boss Showdown bounty cash & ledger entry in store and renders PostGameSummaryModal callout', () => {
    vi.useRealTimers();
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
    const state = useGameStore.getState();
    const human = state.getHumanClub()!;
    const bossClub = state.leagues.rookie.find((c) => matchBossClubProfile(c) !== null)!;
    const baseSession = createGameSession(bossClub, human, 9123, 'regular', 5);
    const winningResult: GameSessionResult = {
      finalState: {
        ...baseSession,
        status: 'completed',
        winnerClubId: human.id,
        away: { ...baseSession.away, score: 2 },
        home: { ...baseSession.home, score: 5 },
      },
      events: [],
      awayScore: 2,
      homeScore: 5,
      winnerClubId: human.id,
      boxScore: baseSession.boxScore,
      playerStatDeltas: {},
    };

    const summary = useGameStore.getState().commitCompletedGame(bossClub.id, winningResult, true)!;
    const updatedHuman = useGameStore.getState().getHumanClub()!;

    expect(updatedHuman.franchiseRecords?.currentWinStreak).toBe(1);
    expect(updatedHuman.franchiseRecords?.longestWinStreak?.value).toBe(1);
    expect(summary.bossShowdown?.bossTitle).toBe('Sandlot Legends');
    expect(summary.bossShowdown?.bountyAwarded).toBe(1_000);
    expect(updatedHuman.economy.recentLedgerEntries?.[0]?.gameLabel).toBe(
      'Boss Showdown Bounty: Defeated Sandlot Legends',
    );
    expect(updatedHuman.economy.recentLedgerEntries?.[0]?.netDelta).toBe(1_000);

    render(
      <PostGameSummaryModal
        summary={summary}
        humanClub={updatedHuman}
        opponentClub={bossClub}
        managerLevel={1}
        onClose={vi.fn()}
      />,
    );
    const banner = screen.getByTestId('postgame-boss-bounty-banner');
    expect(banner).toHaveTextContent(/Sandlot Legends/i);
    expect(banner).toHaveTextContent(/\+\$1,000/);
  });

  it('forwards defensiveShift into LiveGameCanvas and surfaces BroadcastStatSlip + Pre-Game Boss banner in GameDayScreen', () => {
    vi.useRealTimers();
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
    const state = useGameStore.getState();
    const human = state.getHumanClub()!;
    const bossClub = state.leagues.rookie.find((c) => matchBossClubProfile(c) !== null)!;
    const session = createGameSession(bossClub, human, 9124, 'regular', 5);

    const canvasView = render(
      <LiveGameCanvas
        awayClub={bossClub}
        homeClub={human}
        session={session}
        defensiveShift="infield_in"
        favoritePlayerIds={[human.roster[0].id, human.roster[1].id]}
        hrCelebration="dugout_dance_line"
        stadiumWaveSignal={2}
        broadcastSlip={<BroadcastStatSlip slip={SAMPLE_SLIP} />}
      />,
    );
    expect(screen.getByTestId('live-game-3d-canvas')).toHaveAttribute(
      'data-defensive-shift',
      'infield_in',
    );
    expect(screen.getByTestId('live-game-3d-canvas')).toHaveAttribute(
      'data-favorite-player-count',
      '2',
    );
    expect(screen.getByTestId('live-game-3d-canvas')).toHaveAttribute(
      'data-hr-celebration',
      'dugout_dance_line',
    );
    expect(screen.getByTestId('live-game-3d-canvas')).toHaveAttribute(
      'data-stadium-wave-signal',
      '2',
    );
    expect(screen.getByTestId('live-broadcast-slip-slot')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('broadcast-stat-slip')).toHaveTextContent('#24 Maya Chen · CF');
    canvasView.unmount();

    // Advance series index until scheduled opponent is the Rookie Boss (Ironwood Knights)
    const rookieClubs = useGameStore.getState().leagues.rookie;
    const bossIdx = rookieClubs.findIndex((c) => matchBossClubProfile(c) !== null);
    expect(bossIdx).toBeGreaterThan(0);
    // Find which series index matches the boss club against human
    const { leagues } = useGameStore.getState();
    const reordered = [human, bossClub, ...leagues.rookie.filter((c) => c.id !== human.id && c.id !== bossClub.id)];
    // Put boss at the end of the 8-club array so round 0 pairs fixed[0] (human) vs rotating[last] (boss)!
    const round0BossOrder = [
      human,
      ...leagues.rookie.filter((c) => c.id !== human.id && c.id !== bossClub.id),
      bossClub,
    ];
    expect(reordered).toHaveLength(8);
    useGameStore.setState({
      leagues: { ...leagues, rookie: round0BossOrder },
      currentSeriesIndex: 0,
    });

    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    const pregameBoss = screen.getByTestId('pregame-boss-showdown-badge');
    expect(pregameBoss).toHaveTextContent(/BOSS SHOWDOWN/i);
    expect(pregameBoss).toHaveTextContent(/Sandlot Legends/i);
    expect(pregameBoss).toHaveTextContent(/\+\$1,000 Bounty/i);

    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    expect(screen.getByTestId('live-game-3d-canvas')).toHaveAttribute(
      'data-defensive-shift',
      'standard',
    );
    expect(screen.getByTestId('broadcast-stat-slip')).toHaveTextContent(/BOSS SHOWDOWN/i);
  });

  it("renders Today's At-Bat Memory inside MatchupPrints scouting card without bloating mobile thumb dock (TASK-124)", () => {
    vi.useRealTimers();
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
    const human = useGameStore.getState().getHumanClub()!;
    const batter = human.roster.find((p) => p.position !== 'SP' && p.position !== 'RP')!;
    const pitcher = human.roster.find((p) => p.position === 'SP')!;

    render(
      <MatchupPrints
        guided
        batter={batter}
        pitcher={pitcher}
        batterTodayMemory="1st K (Slider) · 3rd 2B (4-Seam)"
        onInspect={vi.fn()}
      />,
    );

    expect(screen.getByTestId('matchup-today-memory')).toHaveTextContent(
      'Today: 1st K (Slider) · 3rd 2B (4-Seam)',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Matchup' }));
    expect(screen.getByTestId('scouting-today-memory')).toHaveTextContent(
      'Today: 1st K (Slider) · 3rd 2B (4-Seam)',
    );
  });
});
