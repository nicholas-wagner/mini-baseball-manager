import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { GameDayScreen } from './GameDayScreen';

describe('GameDayScreen — Live 3D Game Day Flow (TASK-016)', () => {
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

  it('starts a live 3D game, steps pitches, adjusts speed/tactics, simulates to completion, and shows MVP summary', async () => {
    const user = userEvent.setup();
    render(<GameDayScreen />);

    expect(screen.getByText(/choose today's matchup/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start live 3d game/i }));

    expect(screen.getByRole('region', { name: /live baseball scoreboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('live-game-3d-canvas')).toBeInTheDocument();

    // Switch speed to 4x and choose Power tactical call
    await user.click(screen.getByRole('button', { name: /4x/i }));
    await user.click(screen.getByRole('button', { name: /^power$/i }));

    // Step 1 manual pitch and confirm commentary updates
    await user.click(screen.getByRole('button', { name: /next pitch/i }));
    expect(screen.getByTestId('play-by-play-ticker').textContent?.length).toBeGreaterThan(5);

    // Sim to End completes game cleanly and opens PostGameSummaryModal
    await user.click(screen.getByRole('button', { name: /sim to end/i }));
    expect(await screen.findByRole('dialog', { name: /post-game box score & mvp/i })).toBeInTheDocument();

    const updatedClub = useGameStore.getState().getHumanClub()!;
    expect(updatedClub.wins + updatedClub.losses).toBe(1);
  });
});
