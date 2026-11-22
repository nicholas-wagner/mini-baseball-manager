import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { LeagueScreen } from './LeagueScreen';

describe('LeagueScreen — 6-Tier Pyramid & 21-Game Season Flow (TASK-024)', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Skip',
      seed: 1994,
    });
  });

  it(
    'displays all 6 tiers, simulates 3-game series, switches tier standings, and executes Playoffs & Offseason',
    async () => {
      const user = userEvent.setup();
      render(<LeagueScreen />);

      expect(screen.getByText(/6-tier baseball pyramid • season 1/i)).toBeInTheDocument();
      expect(screen.getByText(/sandlot comets \(you\)/i)).toBeInTheDocument();

      // Switch to Mini Major League tier and verify its clubs render
      await user.click(screen.getByRole('button', { name: /mini major league/i }));
      expect(screen.getByText(/empire monarchs/i)).toBeInTheDocument();

      // Simulate 1 three-game series from UI button
      await user.click(screen.getByRole('button', { name: /sim next 3-game series/i }));
      expect(screen.getByTestId('league-notice').textContent).toMatch(/series 1 of 7/i);

      // Fast-forward remaining 6 series via store so Playoffs & Offseason unlocks cleanly
      act(() => {
        for (let i = 0; i < 6; i += 1) {
          useGameStore.getState().simNextSeriesRound(5);
        }
      });

      await user.click(screen.getByRole('button', { name: /playoffs & offseason/i }));
      expect(screen.getByTestId('league-notice').textContent).toMatch(/season 2 underway/i);
      expect(useGameStore.getState().seasonNumber).toBe(2);
    },
    30_000,
  );
});
