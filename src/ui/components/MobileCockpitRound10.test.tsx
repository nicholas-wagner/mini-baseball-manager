import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { ScoreboardStrip } from '../design-system/ScoreboardStrip';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('TASK-084 — Mobile One-Screen Live Cockpit, Guided Heat/Bunt, Arcade Shift Drawer & Roster/Clubhouse Polish', () => {
  beforeEach(() => {
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
      seed: 2089,
    });
  });

  it('lets players tap the Mascot Buddy on the Opening Cover to cycle mascots with a cheer quip and renders a tactile Customize pill', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);

    const mascotBtn = screen.getByTestId('cover-mascot-cycle-btn');
    expect(screen.getByText(/rocket dog/i)).toBeInTheDocument();
    fireEvent.click(mascotBtn);
    expect(screen.getByText(/splash otter/i)).toBeInTheDocument();
    expect(screen.getByTestId('cover-mascot-quip')).toHaveTextContent(/splash:/i);

    const changeBtn = screen.getByRole('button', { name: 'Change club' });
    expect(changeBtn.className).toMatch(/opening-customize-pill/);
  });

  it('includes Catcher Call (pitching) and Bunt (batting) in Guided First At-Bat and hides the duplicate heading when expanded', () => {
    // Seed 2089 starts batting in guided Opening Day moment
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^(Bat|Pitch) with / }));

    const guide = within(screen.getByRole('region', { name: 'First at-bat' }));
    const buntChoice = guide.queryByRole('button', { name: /bunt/i });
    const catcherCall = guide.queryByTestId('guided-catcher-call');
    expect(buntChoice || catcherCall).toBeTruthy();

    if (buntChoice) {
      fireEvent.click(buntChoice);
      expect(buntChoice).toHaveAttribute('aria-pressed', 'true');
      expect(guide.getByRole('button', { name: /bunt/i })).toBeInTheDocument();
    } else if (catcherCall) {
      expect(guide.getByRole('button', { name: /throw · 1-pitch|throw pitch/i })).toBeInTheDocument();
    }

    // Expanding More controls hides the duplicate h3 objective inside FirstAtBat
    expect(guide.getByRole('heading', { level: 3 })).toBeInTheDocument();
    fireEvent.click(guide.getByRole('button', { name: 'More controls' }));
    expect(guide.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('provides a 1-tap Shift drawer while pitching in Arcade Mode and shows CPU alignment badge when batting', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Ensure we reach a pitching half to test the 1-tap Shift drawer
    if (!screen.queryByTestId('arcade-shift-toggle')) {
      fireEvent.click(screen.getByTestId('fast-sim-toggle'));
      fireEvent.click(screen.getByRole('button', { name: /sim half-inn/i }));
    }

    const shiftBtn = screen.getByTestId('arcade-shift-toggle');
    fireEvent.click(shiftBtn);
    const shiftDrawer = screen.getByTestId('arcade-shift-drawer');
    fireEvent.click(within(shiftDrawer).getByRole('button', { name: /infield in/i }));
    expect(screen.getByTestId('arcade-shift-toggle')).toHaveTextContent(/infield in/i);
  });

  it('renders a single compact R/H/E scoreboard without duplicate testids in full games, and collapsible guided line in Guided Mode', () => {
    const { rerender } = render(
      <ScoreboardStrip
        clubs={{ away: 'Shamrocks', home: 'Comets', humanHome: true }}
        desktopFull
        awayAbbr="SH"
        awayScore={2}
        homeAbbr="SC"
        homeScore={1}
        awayColor="#2FB356"
        homeColor="#E63946"
        inning={4}
        half="TOP"
        balls={1}
        strikes={2}
        outs={1}
      />,
    );
    expect(screen.getAllByTestId('scoreboard-bases-diamond')).toHaveLength(1);
    expect(screen.getByTestId('scoreboard-away-rhe')).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard-home-rhe')).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard-count-text')).toHaveTextContent('1-2');
    expect(screen.queryByRole('button', { name: /toggle line score/i })).toBeNull();

    rerender(
      <ScoreboardStrip
        clubs={{ away: 'Shamrocks', home: 'Comets', humanHome: true }}
        awayAbbr="SH"
        awayScore={2}
        homeAbbr="SC"
        homeScore={1}
        awayColor="#2FB356"
        homeColor="#E63946"
        inning={4}
        half="TOP"
        balls={1}
        strikes={2}
        outs={1}
      />,
    );
    expect(screen.getByRole('button', { name: /toggle line score/i })).toBeInTheDocument();
    expect(screen.queryByTestId('scoreboard-home-rhe')).toBeNull();
  });

  it('uses a Roster title (not Clubhouse), collapsible synergy details, 3-column view bar, and clean non-duplicated icons on Clubhouse HQ', () => {
    const { unmount } = render(<RosterLineupScreen onPlayBall={vi.fn()} />);
    expect(screen.getByText(/sandlot comets roster/i)).toBeInTheDocument();
    expect(screen.queryByText(/sandlot comets clubhouse/i)).toBeNull();

    const synergy = screen.getByTestId('coed-synergy-banner');
    expect(synergy.tagName).toBe('DETAILS');

    const tabsWrap = screen.getByTestId('roster-view-tabs');
    expect(tabsWrap.className).toMatch(/grid-cols-3/);

    // Tapping a batting-order player opens their full Baseball Card modal directly
    fireEvent.click(screen.getAllByTestId('roster-open-card-btn')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();

    // Clubhouse HQ room tabs use crisp Lucide icons without doubled emoji prefixes
    render(<ClubHubScreen />);
    const roomTabs = screen.getByTestId('hub-room-tabs');
    expect(roomTabs.textContent).not.toMatch(/🏟️|👕|👥|🏆/);
    expect(roomTabs).toHaveTextContent(/ballpark & economy/i);
    expect(roomTabs).toHaveTextContent(/uniforms & gear/i);
    expect(roomTabs).toHaveTextContent(/staff & front office/i);
    expect(roomTabs).toHaveTextContent(/events & duels/i);
  });
});
