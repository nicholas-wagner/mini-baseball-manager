import { describe, expect, it } from 'vitest';
import type { PlayEvent } from '../models/playEvent';
import {
  extractBatterGameMemory,
  formatBatterGameMemoryLine,
} from './atBatMemory';

function makeEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 1,
    type: 'pitch_thrown',
    inning: 1,
    half: 'TOP',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: 'Pitch',
    ...overrides,
  };
}

describe("Today's At-Bat Memory (TASK-124 Part B)", () => {
  it('extracts chronological completed plate appearances for the target batter and ignores routine pitches/others', () => {
    const events: PlayEvent[] = [
      makeEvent({
        seq: 1,
        inning: 1,
        batterId: 'b1',
        outcome: 'called_strike',
        pitchThrown: {
          pitchType: 'four_seam',
          mph: 94,
          isFavoritePitch: true,
          isWeakPitchForPitcher: false,
          batterAffinity: 'neutral',
        },
      }),
      makeEvent({
        seq: 2,
        inning: 1,
        batterId: 'b1',
        outcome: 'strikeout',
        outsAfter: 1,
        pitchThrown: {
          pitchType: 'slider',
          mph: 85,
          isFavoritePitch: false,
          isWeakPitchForPitcher: false,
          batterAffinity: 'weak',
        },
      }),
      makeEvent({
        seq: 3,
        inning: 1,
        batterId: 'b2',
        type: 'ball_in_play',
        outcome: 'home_run',
      }),
      makeEvent({
        seq: 4,
        inning: 2,
        batterId: 'b1',
        type: 'stolen_base_attempt',
      }),
      makeEvent({
        seq: 5,
        inning: 3,
        batterId: 'b1',
        type: 'ball_in_play',
        outcome: 'double',
        pitchThrown: {
          pitchType: 'four_seam',
          mph: 95,
          isFavoritePitch: true,
          isWeakPitchForPitcher: false,
          batterAffinity: 'favorite',
        },
      }),
      makeEvent({
        seq: 6,
        inning: 5,
        batterId: 'b1',
        type: 'pitch_thrown',
        outcome: 'walk',
      }),
    ];

    const entries = extractBatterGameMemory(events, 'b1');
    expect(entries).toEqual([
      { inning: 1, shortResult: 'K', pitchLabel: 'Slider', isHit: false },
      { inning: 3, shortResult: '2B', pitchLabel: '4-Seam', isHit: true },
      { inning: 5, shortResult: 'BB', pitchLabel: null, isHit: false },
    ]);

    expect(formatBatterGameMemoryLine(entries)).toBe('1st K (Slider) · 3rd 2B (4-Seam) · 5th BB');
  });

  it('maps every completed PA outcome accurately and formats ordinal innings cleanly', () => {
    const outcomes = [
      { outcome: 'single' as const, inning: 1, shortResult: '1B', isHit: true },
      { outcome: 'double' as const, inning: 2, shortResult: '2B', isHit: true },
      { outcome: 'triple' as const, inning: 3, shortResult: '3B', isHit: true },
      { outcome: 'home_run' as const, inning: 4, shortResult: 'HR', isHit: true },
      { outcome: 'bunt_single' as const, inning: 5, shortResult: '1B', isHit: true },
      { outcome: 'walk' as const, inning: 6, shortResult: 'BB', isHit: false },
      { outcome: 'strikeout' as const, inning: 7, shortResult: 'K', isHit: false },
      { outcome: 'ground_out' as const, inning: 8, shortResult: 'GO', isHit: false },
      { outcome: 'fly_out' as const, inning: 9, shortResult: 'FO', isHit: false },
      { outcome: 'line_out' as const, inning: 10, shortResult: 'LO', isHit: false },
      { outcome: 'double_play' as const, inning: 11, shortResult: 'DP', isHit: false },
      { outcome: 'sac_fly' as const, inning: 12, shortResult: 'SF', isHit: false },
      { outcome: 'fielding_error' as const, inning: 13, shortResult: 'E', isHit: false },
      { outcome: 'bunt_out' as const, inning: 14, shortResult: 'SAC', isHit: false },
    ];

    const events = outcomes.map((item, idx) =>
      makeEvent({
        seq: idx + 1,
        inning: item.inning,
        batterId: 'slugger',
        type: 'ball_in_play',
        outcome: item.outcome,
      }),
    );

    const entries = extractBatterGameMemory(events, 'slugger');
    expect(entries).toHaveLength(outcomes.length);
    outcomes.forEach((expected, idx) => {
      expect(entries[idx]).toMatchObject({
        inning: expected.inning,
        shortResult: expected.shortResult,
        isHit: expected.isHit,
      });
    });

    expect(formatBatterGameMemoryLine([])).toBeNull();
    expect(
      formatBatterGameMemoryLine([
        { inning: 11, shortResult: 'DP', pitchLabel: null, isHit: false },
        { inning: 12, shortResult: 'SF', pitchLabel: 'Curve', isHit: false },
        { inning: 13, shortResult: 'E', pitchLabel: null, isHit: false },
      ]),
    ).toBe('11th DP · 12th SF (Curve) · 13th E');
  });
});
