import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createEmptySeasonStats } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  applySlumpBuster,
  computeGameFormDelta,
  deriveFormState,
  getFormStatModifiers,
  updatePlayerFormAfterGame,
} from './formTracker';

describe('TASK-021 — Dynamic Hot Streaks & Cold Slumps Engine', () => {
  it('maps formScore ranges cleanly onto blazing/hot/neutral/cold/frozen states', () => {
    expect(deriveFormState(75)).toBe('blazing');
    expect(deriveFormState(25)).toBe('hot');
    expect(deriveFormState(0)).toBe('neutral');
    expect(deriveFormState(-25)).toBe('cold');
    expect(deriveFormState(-65)).toBe('frozen');
  });

  it('computes hot and cold game deltas and updates player form + stat modifiers', () => {
    const hitter = createPlayer(createSeededRng(500), { position: 'CF', tier: 'aa' });
    const bigGame = { ...createEmptySeasonStats(), games: 1, atBats: 4, hits: 3, homeRuns: 2, rbis: 4 };
    const slumpGame = { ...createEmptySeasonStats(), games: 1, atBats: 4, hits: 0, strikeouts: 3 };

    expect(computeGameFormDelta(false, bigGame)).toBeGreaterThan(20);
    expect(computeGameFormDelta(false, slumpGame)).toBeLessThan(-10);

    let hotHitter = hitter;
    for (let i = 0; i < 3; i += 1) {
      hotHitter = updatePlayerFormAfterGame(hotHitter, bigGame);
    }
    expect(['hot', 'blazing']).toContain(hotHitter.formState);
    expect(getFormStatModifiers(hotHitter.formState).contactDelta).toBeGreaterThan(0);

    let coldHitter = hitter;
    for (let i = 0; i < 4; i += 1) {
      coldHitter = updatePlayerFormAfterGame(coldHitter, slumpGame);
    }
    expect(['cold', 'frozen']).toContain(coldHitter.formState);
    expect(getFormStatModifiers(coldHitter.formState).contactDelta).toBeLessThan(0);

    const busted = applySlumpBuster(coldHitter, 40);
    expect(busted.formScore).toBeGreaterThan(coldHitter.formScore);

    // Pitcher game form check
    const pitcherDelta = computeGameFormDelta(true, {
      ...createEmptySeasonStats(),
      games: 1,
      inningsPitchedOuts: 18,
      earnedRuns: 0,
      pitchingStrikeouts: 8,
      wins: 1,
    });
    expect(pitcherDelta).toBeGreaterThan(20);
  });
});
