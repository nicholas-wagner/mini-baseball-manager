import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateLineup } from '../../engine/gm/rosterFactory';
import { useGameStore } from '../../store/gameStore';
import { RosterLineupScreen } from './RosterLineupScreen';

describe('RosterLineupScreen (TASK-015)', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('renders lineup, bench, rotation, bullpen, swaps batting order, auto-optimizes, and opens SaveSlotsModal', async () => {
    const user = userEvent.setup();
    const onPlayBall = vi.fn();
    render(<RosterLineupScreen onPlayBall={onPlayBall} />);

    const clubBefore = useGameStore.getState().getHumanClub()!;
    const firstBatterId = clubBefore.lineup[0].playerId;
    const secondBatterId = clubBefore.lineup[1].playerId;

    // Select slot #1 and swap with slot #2
    await user.click(screen.getByRole('button', { name: /swap slot 1/i }));
    await user.click(screen.getByRole('button', { name: /swap slot 2/i }));

    const clubAfterSwap = useGameStore.getState().getHumanClub()!;
    expect(clubAfterSwap.lineup[0].playerId).toBe(secondBatterId);
    expect(clubAfterSwap.lineup[1].playerId).toBe(firstBatterId);
    expect(validateLineup(clubAfterSwap).valid).toBe(true);

    await user.click(screen.getByRole('button', { name: /auto-optimize lineup/i }));
    expect(validateLineup(useGameStore.getState().getHumanClub()!).valid).toBe(true);

    await user.click(screen.getByRole('button', { name: /save \/ load/i }));
    expect(screen.getByRole('dialog', { name: /save & backup slots/i })).toBeInTheDocument();
  }, 30_000);

  it(
    'displays 18/20 roster limit, favorite boost / specialist tags, cross-training, and free-agent signing',
    async () => {
      const user = userEvent.setup();
      render(<RosterLineupScreen onPlayBall={vi.fn()} />);

      expect(screen.getByText(/roster 18\/20/i)).toBeInTheDocument();
      expect(screen.getAllByText(/★ fav/i).length).toBeGreaterThanOrEqual(1);

      // Cross-train default inspected #1 hitter at 1B before signing an FA (which may inspect a pitcher)
      const crossTrainBtn = screen.getByRole('button', { name: /^train 1b/i });
      await user.click(crossTrainBtn);
      expect(screen.getByTestId('cross-train-feedback')).toBeInTheDocument();

      // Sign a Rookie or Affordable Free Agent from the wire (18/20 -> 19/20)
      const signButtons = screen.getAllByRole('button', { name: /^sign$/i });
      expect(signButtons.length).toBeGreaterThanOrEqual(1);
      await user.click(signButtons[0]);
      expect(screen.getByText(/roster 19\/20/i)).toBeInTheDocument();
    },
    30_000,
  );
});
