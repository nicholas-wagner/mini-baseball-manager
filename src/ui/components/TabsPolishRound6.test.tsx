import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ComicCard } from '../design-system/ComicCard';
import { PwaInstallBanner } from './PwaInstallBanner';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';
import { UniformDesignerPanel } from './UniformDesignerPanel';

describe('Tabs & Mobile Polish Round 6 (Non-Clipping Headers, Roster Rows & Favorites, SP-First Skill Tree, Visual Ballpark & Dismissible Offline Pill)', () => {
  beforeEach(() => {
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

  it('allows ComicCard header badge toolbars to wrap cleanly inside narrow mobile widths without shrink-0 clipping', () => {
    render(
      <ComicCard
        title="Test Header"
        badge={<div data-testid="test-badge">Action Toolbar</div>}
      >
        Body
      </ComicCard>,
    );
    const badgeWrap = screen.getByTestId('test-badge').parentElement!;
    expect(badgeWrap.className).not.toContain('shrink-0');
    expect(badgeWrap.className).toContain('max-w-full');
  });

  it('gives RosterLineupScreen clean 2-row mobile lineup cards, 1-tap Favorite star toggle, and a Favorites card binder filter', () => {
    render(<RosterLineupScreen onPlayBall={vi.fn()} />);

    const starBtns = screen.getAllByTestId('roster-star-btn');
    expect(starBtns.length).toBe(9);
    fireEvent.click(starBtns[0]);
    expect(useGameStore.getState().favoritePlayerIds).toHaveLength(1);

    // Switch to Roster Cards binder and filter by ⭐ Favorites -> shows just the 1 starred player!
    fireEvent.click(screen.getByTestId('roster-view-cards-btn'));
    const favFilterBtn = screen.getByRole('button', { name: /⭐ favorites/i });
    expect(favFilterBtn).toBeInTheDocument();
    fireEvent.click(favFilterBtn);
    expect(screen.getAllByTestId('roster-binder-card-slot')).toHaveLength(1);
  });

  it('sorts SkillTreeScreen players with SP > 0 to the front and hides Respec until a skill is unlocked', () => {
    render(<SkillTreeScreen />);

    const strip = screen.getByTestId('skill-tree-player-strip');
    const firstPlayerBtn = within(strip).getAllByRole('button')[0];
    expect(firstPlayerBtn.textContent).toMatch(/⚡\s*1\s*SP/i);

    // Respec is hidden when 0 skills are unlocked so the Unlock Power CTA fits above the fold!
    expect(screen.queryByRole('button', { name: /respec/i })).not.toBeInTheDocument();
  });

  it('renders Ballpark HQ with a 2x2 mobile room grid, visual Sandlot-to-Majors venue header, and clear payoff/tier-lock upgrade cards', () => {
    render(<ClubHubScreen />);

    const roomTabs = screen.getByTestId('hub-room-tabs');
    expect(roomTabs.className).toContain('grid-cols-2');

    expect(screen.getByTestId('ballpark-visual-banner')).toBeInTheDocument();
    const upgradeCards = screen.getAllByTestId('stadium-upgrade-card');
    expect(upgradeCards).toHaveLength(4);
    expect(upgradeCards[0].textContent).toMatch(/fans|gate/i);
    // Mascot Cannon is clearly marked locked until AA instead of pretending to be buyable in Rookie!
    const cannonCard = upgradeCards.find((el) => /mascot cannon/i.test(el.textContent ?? ''))!;
    expect(cannonCard.textContent).toMatch(/aa/i);
  });

  it('makes the Offline Ready banner a compact 1-line pill that can be dismissed cleanly', () => {
    const origOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => false,
    });
    try {
      render(<PwaInstallBanner />);
      expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
      const dismissBtn = screen.getByTestId('dismiss-offline-banner');
      fireEvent.click(dismissBtn);
      expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
    } finally {
      if (origOnLine) {
        Object.defineProperty(Navigator.prototype, 'onLine', origOnLine);
      }
    }
  });

  it('gives unmistakable inline button & status confirmation for Auto-Tune, Auto-Optimize, Lineup Swap, and Apply Custom Uniform', () => {
    // 1. Pre-game Auto-Tune on GameDayScreen confirms right on the button + inline pill
    const gd = render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    const autoTuneBtn = screen.getByTestId('auto-tune-lineup-btn');
    fireEvent.click(autoTuneBtn);
    expect(autoTuneBtn).toHaveAttribute('data-confirmed', 'true');
    expect(autoTuneBtn.textContent).toMatch(/tuned/i);
    expect(screen.getByTestId('auto-tune-feedback')).toBeInTheDocument();
    gd.unmount();

    // 2. Roster Auto-Optimize & Swap confirm right on the button + top status banner
    const rs = render(<RosterLineupScreen onPlayBall={vi.fn()} />);
    const optBtn = screen.getByTestId('roster-auto-optimize-btn');
    fireEvent.click(optBtn);
    expect(optBtn).toHaveAttribute('data-confirmed', 'true');
    expect(optBtn.textContent).toMatch(/optimized/i);
    expect(screen.getByTestId('cross-train-feedback').textContent).toMatch(/lineup/i);

    // Manually swapping 2 slots confirms the swap and resets Auto-Optimize button cleanly
    fireEvent.click(screen.getByRole('button', { name: /swap slot 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /swap slot 2/i }));
    expect(screen.getByTestId('cross-train-feedback').textContent).toMatch(/swapped/i);
    expect(optBtn).not.toHaveAttribute('data-confirmed', 'true');
    rs.unmount();

    // 3. Apply Custom Uniform confirms right on the Apply button and resets when edited
    const club = useGameStore.getState().getHumanClub()!;
    render(<UniformDesignerPanel club={club} onNotice={vi.fn()} />);
    const applyBtn = screen.getByRole('button', { name: /apply custom uniform/i });
    fireEvent.click(applyBtn);
    expect(applyBtn).toHaveAttribute('data-confirmed', 'true');
    expect(applyBtn.textContent).toMatch(/uniform applied/i);
    expect(screen.getByTestId('uniform-applied-status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /vintage pinstripes/i }));
    expect(applyBtn).not.toHaveAttribute('data-confirmed', 'true');
  });
});
