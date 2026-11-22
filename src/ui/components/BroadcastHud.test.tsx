import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createClub } from '../../engine/gm/rosterFactory';
import { createSeededRng } from '../../engine/rng/seededRng';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import { BroadcastHud } from './BroadcastHud';

describe('BroadcastHud (TASK-038 + TASK-070)', () => {
  it('renders live Win Probability bar, sparkline, defensive shifts, and speed-driven steal buttons', () => {
    const away = createClub(createSeededRng(3801), {
      id: 'hud-away',
      isHuman: false,
      city: 'East',
      name: 'Foxes',
      mascot: 'Fox',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'EF' },
      leagueTier: 'aa',
    });
    const home = createClub(createSeededRng(3802), {
      id: 'hud-home',
      isHuman: true,
      city: 'West',
      name: 'Comets',
      mascot: 'Comet',
      colors: { primary: '#0096C7', secondary: '#1B4332', accent: '#FFD166', monogram: 'WC' },
      leagueTier: 'aa',
    });
    const baseSession = createGameSession(away, home, 3810, 'regular', 9);
    const runnerId = home.lineup[0].playerId;
    const onSelectShift = vi.fn();
    const onSelectStealCall = vi.fn();

    // TOP inning: human is fielding -> Defensive Shifts & Pitchout visible
    const fieldingSession = {
      ...baseSession,
      half: 'TOP' as const,
      bases: [away.lineup[0].playerId, null, null] as [string, null, null],
    };
    const { rerender } = render(
      <BroadcastHud
        session={fieldingSession}
        winProbHistory={[0.52, 0.58]}
        defensiveShift="standard"
        onSelectShift={onSelectShift}
        activeTacticalCall="normal"
        onSelectStealCall={onSelectStealCall}
        lastEvent={null}
      />,
    );

    expect(screen.getByTestId('broadcast-hud')).toBeInTheDocument();
    expect(screen.getByTestId('defensive-shift-bar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'No Doubles' }));
    expect(onSelectShift).toHaveBeenCalledWith('no_doubles');
    fireEvent.click(screen.getByRole('button', { name: 'Pitchout' }));
    expect(onSelectStealCall).toHaveBeenCalledWith('pitchout');

    // BOT inning: human is batting with runner on 1B -> Steal 2B odds pill visible!
    const battingSession = {
      ...baseSession,
      half: 'BOT' as const,
      bases: [runnerId, null, null] as [string, null, null],
    };
    rerender(
      <BroadcastHud
        session={battingSession}
        winProbHistory={[0.52, 0.58, 0.64]}
        defensiveShift="no_doubles"
        onSelectShift={onSelectShift}
        activeTacticalCall="normal"
        onSelectStealCall={onSelectStealCall}
        lastEvent={null}
      />,
    );

    expect(screen.getByTestId('steal-hud-bar')).toBeInTheDocument();
    const stealBtn = screen.getByRole('button', { name: /Steal 2B:/i });
    expect(stealBtn.textContent).toMatch(/SPD \d+ • \d+%/);
    fireEvent.click(stealBtn);
    expect(onSelectStealCall).toHaveBeenCalledWith('steal');
  });
});
