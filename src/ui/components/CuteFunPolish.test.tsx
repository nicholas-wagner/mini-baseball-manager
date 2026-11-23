import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runHumanPracticeActivity } from '../../store/clubHubActions';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { App } from '../../App';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';

describe('Cute, Clean & Balanced Gameplay Polish (Drill Quota, Portraits, 4-Room HQ, Mobile Menu, Camera & Smart Watch)', () => {
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

  it('caps individual training drills to 2 per game/series across Roster Lab & Practice Complex and refreshes after a series', () => {
    const club = useGameStore.getState().getHumanClub()!;
    const hitter = club.roster.find((p) => p.position !== 'SP' && p.position !== 'RP')!;

    expect(useGameStore.getState().individualDrillsRemaining).toBe(2);

    // 1st drill (Roster Compromise Drill) succeeds -> 1 left
    const d1 = useGameStore.getState().runCompromiseTrainingDrill(hitter.id, {
      drillId: 'power_launch_cage',
    });
    expect(d1.trained).toBe(true);
    expect(useGameStore.getState().individualDrillsRemaining).toBe(1);

    // 2nd drill (Ballpark HQ Practice Complex) succeeds -> 0 left
    const d2 = runHumanPracticeActivity(hitter.id, { activityId: 'slump_buster_film' });
    expect(d2.trained).toBe(true);
    expect(useGameStore.getState().individualDrillsRemaining).toBe(0);

    // 3rd attempt BEFORE playing/simming is blocked (closes infinite grind exploit!)
    const blocked1 = useGameStore.getState().runCompromiseTrainingDrill(hitter.id, {
      drillId: 'contact_choke_up',
    });
    expect(blocked1.trained).toBe(false);
    expect(blocked1.reason).toMatch(/play or sim/i);

    const blocked2 = runHumanPracticeActivity(hitter.id, { activityId: 'slump_buster_film' });
    expect(blocked2.trained).toBe(false);

    // Simming next series refreshes individual drill quota back to 2!
    useGameStore.getState().simNextSeriesRound(5);
    expect(useGameStore.getState().individualDrillsRemaining).toBe(2);
  });

  it('offers 4 cute 1-tap Sandlot starter clubs on ClubCreatorScreen', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);
    expect(screen.getByTestId('quick-club-presets')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /harbor otters/i }));
    expect(screen.getByLabelText(/club city/i)).toHaveValue('Harbor');
    expect(screen.getByLabelText(/club name/i)).toHaveValue('Otters');
  });

  it('renders cute manga portraits & Coach Pops charm on GameDay & SkillTree, plus 3D camera switcher and Smart Watch toggle', () => {
    const { unmount } = render(<GameDayScreen />);
    expect(screen.getByTestId('matchup-faceoff-portraits')).toBeInTheDocument();
    expect(screen.getByTestId('coach-pops-avatar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    expect(screen.getByTestId('camera-angle-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('smart-watch-toggle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /batter cam/i }));
    unmount();

    render(<SkillTreeScreen />);
    expect(screen.getByTestId('skill-tree-player-portrait')).toBeInTheDocument();
  });

  it('streamlines Ballpark HQ into 4 clean rooms (removing duplicate Manager RPG) and adds a clean mobile menu drawer in App', () => {
    const { unmount } = render(<ClubHubScreen />);
    expect(screen.getByTestId('hub-room-tabs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manager rpg/i })).not.toBeInTheDocument();
    unmount();

    render(<App />);
    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    expect(screen.getByTestId('mobile-clubhouse-menu')).toBeInTheDocument();
  });
});
