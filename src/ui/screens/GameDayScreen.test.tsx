import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from './GameDayScreen';

describe('GameDayScreen — Live 3D Game Day Flow (TASK-016)', () => {
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
      seed: 1994,
    });
  });

  it(
    'starts a live 3D game in Arcade Mode, toggles Pro Manager for 4-5 SP & 2-3 RP pitch selectors, steps pitches, and opens MVP summary',
    async () => {
      const user = userEvent.setup();
      render(<GameDayScreen />);

      expect(screen.getByText(/choose today's matchup/i)).toBeInTheDocument();
      // Soundboard now lives exclusively in Design Lab
      expect(screen.queryByTestId('ballpark-soundboard')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /5 inn \(blitz\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /7 inn \(quick\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /9 inn \(classic\)/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /5 inn \(blitz\)/i }));
      await user.click(screen.getByRole('button', { name: /start live 3d game/i }));

      expect(screen.getByRole('region', { name: /live baseball scoreboard/i })).toBeInTheDocument();
      expect(screen.getByTestId('live-game-3d-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('live-action-bar')).toBeInTheDocument();
      expect(screen.getByTestId('coach-action-cue')).toBeInTheDocument();

      // Expand Pro Manager controls to access full pitch arsenal, bullpen phone, and telemetry
      await user.click(screen.getByTestId('control-mode-toggle'));

      // Home SP pitches in TOP 1 with 4-5 selectable pitches + Endurance, Leverage & Special Ability HUD
      expect(screen.getByTestId('leverage-hud').textContent).toMatch(/LI /i);
      expect(screen.getByTestId('endurance-hud').textContent).toMatch(/endurance 100%/i);
      expect(screen.getByTestId('special-ability-hud').textContent).toMatch(/pitcher 2\/2/i);
      const spPitchButtons = screen.getAllByRole('button', { name: /^pitch /i });
      expect(spPitchButtons.length).toBeGreaterThanOrEqual(4);
      expect(spPitchButtons.length).toBeLessThanOrEqual(5);
      await user.click(spPitchButtons[0]);

      // Switch speed to 4x and choose Power tactical call
      await user.click(screen.getByRole('button', { name: /4x/i }));
      await user.click(screen.getByRole('button', { name: /^power$/i }));

      // Step 1 manual pitch and confirm commentary updates with pitch telemetry
      await user.click(screen.getByRole('button', { name: /next pitch/i }));
      expect(screen.getByTestId('play-by-play-ticker').textContent).toMatch(/mph/i);

      // Swap in a reliever from Bullpen Phone -> repertoire drops to strictly 2-3 pitches
      const relieverButtons = screen.getAllByRole('button', { name: /bring in /i });
      await user.click(relieverButtons[0]);
      const rpPitchButtons = screen.getAllByRole('button', { name: /^pitch /i });
      expect(rpPitchButtons.length).toBeGreaterThanOrEqual(2);
      expect(rpPitchButtons.length).toBeLessThanOrEqual(3);

      // Sim Half-Inn jumps smoothly out of TOP 1
      await user.click(screen.getByRole('button', { name: /sim half-inn/i }));
      expect(screen.queryByTestId('pitch-selector-bar')).not.toBeInTheDocument();

      // Sim to End completes game cleanly and opens PostGameSummaryModal
      await user.click(screen.getByRole('button', { name: /sim to end/i }));
      expect(await screen.findByRole('dialog', { name: /post-game box score & mvp/i })).toBeInTheDocument();

      const updatedClub = useGameStore.getState().getHumanClub()!;
      expect(updatedClub.wins + updatedClub.losses).toBe(1);
    },
    30_000,
  );
});
