import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('Mini Baseball Manager — Milestone 1 Design Lab Integration', () => {
  it('renders the Design Lab with live scoreboard, 3D viewport, and retro baseball cards', () => {
    render(<App />);
    expect(screen.getAllByText(/mini baseball manager/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('region', { name: /live baseball scoreboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('ballpark-3d-canvas')).toBeInTheDocument();
    expect(screen.getAllByText('Rico Comet').length).toBeGreaterThanOrEqual(1);
  });

  it('switches cameras, triggers special powers, rolls new random players, and navigates tabs', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to Batter Over-the-Shoulder 3D
    const batterCam = screen.getByRole('button', { name: /batter ots 3d/i });
    await user.click(batterCam);
    expect(batterCam).toHaveAttribute('aria-pressed', 'true');

    // Trigger Blazing Comet Special Power
    const cometBtn = screen.getByRole('button', { name: /blazing comet/i });
    await user.click(cometBtn);
    expect(cometBtn).toHaveAttribute('aria-pressed', 'true');

    // Roll a random procedural 90s player card
    const beforeCards = screen.getAllByRole('article', { name: /baseball card front/i }).length;
    await user.click(screen.getByRole('button', { name: /roll random player/i }));
    const afterCards = screen.getAllByRole('article', { name: /baseball card front/i }).length;
    expect(afterCards).toBe(beforeCards);

    // Navigate to Skill Tree preview tab and back to Design Lab
    await user.click(screen.getAllByRole('button', { name: /skill tree/i })[0]);
    expect(screen.getByText(/branching player & manager skill trees/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /design lab/i })[0]);
    expect(screen.getByTestId('ballpark-3d-canvas')).toBeInTheDocument();
  });
});
