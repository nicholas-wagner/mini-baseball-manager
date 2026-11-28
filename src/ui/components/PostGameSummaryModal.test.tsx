import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { PostGameSummaryModal } from './PostGameSummaryModal';

function setupCareerAndSummary(seed = 1994) {
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

  const opponent = useGameStore.getState().leagues.rookie.find((c) => !c.isHuman)!;
  const summary = useGameStore.getState().playInstantExhibition(opponent.id, 777)!;
  return {
    club: useGameStore.getState().getHumanClub()!,
    opponent,
    summary,
  };
}

describe('PostGameSummaryModal (TASK-017 & TASK-100 3-Tab Celebration)', () => {
  beforeEach(() => {
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('renders Final Score, Game MVP holographic card, rewards, and triggers onClose', async () => {
    const user = userEvent.setup();
    const { club, opponent, summary } = setupCareerAndSummary(1994);
    const onClose = vi.fn();

    render(
      <PostGameSummaryModal
        summary={summary}
        humanClub={club}
        opponentClub={opponent}
        managerLevel={1}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: /post-game box score & mvp/i })).toBeInTheDocument();
    expect(screen.getAllByText(summary.mvp.playerName).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\+\$/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to clubhouse/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps hero mascot, headline, and primary CTAs above the 3 mobile-friendly tabs and switches cleanly across Highlights, Clubhouse, and Box Score', async () => {
    const user = userEvent.setup();
    const { club, opponent, summary } = setupCareerAndSummary(2026);
    const onOpenFoilPacks = vi.fn();
    const onPlayAgain = vi.fn();

    render(
      <PostGameSummaryModal
        summary={summary}
        humanClub={club}
        opponentClub={opponent}
        managerLevel={2}
        unopenedPackCount={1}
        playAgainLabel="Play Game 2/3"
        onOpenFoilPacks={onOpenFoilPacks}
        onPlayAgain={onPlayAgain}
        onClose={vi.fn()}
      />,
    );

    // Above-the-fold mascot & primary CTAs appear BEFORE the 3-tab switcher in DOM order
    const mascot = screen.getByTestId('club-mascot-buddy');
    const foilBtn = screen.getByRole('button', { name: /rip foil pack/i });
    const nextBtn = screen.getByRole('button', { name: /play game 2\/3/i });
    const tablist = screen.getByRole('tablist', { name: /post-game recap sections/i });

    expect(Boolean(mascot.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(foilBtn.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(nextBtn.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const highlightsTab = within(tablist).getByRole('tab', { name: /highlights/i });
    const clubhouseTab = within(tablist).getByRole('tab', { name: /clubhouse/i });
    const boxScoreTab = within(tablist).getByRole('tab', { name: /box score/i });

    // Every tab enforces >=44px mobile touch height
    for (const tab of [highlightsTab, clubhouseTab, boxScoreTab]) {
      expect(tab.className).toMatch(/min-h-\[44px\]|min-h-11/);
    }

    // Default tab is Highlights: MVP card, quote, rewards visible; Box Score & Clubhouse panels hidden
    expect(highlightsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mvp-dugout-quote')).toBeInTheDocument();
    expect(screen.queryByTestId('postgame-boxscore-panel')).not.toBeInTheDocument();

    // Switch to Clubhouse tab -> shows Clubhouse Chemistry/Morale + Off the Clock teammate chat
    await user.click(clubhouseTab);
    expect(clubhouseTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('postgame-clubhouse-panel')).toBeInTheDocument();
    expect(screen.getByTestId('postgame-clubhouse-chemistry')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /off the clock/i })).toBeInTheDocument();

    // Switch to Box Score tab -> shows Line Score + Top Performers
    await user.click(boxScoreTab);
    expect(boxScoreTab).toHaveAttribute('aria-selected', 'true');
    const boxPanel = screen.getByTestId('postgame-boxscore-panel');
    expect(boxPanel).toBeInTheDocument();
    expect(within(boxPanel).getByText(/line score/i)).toBeInTheDocument();
    expect(within(boxPanel).getByTestId('postgame-top-performers')).toBeInTheDocument();
  });

  it('displays newly snapped Victory Polaroid inside the Highlights tab when present (TASK-122)', () => {
    const { club, opponent, summary } = setupCareerAndSummary(1994);
    const withPolaroid = {
      ...summary,
      won: true,
      latestPolaroid: {
        id: 'polaroid-s1-g1-walk_off',
        season: 1,
        occasion: 'walk_off' as const,
        badgeLabel: 'WALK-OFF WIN!',
        headline: 'Walk-Off Magic!',
        caption: 'Strawberry milkshakes on the skipper with Rocket Dog after a 5-4 walk-off!',
        scoreLine: '5-4 vs Rivals',
        stadiumName: club.stadium.name,
        playerIds: [club.roster[0].id, club.roster[1].id],
        playerNames: [club.roster[0].name, club.roster[1].name],
        createdAtGameNumber: 1,
      },
    };

    render(
      <PostGameSummaryModal
        summary={withPolaroid}
        humanClub={club}
        opponentClub={opponent}
        managerLevel={1}
        onClose={vi.fn()}
      />,
    );

    const polaroid = screen.getByTestId('postgame-victory-polaroid');
    expect(polaroid).toBeInTheDocument();
    expect(within(polaroid).getByTestId('polaroid-occasion-ribbon')).toHaveTextContent('WALK-OFF WIN!');
    expect(within(polaroid).getByText(/strawberry milkshakes on the skipper/i)).toBeInTheDocument();
  });
});
