import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession } from './baseballEngine';
import {
  DEFENSIVE_SHIFTS,
  estimateHomeWinProbability,
  evaluateBullpenWarmup,
  tickBullpenWarmups,
} from './winProbability';

describe('Win Probability, Defensive Shifts & Bullpen Warmup Engine (TASK-038)', () => {
  it('computes accurate home win probability across score swings, late innings, runners, and completion', () => {
    const away = createClub(createSeededRng(381), {
      id: 'wp-away',
      isHuman: false,
      city: 'North',
      name: 'Bears',
      mascot: 'Bear',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'NB' },
      leagueTier: 'aa',
    });
    const home = createClub(createSeededRng(382), {
      id: 'wp-home',
      isHuman: true,
      city: 'South',
      name: 'Stars',
      mascot: 'Star',
      colors: { primary: '#0096C7', secondary: '#1B4332', accent: '#FFD166', monogram: 'SS' },
      leagueTier: 'aa',
    });

    const session = createGameSession(away, home, 3800, 'regular', 9);
    const startProb = estimateHomeWinProbability(session);
    expect(startProb).toBeGreaterThan(0.5);
    expect(startProb).toBeLessThan(0.62);

    // Home leads late -> high WP
    const homeLeadLate = {
      ...session,
      inning: 9,
      half: 'TOP' as const,
      outs: 2,
      home: { ...session.home, score: 5 },
      away: { ...session.away, score: 2 },
    };
    expect(estimateHomeWinProbability(homeLeadLate)).toBeGreaterThan(0.9);

    // Bases loaded for home in BOT 9 tied -> very high walk-off WP
    const walkOffThreat = {
      ...session,
      inning: 9,
      half: 'BOT' as const,
      outs: 0,
      bases: [home.roster[0].id, home.roster[1].id, home.roster[2].id] as [string, string, string],
    };
    expect(estimateHomeWinProbability(walkOffThreat)).toBeGreaterThan(0.75);

    // Away leads big late -> low home WP
    const awayLeadLate = {
      ...session,
      inning: 9,
      half: 'BOT' as const,
      outs: 2,
      home: { ...session.home, score: 1 },
      away: { ...session.away, score: 6 },
    };
    expect(estimateHomeWinProbability(awayLeadLate)).toBeLessThan(0.08);

    // Completed games return exact 1 or 0
    expect(
      estimateHomeWinProbability({ ...session, status: 'completed', winnerClubId: home.id }),
    ).toBe(1);
    expect(
      estimateHomeWinProbability({ ...session, status: 'completed', winnerClubId: away.id }),
    ).toBe(0);
  });

  it('tracks bullpen warmup readiness transitions and exposes all 4 defensive shifts', () => {
    expect(DEFENSIVE_SHIFTS.map((s) => s.id)).toEqual([
      'standard',
      'infield_in',
      'no_doubles',
      'bunt_defense',
    ]);

    expect(evaluateBullpenWarmup('rp-1', 0).status).toBe('cold');
    expect(evaluateBullpenWarmup('rp-1', 2).status).toBe('warming');
    expect(evaluateBullpenWarmup('rp-1', 5).status).toBe('hot');
    expect(evaluateBullpenWarmup('rp-1', 10).status).toBe('overcooked');

    const ticked = tickBullpenWarmups({ 'rp-1': 2 }, ['rp-1', 'rp-2']);
    expect(ticked['rp-1']).toBe(3);
    expect(ticked['rp-2']).toBe(1);
  });
});
