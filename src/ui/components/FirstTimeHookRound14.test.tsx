import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FAIR_TICKET_PRICE_BY_TIER } from '../../engine/economy/attendance';
import { clearAllCareerSlotsStorage } from '../../store/careerSlots';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { HobbyConversation } from './OffTheClock';
import { SettingsModal } from './SettingsModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

function startTestClub(seed = 2089) {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFC300',
    managerName: 'Coach Skip',
    seed,
  });
}

describe('First-Time Hook Round 14 (3-Audience Polish & 3-Mode Front Office — TASK-094)', () => {
  beforeEach(() => {
    clearAllCareerSlotsStorage();
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('(10yo) puts 🎯 Timing directly in Guided FirstAtBat header and tucks Smart Watch rules into a collapsible drawer', () => {
    startTestClub(2089);
    render(<GameDayScreen />);

    const opening = within(screen.getByRole('region', { name: 'Opening Day feature' }));
    fireEvent.click(opening.getByRole('button', { name: /^(Bat|Pitch) with / }));

    // Timing pill is directly inside header (NOT hidden inside Options <details>!)
    const timingBtn = screen.getByTestId('guided-timing-toggle');
    expect(timingBtn.closest('details')).toBeNull();
    fireEvent.click(timingBtn);
    expect(screen.getByTestId('arcade-timing-meter')).toBeInTheDocument();

    // Expand to full LiveActionBar: Smart Watch rules sit in a compact closed <details> until opened or active
    fireEvent.click(screen.getByRole('button', { name: 'More controls' }));
    const watchSelect = screen.getByLabelText('Pause Smart Watch');
    const watchDrawer = watchSelect.closest('details');
    expect(watchDrawer).not.toBeNull();
    expect(watchDrawer?.open).toBe(false);
  });

  it('(14yo) promotes Off the Clock teammate card immediately visible without collapsed <details>, adds live tappable mascot, and wires Favorite & Uniform spotlights', () => {
    startTestClub(1994);
    const club = useGameStore.getState().getHumanClub()!;
    const afterG1 = {
      ...club,
      wins: 1,
      roster: club.roster.map((p) => ({ ...p, skillPoints: 0 })),
    };
    useGameStore.setState({
      leagues: {
        ...useGameStore.getState().leagues,
        rookie: useGameStore
          .getState()
          .leagues.rookie.map((c) => (c.id === club.id ? afterG1 : c)),
      },
      manager: { ...useGameStore.getState().manager!, skillPoints: 0 },
    });

    // 1. Off the Clock is immediately open with portrait + clue + Ask about the clue CTA (no collapsed <details>)
    const hobbyView = render(<HobbyConversation />);
    const region = screen.getByRole('region', { name: 'Off the Clock' });
    const askBtn = within(region).getByRole('button', { name: 'Ask about the clue' });
    expect(askBtn.closest('details')).toBeNull();
    expect(within(region).getByTestId('off-the-clock-portrait')).toBeInTheDocument();
    hobbyView.unmount();

    // 2. Between-Game Spotlight leads with ⭐ Star a Favorite -> opens PlayerCardModal; then 🎨 Style Uniforms!
    const onOpenUniforms = vi.fn();
    const gameView = render(<GameDayScreen onOpenUniforms={onOpenUniforms} />);
    const spotlight = screen.getByTestId('between-game-spotlight');
    expect(within(spotlight).getByText(/star your clubhouse favorite/i)).toBeInTheDocument();
    fireEvent.click(within(spotlight).getByRole('button', { name: /star a favorite/i }));
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // After starring a favorite, next spotlight invites Uniform Studio!
    act(() => {
      useGameStore.getState().toggleFavoritePlayer(afterG1.roster[0].id);
    });
    expect(within(screen.getByTestId('between-game-spotlight')).getByText(/design your team jerseys/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /style uniforms/i }));
    expect(onOpenUniforms).toHaveBeenCalledTimes(1);

    // 3. Inside Live 3D Game, tappable Dugout Mascot pops a cheer bubble!
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    const mascotBtn = screen.getByTestId('live-dugout-mascot-btn');
    fireEvent.click(mascotBtn);
    expect(screen.getByTestId('live-mascot-cheer-bubble')).toBeInTheDocument();
    gameView.unmount();
  });

  it('(18-99 fan) displays Due Up handedness + reliever pitch mix in Quick Bullpen Drawer & Pro Bullpen Phone, plus 3-mode Front Office Assistant GM across Settings, Hub & Roster', () => {
    startTestClub(2089);

    // 1. Live Game Quick Bullpen Drawer + Pro Bullpen Phone show Due Up: R · L · ... and reliever Pitch Mix
    const gdView = render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    fireEvent.click(screen.getByTestId('arcade-bullpen-toggle'));

    const drawer = screen.getByTestId('arcade-bullpen-drawer');
    expect(within(drawer).getByTestId('bullpen-due-up-strip')).toHaveTextContent(/due up:/i);
    expect(within(drawer).getAllByTestId('bullpen-pitch-mix').length).toBeGreaterThan(0);

    // Switch to Pro mode -> Pro BULLPEN PHONE also shows Due Up strip and pitch mix
    fireEvent.click(screen.getByTestId('control-mode-toggle'));
    expect(screen.getByTestId('pro-bullpen-due-up-strip')).toHaveTextContent(/due up:/i);
    gdView.unmount();

    // 2. SettingsModal exposes 3-mode Front Office switcher and persists selection
    const settingsView = render(<SettingsModal open onClose={vi.fn()} />);
    const foSection = screen.getByTestId('settings-front-office-mode');
    expect(within(foSection).getByRole('button', { name: /auto \(assistant gm\)/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(foSection).getByRole('button', { name: /ask me \(checklist\)/i }));
    expect(useUserPreferencesStore.getState().frontOfficeMode).toBe('semi_auto');
    settingsView.unmount();

    // 3. RosterLineupScreen & ClubHubScreen show Assistant GM switcher & 1-tap apply in Ask Me mode
    const club = useGameStore.getState().getHumanClub()!;
    useGameStore.setState({
      leagues: {
        ...useGameStore.getState().leagues,
        rookie: useGameStore.getState().leagues.rookie.map((c) =>
          c.id === club.id ? { ...c, economy: { ...c.economy, ticketPrice: 28 } } : c,
        ),
      },
    });

    const rosterView = render(<RosterLineupScreen onPlayBall={vi.fn()} />);
    const foBar = screen.getByTestId('front-office-mode-bar');
    expect(foBar).toBeInTheDocument();
    fireEvent.click(within(foBar).getByTestId('front-office-apply-btn'));
    expect(useGameStore.getState().getHumanClub()!.economy.ticketPrice).toBe(
      FAIR_TICKET_PRICE_BY_TIER.rookie,
    );
    rosterView.unmount();

    const hubView = render(<ClubHubScreen initialSubTab="staff" />);
    expect(screen.getByTestId('front-office-mode-bar')).toBeInTheDocument();
    hubView.unmount();
  });
});
