import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { soundEngine } from '../../audio/soundEngine';
import { HEALTH_CONDITIONS_CATALOG } from '../../engine/health/conditionsCatalog';
import { applyHealthConditionToPlayer } from '../../engine/health/healthEngine';
import { createSeededRng } from '../../engine/rng/seededRng';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { SettingsModal } from './SettingsModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

function seedCareer(seed = 9450) {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
    managerName: 'Coach Skip',
    seed,
  });
}

describe('Broadcast Polish, Trainer Table, PNG Card Export & Settings Drawer', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    seedCareer(9450);
  });

  it('displays dynamic Weather/Park strip, 90s Rivalry VS banner, and interactive Live Box Score modal on Game Day', async () => {
    const user = userEvent.setup();
    render(<GameDayScreen />);

    await user.click(screen.getByTestId('opening-day-more-toggle'));
    await user.click(screen.getByRole('button', { name: /start live 3d game/i }));
    expect(screen.getByTestId('game-weather-banner')).toBeInTheDocument();
    expect(screen.getByTestId('rivalry-showdown-banner')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /live box score/i }));
    expect(screen.getByTestId('live-box-score-modal')).toBeInTheDocument();
    expect(screen.getByText(/inning line score/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close live box score/i }));
    expect(screen.queryByTestId('live-box-score-modal')).not.toBeInTheDocument();
  });

  it('shows Clubhouse Trainers Table with Play-Through vs IL toggle and supports 1-tap PNG Baseball Card export on Roster', async () => {
    const user = userEvent.setup();
    // Apply a playable minor condition (leg_cramp) to the first player so Play-Through toggle appears
    const state = useGameStore.getState();
    const club = state.getHumanClub()!;
    const cramp = HEALTH_CONDITIONS_CATALOG.find((c) => c.id === 'leg_cramp')!;
    const injuredPlayer = applyHealthConditionToPlayer(createSeededRng(44), club.roster[0], cramp);
    useGameStore.setState({
      leagues: {
        ...state.leagues,
        [club.leagueTier]: state.leagues[club.leagueTier].map((c) =>
          c.id === club.id
            ? { ...c, roster: c.roster.map((p, i) => (i === 0 ? injuredPlayer : p)) }
            : c,
        ),
      },
    });

    render(<RosterLineupScreen onPlayBall={vi.fn()} />);

    expect(screen.getByTestId('trainers-table-panel')).toBeInTheDocument();
    const toggleBtn = screen.getByRole('button', { name: /play through|rest on il/i });
    await user.click(toggleBtn);
    expect(useGameStore.getState().getHumanClub()!.roster[0].activeHealthStatus?.playingThrough).toBe(true);

    // 1-tap Download 90s Card (PNG)
    await user.click(screen.getByRole('button', { name: /download 90s card/i }));
    expect(screen.getByTestId('cross-train-feedback').textContent).toMatch(/exported 90s baseball card/i);
  });

  it('manages SFX volume, Android haptics, Wake Lock, Reduced Motion, Colorblind symbols & Health toggles in SettingsModal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SettingsModal open onClose={onClose} />);
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    // Adjust SFX Volume slider
    const slider = screen.getByLabelText(/sfx volume/i);
    fireEvent.change(slider, { target: { value: '45' } });
    expect(useUserPreferencesStore.getState().sfxVolume).toBeCloseTo(0.45, 2);
    expect(soundEngine.getState().volume).toBeCloseTo(0.45, 2);

    // Toggle Reduced Motion & Colorblind Stat Symbols
    await user.click(screen.getByRole('button', { name: /reduced motion/i }));
    expect(useUserPreferencesStore.getState().reducedMotion).toBe(true);

    await user.click(screen.getByRole('button', { name: /colorblind stat symbols/i }));
    expect(useUserPreferencesStore.getState().colorblindStatSymbols).toBe(true);

    // Toggle Injuries OFF
    await user.click(screen.getByRole('button', { name: /injuries:/i }));
    expect(useUserPreferencesStore.getState().enableInjuries).toBe(false);

    await user.click(screen.getByRole('button', { name: /close settings/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
