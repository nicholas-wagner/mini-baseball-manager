import { describe, expect, it } from 'vitest';
import {
  evaluateUnlockablesProgress,
  UNLOCKABLES_CATALOG,
} from './unlockables';

describe('Unlockables Gallery & Cosmetic Unlocks (TASK-048)', () => {
  it('progressively unlocks throwback uniforms, bat VFX skins, stadium themes & secret nodes', () => {
    expect(UNLOCKABLES_CATALOG.length).toBeGreaterThanOrEqual(12);

    const fresh = evaluateUnlockablesProgress({
      leagueTier: 'rookie',
      careerWins: 0,
      championshipsWon: 0,
      retiredNumbersCount: 0,
      wonHomeRunDerby: false,
      wonGlobalCup: false,
    });
    expect(fresh.unlocked).toHaveLength(0);
    expect(fresh.completionPct).toBe(0);

    const midCareer = evaluateUnlockablesProgress({
      leagueTier: 'aa',
      careerWins: 18,
      championshipsWon: 1,
      retiredNumbersCount: 1,
      wonHomeRunDerby: true,
      wonGlobalCup: false,
    });
    expect(midCareer.unlocked.length).toBeGreaterThan(5);
    expect(midCareer.unlocked.some((u) => u.id === 'vfx_gold_bat')).toBe(true);
    expect(midCareer.unlocked.some((u) => u.id === 'theme_classic_brick')).toBe(true);
    expect(midCareer.locked.some((u) => u.id === 'vfx_sakura_bat')).toBe(true);

    const legend = evaluateUnlockablesProgress({
      leagueTier: 'majors',
      careerWins: 100,
      championshipsWon: 3,
      retiredNumbersCount: 4,
      wonHomeRunDerby: true,
      wonGlobalCup: true,
    });
    expect(legend.unlocked).toHaveLength(UNLOCKABLES_CATALOG.length);
    expect(legend.completionPct).toBe(100);
  });
});
