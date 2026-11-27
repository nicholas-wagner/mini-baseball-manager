import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { SettingsModal } from './SettingsModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('3-Mode Pitching Controls (Simple Catcher+Shake-Off / Normal Location / Advanced Location+Pitch)', () => {
  beforeEach(() => {
    window.localStorage?.clear?.();
    useUserPreferencesStore.getState().resetDefaults();
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

  it('defaults pitchingMode to simple in userPreferences and switches cleanly in SettingsModal', () => {
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('simple');

    render(<SettingsModal open onClose={vi.fn()} />);
    const picker = screen.getByTestId('settings-pitching-mode');
    expect(within(picker).getByRole('button', { name: /simple/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(picker).getByRole('button', { name: /normal/i }));
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('normal');

    fireEvent.click(within(picker).getByRole('button', { name: /advanced/i }));
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('advanced');

    fireEvent.click(within(picker).getByRole('button', { name: /simple/i }));
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('simple');
  });

  it('defaults Opening Day guided pitching to Simple mode with Catcher Call + Shake Off and switches cleanly to Normal/Advanced', () => {
    // Seed 1994 starts with Jasper pitching on Opening Day
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^Pitch with / }));

    const guide = within(screen.getByRole('region', { name: 'First at-bat' }));
    const catcherCall = guide.getByTestId('guided-catcher-call');
    const firstSignText = catcherCall.textContent ?? '';
    expect(firstSignText).toMatch(/catcher/i);
    expect(guide.getByRole('button', { name: /throw · 1-pitch|throw pitch/i })).toBeVisible();
    // Simple mode hides manual location & pitch buttons
    expect(guide.queryByRole('button', { name: /over plate/i })).toBeNull();
    expect(guide.queryByRole('button', { name: /low chase/i })).toBeNull();

    // Tapping Shake off cycles to a different Catcher Call!
    const shakeBtn = guide.getByTestId('guided-shake-off-btn');
    fireEvent.click(shakeBtn);
    expect(guide.getByTestId('guided-catcher-call').textContent).not.toBe(firstSignText);

    // Switch to Normal inside Opening Day Options -> exactly 3 location buttons (no High Heat!)
    fireEvent.click(guide.getByTestId('guided-pitching-mode-normal'));
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('normal');
    expect(guide.getByRole('button', { name: /over plate/i })).toBeVisible();
    expect(guide.getByRole('button', { name: /corner/i })).toBeVisible();
    expect(guide.getByRole('button', { name: /low chase/i })).toBeVisible();
    expect(guide.queryByRole('button', { name: /heat/i })).toBeNull();
    expect(guide.queryByTestId('guided-pitch-sign-bar')).toBeNull();

    // Switch to Advanced -> adds pitch arsenal strip alongside the 3 locations
    fireEvent.click(guide.getByTestId('guided-pitching-mode-advanced'));
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('advanced');
    expect(guide.getByTestId('guided-pitch-sign-bar')).toBeVisible();
  });

  it('renders clean Simple, Normal, and Advanced pitching modes inside full Live 3D Game Day', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Home pitches TOP 1 -> starts in Simple mode (Catcher Call + Shake off, no location or pitch buttons!)
    const catcherBar = screen.getByTestId('arcade-catcher-call');
    const initialCall = catcherBar.textContent ?? '';
    expect(initialCall).toMatch(/catcher/i);
    expect(screen.queryByTestId('arcade-call-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arcade-pitch-sign-bar')).not.toBeInTheDocument();

    // Shake off updates the displayed call
    fireEvent.click(screen.getByTestId('arcade-shake-off-btn'));
    expect(screen.getByTestId('arcade-catcher-call').textContent).not.toBe(initialCall);

    // Throw pitch executes cleanly and reveals radar readout
    fireEvent.click(screen.getByTestId('live-primary-pitch-btn'));
    expect(screen.getByTestId('live-pitch-radar-pill')).toHaveTextContent(/mph/i);

    // Switch to Normal -> 3 location buttons only (Over Plate / Corner / Low Chase), no High Heat, no pitch strip!
    const modeBar = screen.getByTestId('pitching-mode-switcher');
    fireEvent.click(within(modeBar).getByRole('button', { name: /normal/i }));
    const callBar = screen.getByTestId('arcade-call-bar');
    expect(within(callBar).getAllByRole('button')).toHaveLength(3);
    expect(within(callBar).getByRole('button', { name: /over plate/i })).toBeInTheDocument();
    expect(within(callBar).getByRole('button', { name: /corner/i })).toBeInTheDocument();
    expect(within(callBar).getByRole('button', { name: /low chase/i })).toBeInTheDocument();
    expect(within(callBar).queryByRole('button', { name: /heat/i })).toBeNull();
    expect(screen.queryByTestId('arcade-pitch-sign-bar')).not.toBeInTheDocument();

    // Switch to Advanced -> 3 location buttons + pitcher arsenal pitch strip!
    fireEvent.click(within(modeBar).getByRole('button', { name: /adv/i }));
    expect(screen.getByTestId('arcade-call-bar')).toBeInTheDocument();
    const signBar = screen.getByTestId('arcade-pitch-sign-bar');
    expect(signBar).toBeInTheDocument();
    expect(within(signBar).getAllByRole('button').length).toBeGreaterThanOrEqual(3); // Auto + 2..5 pitches

    // Pitching mode remains independent of Pro Manager dugout mode
    fireEvent.click(within(modeBar).getByRole('button', { name: /simple/i }));
    fireEvent.click(screen.getByTestId('control-mode-toggle'));
    expect(useUserPreferencesStore.getState().gameDayControlMode).toBe('advanced');
    expect(useUserPreferencesStore.getState().pitchingMode).toBe('simple');
    expect(screen.getByTestId('dugout-chess-card')).toBeInTheDocument();
    expect(screen.queryByTestId('pitch-selector-bar')).not.toBeInTheDocument();
  });
});
