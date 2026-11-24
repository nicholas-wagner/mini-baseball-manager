import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { generateSixTierWorld } from '../../engine/league/seasonEngine';
import {
  ParkLineupCard,
  SprayChart,
  ThirdBaseDecision,
  WatchSettings,
} from './DugoutScouting';
import { getBallparkPreset } from '../../engine/ballparks/stadiumCatalog';

const club = generateSixTierWorld(1994, {
  city: 'Sandlot',
  clubName: 'Comets',
  mascot: 'Rocket',
  monogram: 'SC',
  primaryColor: '#112233',
  secondaryColor: '#335544',
  accentColor: '#667788',
}).leagues.rookie[0];
it('lets a manager promote a hitter from the illustrated venue card', () => {
  const change = vi.fn();
  render(
    <ParkLineupCard
      club={club}
      park={getBallparkPreset('harbor_shipyard')}
      onSwap={change}
    />,
  );
  fireEvent.click(screen.getByText(/park scouting/i));
  expect(screen.getByText(/312 ft/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /move up/i }));
  expect(change).toHaveBeenCalled();
});
it('offers lineup names as Smart Watch targets and labels a small spray sample', () => {
  const change = vi.fn();
  render(
    <>
      <WatchSettings side={club} value="highlights" onChange={change} />
      <SprayChart
        points={[
          { x: -12, z: -22 },
          { x: 14, z: -25 },
        ]}
      />
    </>,
  );
  fireEvent.change(screen.getByLabelText(/pause smart watch/i), {
    target: { value: club.lineup[1].playerId },
  });
  expect(change).toHaveBeenCalledWith(club.lineup[1].playerId);
  expect(
    screen.getByRole('img', { name: /2 balls in play/i }),
  ).toBeInTheDocument();
});

it('holds the runner at the turn until the manager explicitly sends or holds', () => {
  vi.useFakeTimers();
  try {
    const decide = vi.fn();
    render(
      <ThirdBaseDecision
        runner="Max"
        arm={78}
        position="RF"
        arrivalMs={1600}
        onResolve={decide}
      >
        Diamond
      </ThirdBaseDecision>,
    );
    const send = screen.getByRole('button', { name: 'Send home' });
    expect(send).toBeDisabled();
    act(() => vi.advanceTimersByTime(6000));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.getByText(/strong arm in right/i)).toBeVisible();
    fireEvent.click(send);
    expect(decide).toHaveBeenCalledWith(true);
  } finally {
    vi.useRealTimers();
  }
});
