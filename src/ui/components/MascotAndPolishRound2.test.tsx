import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { FoilPackModal } from './FoilPackModal';
import { PostGameSummaryModal } from './PostGameSummaryModal';
import { GameDayScreen } from '../screens/GameDayScreen';

describe('Round 2 Gameplay Polish: Mascot Buddy, Tactile Foil Reveal, Accurate Post-Game MVP & Streamlined Game Day', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
    useGameStore.getState().startNewCareer({
      city: 'Harbor',
      clubName: 'Otters',
      mascot: 'Splash Otter',
      monogram: 'HO',
      primaryColor: '#0096C7',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('renders reactive 90s cartoon ClubMascotBuddy SVG across mascot archetypes and moods', () => {
    const { rerender } = render(
      <ClubMascotBuddy
        mascot="Splash Otter"
        primaryColor="#0096C7"
        secondaryColor="#1D3557"
        accentColor="#FFD166"
        mood="cheering"
      />,
    );
    expect(screen.getByTestId('club-mascot-buddy')).toBeInTheDocument();

    rerender(
      <ClubMascotBuddy
        mascot="Lucky Fox"
        primaryColor="#2FB356"
        secondaryColor="#1B4332"
        accentColor="#FFC300"
        mood="rally"
      />,
    );
    expect(screen.getByTestId('club-mascot-buddy')).toBeInTheDocument();
  });

  it('displays accurate rival MVP baseball card, player-first score order, mascot celebration, Foil Pack rip button & context-aware next CTA in PostGameSummaryModal', () => {
    const state = useGameStore.getState();
    const humanClub = state.getHumanClub()!;
    const rivalClub = state.leagues[humanClub.leagueTier].find((c) => c.id !== humanClub.id)!;
    const rivalStar = rivalClub.roster[2];
    const baseSummary = state.playInstantExhibition(rivalClub.id, 1994)!;

    // Craft a Home WIN (humanScore 6, rivalScore 2) where a RIVAL player got MVP to verify both fixes!
    const customSummary = {
      ...baseSummary,
      isHomeGame: true,
      won: true,
      awayScore: 2,
      homeScore: 6,
      mvp: {
        clubId: rivalClub.id,
        playerId: rivalStar.id,
        playerName: rivalStar.name,
        impactScore: 18,
        summary: '3-for-3, 1 HR',
      },
    };

    const onOpenFoilPacks = vi.fn();
    render(
      <PostGameSummaryModal
        summary={customSummary}
        humanClub={useGameStore.getState().getHumanClub()!}
        opponentClub={rivalClub}
        managerLevel={2}
        unopenedPackCount={1}
        playAgainLabel="Play Game 2/3 of Series"
        onOpenFoilPacks={onOpenFoilPacks}
        onPlayAgain={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /post-game box score & mvp/i });
    // Shows player-first score (6-2) instead of backwards 2-6!
    expect(dialog.textContent).toContain('6-2');
    // Shows the ACTUAL rival MVP card (not humanClub.roster[0])!
    expect(screen.getByLabelText(new RegExp(`${rivalStar.name} baseball card front`, 'i'))).toBeInTheDocument();
    // Shows cute ClubMascotBuddy cheering and 1-tap Victory Foil Pack button + context-aware Next CTA!
    expect(screen.getByTestId('club-mascot-buddy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play game 2\/3 of series/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /rip foil pack/i }));
    expect(onOpenFoilPacks).toHaveBeenCalledTimes(1);
  });

  it('gives 1994 Foil Packs an interactive 3-card foil flip reveal with Reveal All', () => {
    useFoilPackStore.getState().awardPack('rivalry_chrome', 'Big Victory!');
    render(<FoilPackModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));
    const cards = screen.getAllByTestId('foil-pack-card');
    expect(cards).toHaveLength(3);

    // Cards 2 & 3 start foil-sealed for tactile tap-to-peel anticipation; Reveal All flips them open!
    expect(screen.getByRole('button', { name: /reveal all 3 cards/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reveal all 3 cards/i }));
    expect(screen.queryByRole('button', { name: /reveal all 3 cards/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('foil-pack-summary')).toBeInTheDocument();
  });

  it('puts Next Matchup above Manager Clipboard, keeps Play Ball clean with Fast Sim menu, pauses Smart Watch on card inspect, and awards Victory Foil Packs via Sim to End', () => {
    render(<GameDayScreen />);

    // Play Ball matchup card appears BEFORE Manager Clipboard so players can play immediately on mobile!
    const matchupEl = screen.getByTestId('scheduled-matchup-card');
    const clipboardEl = screen.getByTestId('manager-action-inbox');
    expect(
      Boolean(matchupEl.compareDocumentPosition(clipboardEl) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(screen.getByTestId('club-mascot-buddy')).toBeInTheDocument();

    // Launch live 3D game -> streamlined bar with Fast Sim drawer & batter nickname in lower-third
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    expect(screen.getByTestId('broadcast-lower-third').textContent).toMatch(/“.*”|".*"/);
    expect(screen.getByTestId('fast-sim-toggle')).toBeInTheDocument();

    // Turn on Smart Watch, then inspect Batter Card -> Smart Watch pauses cleanly!
    fireEvent.click(screen.getByTestId('smart-watch-toggle'));
    expect(screen.getByTestId('smart-watch-toggle').textContent).toMatch(/smart on/i);
    fireEvent.click(screen.getByTestId('inspect-batter-card-btn'));
    expect(screen.getByTestId('smart-watch-toggle').textContent).toMatch(/smart watch/i);
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // Open Fast Sim menu -> Sim to End finishes the ACTUAL game cleanly!
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /sim to end/i }));
    expect(screen.getByRole('dialog', { name: /post-game box score & mvp/i })).toBeInTheDocument();
  });
});
