import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHumanSeasonSchedule } from '../../engine/league/seasonEngine';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { SettingsModal } from './SettingsModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

function makeTiredHumanPitchingSession() {
  const store = useGameStore.getState();
  const home = store.getHumanClub()!;
  const series = getHumanSeasonSchedule(store.leagues[home.leagueTier], home.id, 0).nextSeries!;
  const session = createGameSession(series.opponent, home, 1994, 'regular', 5);
  session.inning = 4;
  session.half = 'TOP';
  session.outs = 1;
  session.balls = 0;
  session.strikes = 0;
  session.home.score = 3;
  session.away.score = 2;
  session.home.pitcherFatigue = 76; // 24% endurance -> tiring/gassed bullpen prompt!
  return session;
}

describe('3-Mode Bullpen Manager UI (Auto / Ask Me Semi-Auto / Manual) — TASK-093', () => {
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

  it('defaults bullpenMode to semi_auto in userPreferences and switches cleanly in SettingsModal', () => {
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('semi_auto');

    render(<SettingsModal open onClose={vi.fn()} />);
    const picker = screen.getByTestId('settings-bullpen-mode');
    expect(within(picker).getByRole('button', { name: /ask me/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(within(picker).getByRole('button', { name: /auto \(coach swaps\)/i }));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('auto');

    fireEvent.click(within(picker).getByRole('button', { name: /manual/i }));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('manual');

    fireEvent.click(within(picker).getByRole('button', { name: /ask me/i }));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('semi_auto');
  });

  it('shows Coach Pops 1-tap Bullpen Call banner in Semi-Auto mode with Bring In, Keep (snooze), and Pick Another controls', () => {
    const session = makeTiredHumanPitchingSession();
    render(
      <GameDayScreen
        openingRequest={{ session, events: [], gameEvents: [], recapHeadline: '' }}
      />,
    );

    // Appears right in Guided Opening Day when pitcher is tired!
    const guidedBanner = screen.getByTestId('bullpen-suggestion-banner');
    expect(guidedBanner).toBeVisible();
    expect(within(guidedBanner).getByTestId('bullpen-accept-btn')).toBeVisible();

    // Expand to full LiveActionBar controls -> banner stays visible & snooze works cleanly
    fireEvent.click(screen.getByRole('button', { name: 'More controls' }));
    const liveBanner = screen.getByTestId('bullpen-suggestion-banner');
    expect(liveBanner).toBeVisible();

    // Clicking Other opens the upgraded bullpen drawer with 3-mode switcher & Coach Pick badge
    fireEvent.click(within(liveBanner).getByTestId('bullpen-other-btn'));
    const drawer = screen.getByTestId('arcade-bullpen-drawer');
    expect(drawer).toBeVisible();
    expect(within(drawer).getByTestId('bullpen-mode-switcher')).toBeVisible();
    expect(drawer.textContent).toMatch(/coach.?s pick/i);

    // Clicking Keep snoozes the banner cleanly
    fireEvent.click(within(liveBanner).getByTestId('bullpen-keep-btn'));
    expect(screen.queryByTestId('bullpen-suggestion-banner')).toBeNull();
  });

  it('executes a 1-tap bullpen swap directly from the Semi-Auto Bullpen Call banner', () => {
    const session = makeTiredHumanPitchingSession();
    render(
      <GameDayScreen
        openingRequest={{ session, events: [], gameEvents: [], recapHeadline: '' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More controls' }));

    const acceptBtn = screen.getByTestId('bullpen-accept-btn');
    fireEvent.click(acceptBtn);

    // Pitcher swapped -> banner disappears & pitching_change appears in ticker
    expect(screen.queryByTestId('bullpen-suggestion-banner')).toBeNull();
    expect(screen.getByTestId('play-by-play-ticker').textContent).toMatch(/takes the mound/i);
  });

  it('switches bullpen modes live inside the Bullpen Drawer and respects Manual vs Auto behavior', () => {
    const session = makeTiredHumanPitchingSession();
    session.home.pitcherFatigue = 92; // 8% endurance (gassed)
    render(
      <GameDayScreen
        openingRequest={{ session, events: [], gameEvents: [], recapHeadline: '' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More controls' }));

    // Open Bullpen Drawer -> switch to Manual mode -> Semi-Auto banner hides immediately!
    fireEvent.click(screen.getByTestId('arcade-bullpen-toggle'));
    const modeBar = screen.getByTestId('bullpen-mode-switcher');
    fireEvent.click(within(modeBar).getByRole('button', { name: /manual/i }));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('manual');
    expect(screen.queryByTestId('bullpen-suggestion-banner')).toBeNull();

    // Switching to Auto mode keeps banner hidden and lets Auto Bullpen handle tired arms seamlessly
    fireEvent.click(within(modeBar).getByRole('button', { name: /^auto$/i }));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('auto');
    expect(screen.queryByTestId('bullpen-suggestion-banner')).toBeNull();
    // Still has full manual override buttons inside the drawer if player wants control!
    expect(screen.getAllByTestId('arcade-bullpen-bring-in').length).toBeGreaterThanOrEqual(1);
  });

  it('supports switching Bullpen Mode from Opening Day Guided Options menu', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^Pitch with / }));
    const guide = within(screen.getByRole('region', { name: 'First at-bat' }));

    fireEvent.click(guide.getByTestId('guided-bullpen-mode-auto'));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('auto');

    fireEvent.click(guide.getByTestId('guided-bullpen-mode-manual'));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('manual');

    fireEvent.click(guide.getByTestId('guided-bullpen-mode-semi_auto'));
    expect(useUserPreferencesStore.getState().bullpenMode).toBe('semi_auto');
  });
});
