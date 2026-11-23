import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ArcadeDerbyModal } from './ArcadeDerbyModal';
import { PlayerCardModal } from './PlayerCardModal';
import { PostGameSummaryModal } from './PostGameSummaryModal';
import { TrophyCaseModal } from './TrophyCaseModal';
import { GameDayScreen } from '../screens/GameDayScreen';

describe('Instant Hook Round 4: Day-1 SP & Checklist, Arcade Speed/Steal/Smart Start, Favorite/Nickname, Playable Derby & Trophy Album', () => {
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

  it('starts Captain & Ace with Day-1 Opening Spark SP and lets players claim the 3-step Welcome Checklist bonus', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const totalSp = club.roster.reduce((sum, p) => sum + p.skillPoints, 0);
    expect(totalSp).toBeGreaterThanOrEqual(2);

    // Complete all 3 steps: 1 pack opened, 1 game played, 1 skill unlocked!
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Welcome!');
    useFoilPackStore.getState().ripNextPack();
    const playerWithSp = useGameStore.getState().getHumanClub()!.roster.find((p) => p.skillPoints > 0)!;
    useGameStore.getState().unlockPlayerHeritageTier(playerWithSp.id);
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    useGameStore.getState().playInstantExhibition(rival.id, 1994);

    render(<GameDayScreen />);
    expect(screen.getByTestId('welcome-checklist-strip')).toBeInTheDocument();
    const cashBefore = useGameStore.getState().getHumanClub()!.economy.cash;
    fireEvent.click(screen.getByRole('button', { name: /claim.*reward/i }));
    expect(useGameStore.getState().getHumanClub()!.economy.cash).toBeGreaterThan(cashBefore);
    expect(screen.queryByTestId('welcome-checklist-strip')).not.toBeInTheDocument();
  });

  it('lets you Star/Favorite a player, customize their nickname & jersey #, and displays cute MVP Dugout Quotes', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const star = club.roster[0];

    render(
      <PlayerCardModal
        open
        entry={{ player: star, club, roleTag: 'LINEUP #1' }}
        isFavorite={false}
        onToggleFavorite={() => useGameStore.getState().toggleFavoritePlayer(star.id)}
        onCustomizePlayer={(patch) => useGameStore.getState().customizePlayerProfile(star.id, patch)}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('toggle-favorite-player-btn'));
    expect(useGameStore.getState().favoritePlayerIds).toContain(star.id);

    fireEvent.click(screen.getByTestId('edit-nickname-toggle'));
    fireEvent.change(screen.getByLabelText(/custom nickname/i), { target: { value: 'Starlight' } });
    fireEvent.click(screen.getByRole('button', { name: /save nickname/i }));
    expect(
      useGameStore.getState().getHumanClub()!.roster.find((p) => p.id === star.id)?.nickname,
    ).toBe('Starlight');

    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const summary = useGameStore.getState().playInstantExhibition(rival.id, 1994)!;
    render(
      <PostGameSummaryModal
        summary={summary}
        humanClub={useGameStore.getState().getHumanClub()!}
        opponentClub={rival}
        managerLevel={1}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('mvp-dugout-quote')).toBeInTheDocument();
  });

  it('plays a complete 5-pitch 30-second Arcade Home Run Derby and renders the Collectible Trophy & Sticker Album', () => {
    const club = useGameStore.getState().getHumanClub()!;
    render(<ArcadeDerbyModal open club={club} worldSeed={1994} onClose={vi.fn()} />);

    expect(screen.getByTestId('arcade-derby-modal')).toBeInTheDocument();
    const swingBtn = screen.getByTestId('derby-swing-btn');
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(swingBtn);
    }
    expect(screen.getByTestId('derby-final-card')).toBeInTheDocument();

    render(<TrophyCaseModal open onClose={vi.fn()} />);
    expect(screen.getByTestId('trophy-case-modal')).toBeInTheDocument();
    expect(screen.getAllByTestId('trophy-sticker-badge').length).toBeGreaterThanOrEqual(8);
  });

  it('offers 1-tap Smart Watch 3D start, Arcade Speed Toggle, and Playable Derby / Trophy buttons on GameDayScreen', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));

    expect(screen.getByTestId('start-smart-watch-btn')).toBeInTheDocument();
    expect(screen.getByTestId('open-arcade-derby-btn')).toBeInTheDocument();
    expect(screen.getByTestId('open-trophy-case-btn')).toBeInTheDocument();

    // Launch directly into Smart Watch 3D -> Smart Watch starts ON with 1x/2x/4x speed toggle visible in Arcade Mode!
    fireEvent.click(screen.getByTestId('start-smart-watch-btn'));
    expect(screen.getByTestId('smart-watch-toggle').textContent).toMatch(/smart on/i);
    const speedBtn = screen.getByTestId('arcade-speed-toggle');
    expect(speedBtn).toBeInTheDocument();
    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toMatch(/2x/i);
  });
});
