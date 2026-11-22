import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';
import { PostGameSummaryModal } from './PostGameSummaryModal';

describe('GM-First Manager Clipboard, Auto-Leveling, Sticky Score & Mobile Modal Safety', () => {
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

  it('shows the Manager Clipboard on Play Ball with 1-tap Fast GM Sim Series, Quick Practice & dynamic alerts', () => {
    let jumpedTo: string | null = null;
    render(<GameDayScreen onJumpToTab={(tab) => { jumpedTo = tab; }} />);

    expect(screen.getByTestId('manager-action-inbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sim next 3-game series/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick team practice/i })).toBeInTheDocument();

    // Running Quick Team Practice boosts XP ONCE, then locks until the next game or series is played
    const practiceBtn = screen.getByRole('button', { name: /quick team practice/i });
    fireEvent.click(practiceBtn);
    expect(screen.getByTestId('gm-quick-feedback')).toHaveTextContent(/team practice/i);
    expect(useGameStore.getState().practiceAvailable).toBe(false);
    expect(screen.getByRole('button', { name: /practice done/i })).toBeDisabled();

    // Direct store spam attempt is blocked cleanly (zero extra XP/SP exploit!)
    const xpAfterFirst = useGameStore.getState().getHumanClub()!.roster[0].xp;
    expect(useGameStore.getState().runQuickTeamPracticeAction()).toBeNull();
    expect(useGameStore.getState().getHumanClub()!.roster[0].xp).toBe(xpAfterFirst);

    // Sim Next 3-Game Series advances the season, grants auto XP/cash, AND unlocks 1 fresh practice
    const cashBefore = useGameStore.getState().getHumanClub()!.economy.cash;
    fireEvent.click(screen.getByRole('button', { name: /sim next 3-game series/i }));
    expect(useGameStore.getState().currentSeriesIndex).toBe(1);
    expect(useGameStore.getState().getHumanClub()!.economy.cash).toBeGreaterThan(cashBefore);
    expect(useGameStore.getState().practiceAvailable).toBe(true);
    expect(screen.getByRole('button', { name: /quick team practice/i })).not.toBeDisabled();
    expect(screen.getByTestId('gm-quick-feedback')).toHaveTextContent(/series 1/i);

    // Practice again -> locked; playing a single game unlocks practice once more
    fireEvent.click(screen.getByRole('button', { name: /quick team practice/i }));
    expect(useGameStore.getState().practiceAvailable).toBe(false);
    const club = useGameStore.getState().getHumanClub()!;
    const opp = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    useGameStore.getState().playInstantExhibition(opp.id, 2026);
    expect(useGameStore.getState().practiceAvailable).toBe(true);
    expect(jumpedTo).toBeNull();
  });

  it('keeps the live scoreboard sticky while watching a live game', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    const stickyWrap = screen.getByTestId('sticky-live-scoreboard');
    expect(stickyWrap.className).toMatch(/sticky/);
    expect(screen.getByRole('region', { name: /live baseball scoreboard/i })).toBeInTheDocument();
  });

  it('auto-selects a player with unspent Skill Points in SkillTreeScreen and exposes the Manager Skill Tree tab right beside Player Trees', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const secondPlayer = club.roster[1];
    // Give ONLY roster[1] unspent SP so auto-selection is verified
    useGameStore.setState((s) => ({
      leagues: {
        ...s.leagues,
        [club.leagueTier]: s.leagues[club.leagueTier].map((c) =>
          c.id === club.id
            ? {
                ...c,
                roster: c.roster.map((p, idx) => ({ ...p, skillPoints: idx === 1 ? 2 : 0 })),
              }
            : c,
        ),
      },
      manager: s.manager ? { ...s.manager, skillPoints: 1 } : null,
    }));

    render(<SkillTreeScreen />);
    expect(screen.getByText(new RegExp(`${secondPlayer.name} \\(${secondPlayer.position}\\)`))).toBeInTheDocument();

    // Switch to integrated Manager Skill Tree tab and confirm Manager SP nodes render
    fireEvent.click(screen.getByRole('button', { name: /manager skill tree/i }));
    expect(screen.getByTestId('manager-skill-tree-panel')).toBeInTheDocument();
    expect(screen.getByText(/dugout pep talk/i)).toBeInTheDocument();
  });

  it('anchors PostGameSummaryModal cleanly from the top on mobile and showcases Auto Level-Ups', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const opp = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const summary = useGameStore.getState().playInstantExhibition(opp.id, 1994)!;
    const summaryWithLevelUps = {
      ...summary,
      levelUps: [{ playerId: club.roster[0].id, playerName: club.roster[0].name, newLevel: 2, spEarned: 1 }],
    };

    render(
      <PostGameSummaryModal
        summary={summaryWithLevelUps}
        humanClub={useGameStore.getState().getHumanClub()!}
        managerLevel={2}
        onClose={() => {}}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /post-game box score & mvp/i });
    expect(dialog.className).toContain('items-start');
    expect(screen.getByTestId('postgame-levelups-card')).toHaveTextContent(club.roster[0].name);
  });
});
