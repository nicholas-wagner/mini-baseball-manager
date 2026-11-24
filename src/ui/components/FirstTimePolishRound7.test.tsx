import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { clearAllCareerSlotsStorage } from '../../store/careerSlots';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { FoilPackModal } from './FoilPackModal';
import { PwaInstallBanner } from './PwaInstallBanner';
import { UniformDesignerPanel } from './UniformDesignerPanel';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('First-Time Hook Polish Round 7 (Clean Screen 0, Compact Sidebar & Quiet Offline, 2-Col Card Binder, Compact Uniform Hero & Foil Follow-Through)', () => {
  beforeEach(() => {
    clearAllCareerSlotsStorage();
    useGameStore.setState({ humanClubId: null, manager: null });
    useFoilPackStore.getState().resetPacks();
  });

  it('keeps Screen 0 clean before a club exists: hides club tabs & pre-club Foil Pack button while preserving Save Slots', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /^(Bat|Pitch) with / })).toBeInTheDocument();
    // Uninitialized club tabs and Foil Pack gift CTA must stay hidden until a club is founded
    expect(screen.queryByRole('button', { name: /^roster$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^league$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(ballpark|clubhouse)$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open 1994 foil packs/i })).not.toBeInTheDocument();
    // Returning players can still open 4 Save Slots from Screen 0
    expect(screen.getAllByRole('button', { name: /open 4 career save slots/i }).length).toBeGreaterThanOrEqual(1);
    // Mobile club preview stacks cleanly so "Sandlot Comets" is never crushed beside the fanned cards
    expect(screen.getByTestId('creator-club-identity').className).not.toContain('truncate');
  });

  it('uses a compact 2-column desktop sidebar utility grid once a club is created and keeps PwaInstallBanner quiet when merely offline', () => {
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

    const appView = render(<App />);
    const utilGrid = screen.getByTestId('desktop-utility-grid');
    expect(utilGrid.className).toContain('grid-cols-2');
    appView.unmount();

    // PwaInstallBanner should NOT burn top-of-screen height just because navigator.onLine is false
    const origOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => false,
    });
    try {
      render(<PwaInstallBanner />);
      expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
    } finally {
      if (origOnLine) {
        Object.defineProperty(Navigator.prototype, 'onLine', origOnLine);
      }
    }
  });

  it('turns Roster Cards into a clean 2-column mobile collector binder with quick favorite stars, hidden synergy box, and 1-tap full card modal', () => {
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

    render(<RosterLineupScreen onPlayBall={vi.fn()} />);
    expect(screen.getByTestId('coed-synergy-banner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('roster-view-cards-btn'));
    // Synergy box hides in Cards Binder mode so 4 manga cards show right away on phones
    expect(screen.queryByTestId('coed-synergy-banner')).not.toBeInTheDocument();

    const grid = screen.getByTestId('roster-binder-grid');
    expect(grid.className).toContain('grid-cols-2');

    // Quick star right on a binder card works
    const binderStars = screen.getAllByTestId('binder-star-btn');
    expect(binderStars.length).toBe(18);
    fireEvent.click(binderStars[0]);
    expect(useGameStore.getState().favoritePlayerIds).toHaveLength(1);

    // Tapping a binder card opens the full interactive PlayerCardModal
    const binderOpenBtns = screen.getAllByTestId('binder-card-open-btn');
    fireEvent.click(binderOpenBtns[0]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
  });

  it('places Uniform Studio crest, jersey, and live chibi batter in one compact side-by-side strip so presets stay above the fold', () => {
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
    const club = useGameStore.getState().getHumanClub()!;
    render(<UniformDesignerPanel club={club} onNotice={vi.fn()} />);

    const heroStrip = screen.getByTestId('uniform-hero-strip');
    expect(heroStrip.className).toContain('grid-cols-');
  });

  it('shows clear Back to Opening Day and View My Relics follow-through actions after ripping a Foil Pack, and ClubHubScreen supports initialSubTab="relics"', () => {
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
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Opening Day Welcome Gift!');
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Bonus Pack!');
    const onClose = vi.fn();
    const onBackToGame = vi.fn();
    const onViewRelics = vi.fn();

    const packView = render(
      <FoilPackModal
        open
        onClose={onClose}
        onBackToGame={onBackToGame}
        onViewRelics={onViewRelics}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /reveal all 3 cards/i }));
    expect(screen.getByTestId('foil-pack-next-actions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view my relics/i }));
    expect(onViewRelics).toHaveBeenCalledTimes(1);

    // Rip pack #2 and test "Back to Opening Day" CTA
    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /reveal all 3 cards/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to opening day/i }));
    expect(onBackToGame).toHaveBeenCalledTimes(1);
    packView.unmount();

    // ClubHubScreen deep-links directly into Relics & Chemistry when initialSubTab="relics"
    render(<ClubHubScreen initialSubTab="relics" />);
    expect(screen.getByRole('button', { name: /relics & chemistry/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText(/clubhouse chemistry:/i)).toBeInTheDocument();
  });
});
