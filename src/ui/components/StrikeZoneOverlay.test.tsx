import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayEvent } from '../../engine/models/playEvent';
import {
  extractAtBatStrikeZonePitches,
  StrikeZoneOverlay,
  type StrikeZonePitchPoint,
} from './StrikeZoneOverlay';

const SAMPLE_PITCHES: StrikeZonePitchPoint[] = [
  { pitchType: 'four_seam', mph: 94, category: 'strike', outcomeLabel: 'Called Strike', plateX: 0.4, plateY: 0.35 },
  { pitchType: 'slider', mph: 84, category: 'ball', outcomeLabel: 'Ball', plateX: 1.25, plateY: -0.75 },
  { pitchType: 'curveball', mph: 78, category: 'in_play', outcomeLabel: 'Double', plateX: -0.1, plateY: -0.15 },
];

describe('StrikeZoneOverlay (TASK-100 Standalone TV K-Zone Widget)', () => {
  it('plots numbered 1..N color-coded pitch dots inside a 3x3 strike zone and displays latest pitch mph & type', () => {
    render(<StrikeZoneOverlay pitches={SAMPLE_PITCHES} countLabel="1-1" />);

    const root = screen.getByTestId('strike-zone-overlay');
    expect(root).toBeInTheDocument();

    // 3x3 strike zone grid cells rendered inside SVG
    expect(screen.getAllByTestId('kzone-cell')).toHaveLength(9);

    // 3 numbered dots color-coded: strike=coral, ball=sky, in_play=gold
    const dots = screen.getAllByTestId('kzone-pitch-dot');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('data-category', 'strike');
    expect(dots[0]).toHaveTextContent('1');
    expect(dots[1]).toHaveAttribute('data-category', 'ball');
    expect(dots[1]).toHaveTextContent('2');
    expect(dots[2]).toHaveAttribute('data-category', 'in_play');
    expect(dots[2]).toHaveTextContent('3');

    // Latest pitch mph & type visible
    const latest = screen.getByTestId('kzone-latest-pitch');
    expect(latest).toHaveTextContent(/78\s*MPH/i);
    expect(latest).toHaveTextContent(/Curve/i);
  });

  it('toggles cleanly between compact and expanded views with a >=44px tap target', () => {
    const onModeChange = vi.fn();
    render(
      <StrikeZoneOverlay
        pitches={SAMPLE_PITCHES}
        initialMode="compact"
        onModeChange={onModeChange}
      />,
    );

    const toggle = screen.getByTestId('kzone-toggle-btn');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toMatch(/min-h-\[44px\]|min-h-11/);
    expect(screen.queryByTestId('kzone-pitch-log')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(onModeChange).toHaveBeenCalledWith('expanded');

    const log = screen.getByTestId('kzone-pitch-log');
    expect(log).toBeInTheDocument();
    expect(within(log).getByText(/94\s*MPH/i)).toBeInTheDocument();
    expect(within(log).getByText(/84\s*MPH/i)).toBeInTheDocument();
    expect(within(log).getByText(/78\s*MPH/i)).toBeInTheDocument();
  });

  it('extracts current at-bat pitches deterministically from raw PlayEvent arrays', () => {
    const base: PlayEvent = {
      seq: 1,
      type: 'pitch_thrown',
      inning: 1,
      half: 'TOP',
      outsBefore: 0,
      outsAfter: 0,
      balls: 0,
      strikes: 1,
      awayScore: 0,
      homeScore: 0,
      basesAfter: [null, null, null],
      batterId: 'batter-1',
      pitcherId: 'pitcher-1',
      isClutchMoment: false,
      commentary: 'Strike!',
    };

    const events: PlayEvent[] = [
      {
        ...base,
        seq: 1,
        outcome: 'called_strike',
        pitchThrown: {
          pitchType: 'four_seam',
          mph: 93,
          isFavoritePitch: true,
          isWeakPitchForPitcher: false,
          batterAffinity: 'neutral',
        },
      },
      { ...base, seq: 2, type: 'at_bat_start', batterId: 'batter-2', commentary: 'New batter' },
      {
        ...base,
        seq: 3,
        batterId: 'batter-2',
        outcome: 'ball',
        balls: 1,
        strikes: 0,
        pitchThrown: {
          pitchType: 'changeup',
          mph: 81,
          isFavoritePitch: false,
          isWeakPitchForPitcher: false,
          batterAffinity: 'weak',
        },
      },
      {
        ...base,
        seq: 4,
        type: 'ball_in_play',
        batterId: 'batter-2',
        outcome: 'single',
        pitchThrown: {
          pitchType: 'four_seam',
          mph: 95,
          isFavoritePitch: true,
          isWeakPitchForPitcher: false,
          batterAffinity: 'favorite',
        },
      },
    ];

    const extracted = extractAtBatStrikeZonePitches(events);
    expect(extracted).toHaveLength(2);
    expect(extracted[0].category).toBe('ball');
    expect(extracted[0].mph).toBe(81);
    expect(extracted[1].category).toBe('in_play');
    expect(extracted[1].mph).toBe(95);

    // Deterministic coordinates for identical event streams
    expect(extractAtBatStrikeZonePitches(events)).toEqual(extracted);

    render(<StrikeZoneOverlay events={events} />);
    expect(screen.getAllByTestId('kzone-pitch-dot')).toHaveLength(2);
    expect(screen.getByTestId('kzone-latest-pitch')).toHaveTextContent(/95\s*MPH/i);
  });
});
