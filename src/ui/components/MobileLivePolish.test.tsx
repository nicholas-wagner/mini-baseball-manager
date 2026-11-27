import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClub } from '../../engine/gm/rosterFactory';
import { createSeededRng } from '../../engine/rng/seededRng';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import type { StealOptionPreview } from '../../engine/simulation/baserunning';
import type { LiveActionCue } from '../../engine/simulation/liveActionAdvisor';
import { clearAllCareerSlotsStorage } from '../../store/careerSlots';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { FirstAtBat } from './FirstAtBat';
import { LiveActionBar } from './LiveActionBar';
import { SettingsModal } from './SettingsModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

const BASE_CUE: LiveActionCue = {
  kind: 'default_batting',
  urgency: 'calm',
  turnLabel: 'BOT 1 • BATTING',
  badgeText: 'READY',
  headline: 'Pick an approach or tap Swing.',
  primaryButtonLabel: 'Next Pitch',
  suggestedAction: null,
};

const STEAL_2B: StealOptionPreview = {
  playType: 'steal_2b',
  label: 'Steal 2B',
  runnerId: 'runner-1',
  runnerName: 'Dash Rivera',
  runnerSpeed: 88,
  successProbability: 0.78,
  successPct: 78,
  riskTier: 'green',
};

const STEAL_HOME: StealOptionPreview = {
  playType: 'steal_home',
  label: 'Steal Home',
  runnerId: 'runner-3',
  runnerName: 'Mina Sato',
  runnerSpeed: 84,
  successProbability: 0.24,
  successPct: 24,
  riskTier: 'red',
};

function makeSession(strikes = 0) {
  const away = createClub(createSeededRng(1091), {
    id: 'away-109',
    isHuman: false,
    city: 'East',
    name: 'Foxes',
    mascot: 'Fox',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'EF' },
    leagueTier: 'aa',
  });
  const home = createClub(createSeededRng(1092), {
    id: 'home-109',
    isHuman: true,
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#1D63B8', secondary: '#0F2B46', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'aa',
  });
  const session = createGameSession(away, home, 1093, 'regular', 5);
  return {
    ...session,
    half: 'BOT' as const,
    strikes,
    bases: [home.lineup[1].playerId, null, null] as [string, null, null],
  };
}

function seedCareer(seed = 2089) {
  clearAllCareerSlotsStorage();
  useUserPreferencesStore.getState().resetDefaults();
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

describe('Mobile Live Polish, 1-Tap Steal UX, Auto-Dismiss Tactics Sheet & 2-Strike Protection', () => {
  beforeEach(() => {
    seedCareer();
  });

  it('surfaces 1-tap Steal chips on Guided FirstAtBat main dock (including multi-option & 2-strike Steal & Swing)', () => {
    const onToggleStealPlay = vi.fn();
    const { rerender } = render(
      <FirstAtBat
        session={makeSession(0)}
        batting
        target="attack_zone"
        call="power"
        locked={false}
        expanded={false}
        powerArmed={false}
        stealOptions={[STEAL_2B, STEAL_HOME]}
        armedStealPlay={null}
        onToggleStealPlay={onToggleStealPlay}
        cue={BASE_CUE}
        onTarget={vi.fn()}
        onSwing={vi.fn()}
        onPitch={vi.fn()}
        onExpand={vi.fn()}
        onSuggested={vi.fn()}
      />,
    );

    const steal2b = screen.getByTestId('guided-steal-btn');
    // Must sit directly on the main dock, NOT trapped inside <details> Options!
    expect(steal2b.closest('details')).toBeNull();
    expect(steal2b).toHaveTextContent(/Steal 2B \(78%\)/i);
    expect(screen.getByTestId('guided-steal-option-steal_home')).toHaveTextContent(/Steal Home \(24%\)/i);

    fireEvent.click(steal2b);
    expect(onToggleStealPlay).toHaveBeenCalledWith('steal_2b');

    // Armed on <2 strikes keeps batting approach ('power') pressed and labels CTA "Send Runner"
    rerender(
      <FirstAtBat
        session={makeSession(1)}
        batting
        target="attack_zone"
        call="power"
        locked={false}
        expanded={false}
        powerArmed={false}
        stealOptions={[STEAL_2B]}
        armedStealPlay="steal_2b"
        onToggleStealPlay={onToggleStealPlay}
        cue={BASE_CUE}
        onTarget={vi.fn()}
        onSwing={vi.fn()}
        onPitch={vi.fn()}
        onExpand={vi.fn()}
        onSuggested={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Power' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Send Runner' })).toBeVisible();

    // Armed with 2 strikes shows "💨 Steal + Swing (2K)" chip and "Steal & Swing (2K)" primary CTA!
    rerender(
      <FirstAtBat
        session={makeSession(2)}
        batting
        target="attack_zone"
        call="contact"
        locked={false}
        expanded={false}
        powerArmed={false}
        stealOptions={[STEAL_2B]}
        armedStealPlay="steal_2b"
        onToggleStealPlay={onToggleStealPlay}
        cue={BASE_CUE}
        onTarget={vi.fn()}
        onSwing={vi.fn()}
        onPitch={vi.fn()}
        onExpand={vi.fn()}
        onSuggested={vi.fn()}
      />,
    );
    expect(screen.getByTestId('guided-steal-btn')).toHaveTextContent(/Steal \+ Swing \(2K\)/i);
    expect(screen.getByRole('button', { name: 'Steal & Swing (2K)' })).toBeVisible();
  });

  it('surfaces 1-tap Steal on Full Live mobile dock alongside Ready Power, supports 2K Steal & Swing, and offers Hit & Run in Tactics', () => {
    const onToggleStealPlay = vi.fn();
    const onToggleHitAndRun = vi.fn();
    const baseProps = {
      cue: BASE_CUE,
      matchupLabel: 'Dash vs Ace',
      basesLabel: 'Bases: 1B · 3B',
      latestEvent: null,
      controlMode: 'simple' as const,
      watchMode: 'paused' as const,
      tacticalCall: 'power' as const,
      isBatting: true,
      gameCompleted: false,
      readyPowerLabel: 'Eagle Soar',
      onArmReadyPower: vi.fn(),
      stealOptions: [STEAL_2B, STEAL_HOME],
      armedStealPlay: null as 'steal_2b' | null,
      onToggleStealPlay,
      hitAndRunArmed: false,
      onToggleHitAndRun,
      strikes: 0,
      onNextPitch: vi.fn(),
      onToggleWatchMode: vi.fn(),
      onSimAtBat: vi.fn(),
      onSimHalfInning: vi.fn(),
      onClutchSim: vi.fn(),
      onSimToEnd: vi.fn(),
      onSelectTacticalCall: vi.fn(),
      onSuggestedAction: vi.fn(),
      onToggleControlMode: vi.fn(),
    };

    const { rerender } = render(<LiveActionBar {...baseProps} density="dock" />);

    // Both 1-tap Steal AND Ready Power are visible on the mobile dock!
    expect(screen.getByTestId('arcade-steal-btn')).toHaveTextContent(/Steal 2B \(78%\)/i);
    expect(screen.getByTestId('arcade-steal-option-steal_home')).toHaveTextContent(/Steal Home \(24%\)/i);
    expect(screen.getByTestId('arcade-unleash-power-btn')).toBeVisible();

    fireEvent.click(screen.getByTestId('arcade-steal-btn'));
    expect(onToggleStealPlay).toHaveBeenCalledWith('steal_2b');

    // Armed steal on 2 strikes -> "💨 Steal + Swing (2K)" chip & "Steal & Swing (2K)" primary CTA while Power stays pressed
    rerender(<LiveActionBar {...baseProps} density="dock" armedStealPlay="steal_2b" strikes={2} />);
    expect(screen.getByTestId('arcade-steal-btn')).toHaveTextContent(/Steal \+ Swing \(2K\)/i);
    expect(screen.getByTestId('live-primary-pitch-btn')).toHaveTextContent(/Steal & Swing \(2K\)/i);
    expect(screen.getByRole('button', { name: /Swing Big/i })).toHaveAttribute('aria-pressed', 'true');

    // Sheet/Tactics exposes Hit & Run toggle on <2 strikes and updates primary CTA
    rerender(
      <LiveActionBar
        {...baseProps}
        density="sheet"
        armedStealPlay="steal_2b"
        strikes={1}
        hitAndRunArmed={false}
      />,
    );
    expect(screen.getByTestId('live-primary-pitch-btn')).toHaveTextContent('Send Runner');
    const hnrBtn = screen.getByTestId('arcade-hit-and-run-toggle');
    fireEvent.click(hnrBtn);
    expect(onToggleHitAndRun).toHaveBeenCalledTimes(1);

    rerender(
      <LiveActionBar
        {...baseProps}
        density="sheet"
        armedStealPlay="steal_2b"
        strikes={1}
        hitAndRunArmed
      />,
    );
    expect(screen.getByTestId('live-primary-pitch-btn')).toHaveTextContent('Hit & Run');
  });

  it('auto-dismisses mobile LiveBottomSheet immediately when triggering a pitch or sim from inside Tactics', () => {
    const origMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    try {
      render(<GameDayScreen />);
      fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
      fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

      // Open the mobile Tactics bottom sheet
      fireEvent.click(screen.getByRole('button', { name: /^Tactics$/i }));
      const sheet = screen.getByTestId('tactics-sheet');
      expect(sheet).toBeVisible();

      // Trigger Throw Pitch / Swing from inside the sheet -> sheet immediately auto-dismisses!
      fireEvent.click(within(sheet).getByTestId('live-primary-pitch-btn'));
      expect(screen.queryByTestId('tactics-sheet')).toBeNull();

      // Re-open Tactics and trigger Sim At-Bat -> sheet also immediately auto-dismisses!
      fireEvent.click(screen.getByRole('button', { name: /^Tactics$/i }));
      const sheetAgain = screen.getByTestId('tactics-sheet');
      fireEvent.click(within(sheetAgain).getByTestId('fast-sim-toggle'));
      fireEvent.click(within(sheetAgain).getByRole('button', { name: /sim at-bat/i }));
      expect(screen.queryByTestId('tactics-sheet')).toBeNull();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: origMatchMedia,
      });
    }
  });

  it('exposes 1-Pitch At-Bat Mode toggles in Guided Options, LiveActionBar Tactics, and SettingsModal with primary button cues and deciding-pitch resolution (TASK-111)', () => {
    // 1. SettingsModal toggle persists onePitchMode
    const settingsView = render(<SettingsModal open onClose={vi.fn()} />);
    const settingsToggle = screen.getByTestId('settings-one-pitch-toggle');
    expect(settingsToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(settingsToggle);
    expect(useUserPreferencesStore.getState().onePitchMode).toBe(true);
    expect(settingsToggle).toHaveAttribute('aria-pressed', 'true');
    settingsView.unmount();

    // 2. Guided FirstAtBat Options toggle + primary button cues ("Swing · 1-Pitch" / "Throw · 1-Pitch")
    const onToggleOnePitch = vi.fn();
    const guidedView = render(
      <FirstAtBat
        session={makeSession(0)}
        batting
        target="attack_zone"
        call="contact"
        locked={false}
        expanded={false}
        powerArmed={false}
        onePitchMode
        onToggleOnePitchMode={onToggleOnePitch}
        cue={BASE_CUE}
        onTarget={vi.fn()}
        onSwing={vi.fn()}
        onPitch={vi.fn()}
        onExpand={vi.fn()}
        onSuggested={vi.fn()}
      />,
    );
    const guidedToggle = screen.getByTestId('guided-one-pitch-toggle');
    expect(guidedToggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(guidedToggle);
    expect(onToggleOnePitch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Swing · 1-Pitch' })).toBeVisible();

    guidedView.rerender(
      <FirstAtBat
        session={makeSession(0)}
        batting={false}
        target="attack_zone"
        call="normal"
        locked={false}
        expanded={false}
        powerArmed={false}
        onePitchMode
        onToggleOnePitchMode={onToggleOnePitch}
        cue={BASE_CUE}
        onTarget={vi.fn()}
        onSwing={vi.fn()}
        onPitch={vi.fn()}
        onExpand={vi.fn()}
        onSuggested={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Throw · 1-Pitch' })).toBeVisible();
    guidedView.unmount();

    // 3. Full Live GameDayScreen with onePitchMode ON resolves full PA in one tap via stepOnePitchAtBat
    useUserPreferencesStore.getState().setOnePitchMode(true);
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    expect(screen.getByTestId('arcade-one-pitch-toggle')).toHaveAttribute('aria-pressed', 'true');
    const primaryBtn = screen.getByTestId('live-primary-pitch-btn');
    expect(primaryBtn).toHaveTextContent(/Throw · 1-Pitch/i);

    fireEvent.click(primaryBtn);
    // Deciding PA outcome emitted with realistic pitch events in the play-by-play ticker!
    const tickerText = screen.getByTestId('play-by-play-ticker').textContent ?? '';
    expect(tickerText).toMatch(/mph/i);
  });
});
