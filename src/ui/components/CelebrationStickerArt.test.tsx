import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { CelebrationStickerToast } from './CelebrationStickerToast';
import { TrophyCaseModal } from './TrophyCaseModal';

function seedClub() {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFC300',
    managerName: 'Coach Skip',
    seed: 1994,
  });
  return useGameStore.getState().getHumanClub()!;
}

describe('Celebration Sticker Die-Cut Artwork Wiring (TASK-101)', () => {
  beforeEach(() => {
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('renders die-cut WebP sticker artwork in CelebrationStickerToast and falls back gracefully to emoji on image error', () => {
    const club = seedClub();
    const unlock = {
      sticker: {
        id: 'first_strikeout' as const,
        emoji: '🔥',
        title: 'Filthy K!',
        detail: 'Fan your first rival batter on the diamond',
        accentBg: '#FFF3BF',
      },
      actorName: 'Jasper Hunter',
      headline: 'Jasper Hunter rung up a nasty strikeout!',
      mascotQuip: 'Rocket: "FILTHY K!!"',
    };

    const { unmount } = render(
      <CelebrationStickerToast
        unlock={unlock}
        club={club}
        stickerArtworkMap={{ first_strikeout: '/stickers/first_strikeout.webp' }}
        onDismiss={vi.fn()}
      />,
    );

    const img = screen.getByTestId('celebration-sticker-artwork') as HTMLImageElement;
    expect(img.src).toContain('/stickers/first_strikeout.webp');
    expect(img).toHaveAttribute('alt', 'Filthy K! sticker');

    // Image load failure falls back cleanly to emoji badge
    fireEvent.error(img);
    expect(screen.queryByTestId('celebration-sticker-artwork')).not.toBeInTheDocument();
    expect(screen.getByTestId('celebration-sticker-toast')).toHaveTextContent('🔥');
    unmount();

    // Without artwork, emoji renders cleanly by default
    render(<CelebrationStickerToast unlock={unlock} club={club} onDismiss={vi.fn()} />);
    expect(screen.queryByTestId('celebration-sticker-artwork')).not.toBeInTheDocument();
    expect(screen.getByTestId('celebration-sticker-toast')).toHaveTextContent('🔥 Filthy K!');
  });

  it('renders die-cut WebP sticker artwork only for unlocked stickers in TrophyCaseModal and falls back on error', () => {
    seedClub();
    useGameStore.getState().unlockCelebrationSticker('first_home_run');

    render(
      <TrophyCaseModal
        open
        onClose={vi.fn()}
        stickerArtworkMap={{
          first_home_run: '/stickers/first_home_run.webp',
          first_strikeout: '/stickers/first_strikeout.webp',
        }}
      />,
    );

    // Unlocked first_home_run renders crisp <img>; locked first_strikeout stays 🔒
    const imgs = screen.getAllByTestId('album-sticker-artwork') as HTMLImageElement[];
    expect(imgs).toHaveLength(1);
    expect(imgs[0].src).toContain('/stickers/first_home_run.webp');
    expect(imgs[0]).toHaveAttribute('alt', 'Sandlot Moonshot! sticker');

    // Error fallback switches unlocked card back to emoji badge cleanly
    fireEvent.error(imgs[0]);
    expect(screen.queryByTestId('album-sticker-artwork')).not.toBeInTheDocument();
    const hrCard = screen
      .getAllByTestId('live-moment-sticker')
      .find((el) => /sandlot moonshot/i.test(el.textContent ?? ''))!;
    expect(within(hrCard).getByText('💥')).toBeInTheDocument();
  });
});
