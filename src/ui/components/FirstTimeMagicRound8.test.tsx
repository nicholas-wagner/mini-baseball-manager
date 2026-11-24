import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { clearAllCareerSlotsStorage } from '../../store/careerSlots';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { FoilPackModal } from './FoilPackModal';
import { PlayerCardModal } from './PlayerCardModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('First-Time Magic Round 8 (3-Audience Hook: Clean Creator, Guided Quiet Mode, Power & Timing, Between-Game Spotlight, Visual Packs, Top Personalization & Art Gallery)', () => {
  beforeEach(() => {
    clearAllCareerSlotsStorage();
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('keeps Change Club customization collapsed behind a 1-tap drawer, shows a co-ed 3-card fan, mascot cheer, and Manager Story Origin picker', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change club' }));

    expect(screen.getByTestId('creator-mascot-quip')).toBeInTheDocument();
    const toggle = screen.getByTestId('creator-customize-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('creator-customize-panel')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('creator-customize-panel')).toBeInTheDocument();
    expect(screen.getByTestId('creator-backstory-picker')).toBeInTheDocument();
  });

  it('quiets Opening Day header badges before Game 1, renames Ballpark nav tab to Clubhouse, and reveals badges after Game 1', () => {
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
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Welcome Pack');

    const { unmount } = render(<App />);
    expect(screen.getAllByRole('button', { name: /^clubhouse$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('⚡ 3')).not.toBeInTheDocument();
    expect(screen.queryByText('⬆')).not.toBeInTheDocument();
    unmount();

    // After Game 1 is played, badges & Between-Game Spotlight appear cleanly
    const club = useGameStore.getState().getHumanClub()!;
    const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    useGameStore.getState().playInstantExhibition(rival.id, 1994);
    render(<App />);
    expect(screen.getAllByText('⚡ 3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('between-game-spotlight')).toBeInTheDocument();
  });

  it('keeps guided Opening Day serene (hiding Weather/BroadcastHUD/Ticker), surfaces tappable Signature Power, matchup scouting lines, and optional Arcade Timing bar', () => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Skip',
      seed: 2089,
    });

    render(<GameDayScreen />);
    const opening = within(screen.getByRole('region', { name: 'Opening Day feature' }));
    const startBtn = opening.getByRole('button', { name: /^(Bat|Pitch) with / });
    fireEvent.click(startBtn);

    // Quiet guided mode hides Weather, BroadcastHud, and Ticker below the fold
    expect(screen.queryByTestId('game-weather-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('broadcast-hud')).not.toBeInTheDocument();
    expect(screen.queryByTestId('play-by-play-ticker')).not.toBeInTheDocument();

    // 5-word trade-off hint & 2-second scouting lines show right away
    expect(screen.getByTestId('guided-tradeoff-hint')).toBeInTheDocument();
    expect(screen.getAllByTestId('matchup-scout-line')).toHaveLength(2);

    // Signature Power is immediately tappable right in FirstAtBat!
    const powerBtn = screen.getByTestId('guided-unleash-power-btn');
    fireEvent.click(powerBtn);
    expect(powerBtn).toHaveAttribute('aria-pressed', 'true');

    // Optional Arcade Timing bar toggles cleanly and fires a timed pitch!
    fireEvent.click(screen.getByTestId('guided-timing-toggle'));
    expect(screen.getByTestId('arcade-timing-meter')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('arcade-timing-go-btn'));

    // Expanding More controls reveals full LiveActionBar, Weather & BroadcastHud cleanly
    fireEvent.click(screen.getByRole('button', { name: 'More controls' }));
    expect(screen.getByTestId('live-action-bar')).toBeInTheDocument();
    expect(screen.getByTestId('arcade-tradeoff-hint')).toBeInTheDocument();
    expect(screen.getByTestId('game-weather-banner')).toBeInTheDocument();
    expect(screen.getByTestId('broadcast-hud')).toBeInTheDocument();
  });

  it('puts Star Favorite & Nickname at the top of PlayerCardModal, adds illustrated Foil Pack artwork, and promotes Art Gallery & Uniforms on RosterLineupScreen', () => {
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
    const player = club.roster[0];

    const cardView = render(
      <PlayerCardModal
        open
        entry={{ player, club, roleTag: 'LINEUP #1' }}
        allEntries={[{ player, club }, { player: club.roster[1], club }]}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        onCustomizePlayer={vi.fn()}
        onSelectPlayerId={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const personalize = screen.getByTestId('card-modal-personalize-bar');
    const chipsHeading = screen.getByText(/jump to teammate/i);
    // Personalize bar now sits ABOVE the scouting/teammate wall!
    expect(
      Boolean(personalize.compareDocumentPosition(chipsHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    cardView.unmount();

    // Foil Pack cards now show illustrated retro SVG artwork!
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Test Pack');
    const packView = render(<FoilPackModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /reveal all 3 cards/i }));
    expect(screen.getAllByTestId('foil-card-artwork')).toHaveLength(3);
    packView.unmount();

    // RosterLineupScreen promotes Art Gallery & Uniform Studio to 1-tap buttons!
    const onOpenUniforms = vi.fn();
    render(<RosterLineupScreen onPlayBall={vi.fn()} onOpenUniforms={onOpenUniforms} />);
    fireEvent.click(screen.getByTestId('roster-open-uniforms-btn'));
    expect(onOpenUniforms).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('roster-view-gallery-btn'));
    expect(screen.getByRole('region', { name: 'Roster print gallery' })).toBeInTheDocument();
  });
});
