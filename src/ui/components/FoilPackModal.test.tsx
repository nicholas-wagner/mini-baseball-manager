import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRelicArtworkUrl } from '../../art/relics/relicPrint';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { FoilPackModal } from './FoilPackModal';

describe('FoilPackModal (TASK-100 Tactile 1994 Foil Pack Upgrade)', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
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
  });

  it('renders newly ripped cards ABOVE the No Unopened Foil Packs message when ripping your last pack', () => {
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Opening Day Victory!');
    render(<FoilPackModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));

    const pullsSection = screen.getByTestId('foil-pack-pulls-section');
    const emptyState = screen.getByTestId('foil-pack-empty-state');
    expect(emptyState).toHaveTextContent(/no unopened foil packs/i);

    // Prize cards MUST appear BEFORE the empty-packs message in DOM order!
    expect(
      Boolean(pullsSection.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it('pins Reveal All in a thumb-friendly bottom bar and upgrades Tap to Peel with corner-peel 3D flip respecting reducedMotion', () => {
    useFoilPackStore.getState().awardPack('rivalry_chrome', 'Series Win!');
    const { rerender } = render(<FoilPackModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));

    const thumbBar = screen.getByTestId('foil-pack-thumb-bar');
    const revealAllBtn = screen.getByRole('button', { name: /reveal all 3 cards/i });
    expect(thumbBar).toContainElement(revealAllBtn);

    const cards = screen.getAllByTestId('foil-pack-card');
    expect(cards[0]).toHaveAttribute('data-peel-state', 'revealed');
    expect(cards[1]).toHaveAttribute('data-peel-state', 'sealed');
    expect(cards[2]).toHaveAttribute('data-peel-state', 'sealed');
    expect(screen.getAllByTestId('foil-corner-peel')).toHaveLength(2);
    expect(screen.getByTestId('foil-pack-modal')).toHaveAttribute('data-reduced-motion', 'false');

    // Enabling reducedMotion disables shimmer/3D animation cleanly
    useUserPreferencesStore.getState().toggleReducedMotion();
    rerender(<FoilPackModal open onClose={vi.fn()} />);
    expect(screen.getByTestId('foil-pack-modal')).toHaveAttribute('data-reduced-motion', 'true');

    // Peeling card #2 flips it to revealed
    fireEvent.click(cards[1]);
    expect(screen.getAllByTestId('foil-pack-card')[1]).toHaveAttribute('data-peel-state', 'revealed');
  });

  it('supports optional relic artwork lookup hook with safe ID validation and graceful SVG fallback', () => {
    expect(getRelicArtworkUrl('../secret')).toBeUndefined();
    expect(getRelicArtworkUrl('golden_ash_bat', { golden_ash_bat: '/prints/golden_ash_bat.webp' })).toBe(
      '/prints/golden_ash_bat.webp',
    );

    useFoilPackStore.getState().awardPack('sandlot_foil', 'Relic Lookup Check');
    const relicId = useFoilPackStore.getState().ripNextPack()!.pack.cards[0].relicId!;

    render(
      <FoilPackModal
        open
        onClose={vi.fn()}
        relicArtworkMap={{ [relicId]: '/relic-prints/test-relic.webp' }}
      />,
    );

    const artImg = screen.getByTestId('foil-relic-artwork-img') as HTMLImageElement;
    expect(artImg.src).toContain('/relic-prints/test-relic.webp');

    // If the WebP fails to load, it falls back gracefully to the enhanced SVG badge
    fireEvent.error(artImg);
    expect(screen.queryByTestId('foil-relic-artwork-img')).not.toBeInTheDocument();
    expect(screen.getByTestId('foil-card-artwork').querySelector('svg')).toBeInTheDocument();
  });

  it('shows In-Modal 1994 Card Shop, Relic Collection & Legendary Pity Meter, Gum Trivia, and lets player buy & assign cards', () => {
    render(<FoilPackModal open onClose={vi.fn()} />);

    expect(screen.getByTestId('foil-pack-pity-strip')).toHaveTextContent(/Relic Collection/i);
    expect(screen.getByTestId('foil-pack-pity-strip')).toHaveTextContent(/Legendary Pity Meter/i);
    expect(screen.getByTestId('foil-pack-card-shop')).toBeInTheDocument();

    // Buy a Sandlot Foil pack right inside the modal shop, then rip it open
    fireEvent.click(screen.getByRole('button', { name: /buy \$1,200/i }));
    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));
    expect(screen.getByTestId('foil-pack-gum-trivia')).toHaveTextContent(/1994 Gum Fact/i);

    // Card #1 Relic gives player agency to equip onto a compatible player right inside the modal!
    fireEvent.click(screen.getByRole('button', { name: /equip now/i }));
    expect(screen.getByTestId('foil-pack-pulls-section')).toHaveTextContent(/equipped/i);
  });
});
