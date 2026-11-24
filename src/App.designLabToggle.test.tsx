import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllCareerSlotsStorage } from './store/careerSlots';
import { useGameStore } from './store/gameStore';
import { App } from './App';

vi.mock('./ui/components/BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('App — Production Hidden Design Lab with 5x "d" Secret Toggle', () => {
  beforeEach(() => {
    clearAllCareerSlotsStorage();
    useGameStore.setState({ humanClubId: null, manager: null });
  });

  it('hides Design Lab by default on production launch, ignores typing "d" inside inputs, and toggles show/hide on 5x "d"', async () => {
    render(<App />);

    // 1. Default landing is Play Ball (Club Creator), NOT Design Lab, and Design Lab tab is hidden
    expect(screen.queryByRole('button', { name: /design lab/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Bat|Pitch) with / })).toBeInTheDocument();

    // 2. Typing "d" 5 times inside a text input must NOT reveal Design Lab
    fireEvent.click(screen.getByRole("button", { name: "Change club" }));
    const inputs = screen.getAllByRole('textbox');
    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(inputs[0], { key: 'd' });
    }
    expect(screen.queryByRole('button', { name: /design lab/i })).not.toBeInTheDocument();

    // 3. Pressing "d" 5 times outside editable fields reveals and opens Design Lab
    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(window, { key: 'd' });
    }
    expect(screen.getAllByRole('button', { name: /design lab/i }).length).toBeGreaterThanOrEqual(1);
    expect(
      await screen.findByRole('region', { name: /live baseball scoreboard/i }, { timeout: 8000 }),
    ).toBeInTheDocument();

    // 4. Pressing "d" 5 times again hides Design Lab and returns to Play Ball
    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(window, { key: 'd' });
    }
    expect(screen.queryByRole('button', { name: /design lab/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^(Bat|Pitch) with / })).toBeInTheDocument();
  });
});
