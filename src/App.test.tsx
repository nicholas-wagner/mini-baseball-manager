import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllCareerSlotsStorage } from './store/careerSlots';
import { useGameStore } from './store/gameStore';
import { App } from './App';

function unlockDesignLab(): void {
  for (let i = 0; i < 5; i += 1) {
    fireEvent.keyDown(window, { key: 'd' });
  }
}

describe('Mini Baseball Manager — App & Design Lab Integration', () => {
  beforeEach(() => {
    clearAllCareerSlotsStorage();
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('unlocks the Design Lab via 5x "d" with live scoreboard, 3D viewport, and retro baseball cards', async () => {
    render(<App />);
    expect(screen.getAllByText(/mini baseball manager/i).length).toBeGreaterThanOrEqual(1);
    unlockDesignLab();

    expect(
      await screen.findByRole('region', { name: /live baseball scoreboard/i }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('ballpark-3d-canvas')).toBeInTheDocument();
    expect(screen.getAllByText('Rico Comet').length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('switches cameras, triggers special powers, rolls new random players, and navigates tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    unlockDesignLab();

    // Switch to Batter Over-the-Shoulder 3D
    const batterCam = await screen.findByRole(
      'button',
      { name: /batter ots 3d/i },
      { timeout: 10_000 },
    );
    await user.click(batterCam);
    expect(batterCam).toHaveAttribute('aria-pressed', 'true');

    // Trigger Blazing Comet Special Power
    const cometBtn = screen.getByRole('button', { name: /blazing comet/i });
    await user.click(cometBtn);
    expect(cometBtn).toHaveAttribute('aria-pressed', 'true');

    // Roll a preview, then replace it with an Australian prospect.
    const beforeCards = screen.getAllByRole('article', { name: /baseball card front/i }).length;
    await user.click(screen.getByRole('button', { name: /roll weighted player/i }));
    const afterCards = screen.getAllByRole('article', { name: /baseball card front/i }).length;
    expect(afterCards).toBe(beforeCards + 1);

    await user.click(screen.getByRole('button', { name: /aus.*3%/i }));
    expect(screen.getAllByRole('article', { name: /baseball card front/i })).toHaveLength(afterCards);
    expect(screen.getAllByText(/kangaroo bounce/i).length).toBeGreaterThanOrEqual(1);

    // Switch opposing batter to Switch Hitter and verify platoon matchup indicator updates
    await user.click(screen.getByRole('button', { name: /switch \(s\)/i }));
    expect(screen.getAllByText(/switch-hitter platoon edge/i).length).toBeGreaterThanOrEqual(1);

    // Navigate to Play Ball (Club Creator), found a club, then visit live Ballpark & Skill Tree tabs and return to Design Lab
    await user.click(screen.getAllByRole('button', { name: /play ball/i })[0]);
    expect(
      await screen.findByText(/found your 90s sandlot club/i, {}, { timeout: 10_000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /play opening day/i }));
    await user.click(screen.getAllByRole('button', { name: /ballpark/i })[0]);
    expect(
      await screen.findByTestId('ballpark-visual-banner', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /skill tree/i })[0]);
    expect(
      await screen.findByTestId('skill-tree-player-strip', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /design lab/i })[0]);
    expect(await screen.findByTestId('ballpark-3d-canvas', {}, { timeout: 10_000 })).toBeInTheDocument();
  }, 45_000);
});
