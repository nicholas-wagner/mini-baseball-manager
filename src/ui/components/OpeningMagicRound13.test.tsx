import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { CelebrationStickerToast } from './CelebrationStickerToast';
import { TrophyCaseModal } from './TrophyCaseModal';

describe('TASK-088 — Opening Cover Side Switcher, One-Tap HR Derby Teaser & Celebration Stickers', () => {
  beforeEach(() => {
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('lets a first-time user flip Opening Day between Bat First and Pitch First with 1 tap on the Opening Cover', () => {
    const onCreated = vi.fn();
    render(<ClubCreatorScreen onCreated={onCreated} />);

    const opening = within(screen.getByRole('region', { name: 'Opening Day feature' }));
    const startBtn = opening.getByRole('button', { name: /^(Bat|Pitch) with / });
    const startedBatting = /^Bat with /.test(startBtn.textContent ?? '');

    const flipBtn = opening.getByTestId('opening-side-toggle');
    expect(flipBtn.textContent).toMatch(startedBatting ? /pitch first/i : /bat first/i);

    fireEvent.click(flipBtn);

    const flippedStart = opening.getByRole('button', { name: /^(Bat|Pitch) with / });
    expect(/^Bat with /.test(flippedStart.textContent ?? '')).toBe(!startedBatting);
    expect(opening.getByTestId('opening-side-toggle').textContent).toMatch(
      startedBatting ? /bat first/i : /pitch first/i,
    );

    // Launching uses the flipped half-inning!
    fireEvent.click(flippedStart);
    expect(onCreated).toHaveBeenCalledTimes(1);
    const launch = onCreated.mock.calls[0][0];
    const launchedBatting = (launch.session.half === 'BOT') === launch.session.home.isHuman;
    expect(launchedBatting).toBe(!startedBatting);
  });

  it('opens the 30-Second Home Run Derby straight from the Opening Cover without forcing career setup first', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);

    const derbyBtn = screen.getByTestId('opening-derby-btn');
    fireEvent.click(derbyBtn);

    expect(screen.getByTestId('arcade-derby-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close home run derby/i }));
    expect(screen.queryByTestId('arcade-derby-modal')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Opening Day feature' })).toBeInTheDocument();
  });

  it('renders the floating Celebration Sticker Pop-Up and reflects unlocked live stickers in TrophyCaseModal', () => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Skip',
      seed: 1994,
    });

    const newlyUnlocked = useGameStore.getState().unlockCelebrationSticker('first_strikeout');
    expect(newlyUnlocked).toBe(true);
    expect(useGameStore.getState().unlockCelebrationSticker('first_strikeout')).toBe(false);
    expect(useGameStore.getState().getHumanClub()?.earnedStickerIds).toContain('first_strikeout');

    const onOpenAlbum = vi.fn();
    const onDismiss = vi.fn();
    const club = useGameStore.getState().getHumanClub()!;
    render(
      <>
        <CelebrationStickerToast
          unlock={{
            sticker: {
              id: 'first_strikeout',
              emoji: '🔥',
              title: 'Filthy K!',
              detail: 'Fanned your first rival batter on the diamond!',
              accentBg: '#FFE5EC',
            },
            actorName: 'Jasper Hunter',
            headline: 'Jasper Hunter fanned the side!',
            mascotQuip: 'Rocket Dog: "FILTHY K!!"',
          }}
          club={club}
          onOpenAlbum={onOpenAlbum}
          onDismiss={onDismiss}
        />
        <TrophyCaseModal open onClose={vi.fn()} />
      </>,
    );

    const toast = screen.getByTestId('celebration-sticker-toast');
    expect(toast).toBeInTheDocument();
    expect(toast.textContent).toMatch(/filthy k!/i);
    fireEvent.click(within(toast).getByRole('button', { name: /album/i }));
    expect(onOpenAlbum).toHaveBeenCalledTimes(1);

    const albumStickers = screen.getAllByTestId('live-moment-sticker');
    expect(albumStickers).toHaveLength(6);
    expect(albumStickers.some((el) => /filthy k!/i.test(el.textContent ?? '') && /earned/i.test(el.textContent ?? ''))).toBe(true);
  });
});
