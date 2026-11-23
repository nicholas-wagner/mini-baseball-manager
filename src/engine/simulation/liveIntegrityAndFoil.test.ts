import { describe, expect, it } from 'vitest';
import { applyFoilPackRewardsToClub, type OpenedFoilPackResult } from '../events/foilPacks';
import { generateSixTierWorld } from '../league/seasonEngine';
import {
  buildPlayerStatDeltas,
  createGameSession,
  simRemainingGame,
  stepHalfInning,
} from './baseballEngine';

function makeWorld(seed = 1994) {
  return generateSixTierWorld(seed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
}

describe('Live Integrity, Fatigue Carryover, Caught Stealing & Foil Pack Prospect XP', () => {
  it('simRemainingGame continues from an active mid-game session instead of resetting to 0-0 inning 1', () => {
    const world = makeWorld(1994);
    const away = world.leagues.rookie[1];
    const home = world.leagues.rookie[0];
    const start = createGameSession(away, home, 1994, 'playoff_game', 5);
    const mid = stepHalfInning(start).nextSession;

    // Give home a big mid-game cushion so we can prove simRemainingGame preserves it!
    const riggedMid = {
      ...mid,
      inning: 4,
      home: { ...mid.home, score: 12 },
    };
    const finished = simRemainingGame(riggedMid);

    expect(finished.finalState.status).toBe('completed');
    expect(finished.homeScore).toBeGreaterThanOrEqual(12);
    expect(finished.finalState.gamePressureLevel).toBe('playoff_game');
    expect(finished.events.length).toBeGreaterThan(0);
  });

  it('carries over scaled starting pitcher fatigue when a gassed starter takes the mound, while fresh starters start at 0', () => {
    const world = makeWorld(2026);
    const away = world.leagues.rookie[1];
    const home = world.leagues.rookie[0];
    const freshSession = createGameSession(away, home, 100, 'regular', 5);
    expect(freshSession.home.pitcherFatigue).toBe(0);

    const starterId = home.rotationIds[home.rotationCursor % home.rotationIds.length];
    const gassedHome = {
      ...home,
      roster: home.roster.map((p) => (p.id === starterId ? { ...p, fatigue: 70 } : p)),
    };
    const gassedSession = createGameSession(away, gassedHome, 100, 'regular', 5);
    expect(gassedSession.home.pitcherFatigue).toBeGreaterThanOrEqual(35);
    expect(gassedSession.home.pitcherFatigue).toBeLessThanOrEqual(55);
  });

  it('copies caughtStealing into PlayerSeasonStats deltas', () => {
    const world = makeWorld(1994);
    const session = createGameSession(world.leagues.rookie[1], world.leagues.rookie[0], 1994, 'regular', 5);
    const leadoffId = session.away.lineup[0].playerId;
    session.boxScore.awayBatters[leadoffId].caughtStealing = 2;

    const deltas = buildPlayerStatDeltas(session.boxScore);
    expect(deltas[leadoffId].caughtStealing).toBe(2);
  });

  it('targets a rising young prospect for Foil Pack training cards and triggers immediate level-ups when XP crosses threshold', () => {
    const world = makeWorld(1994);
    const baseClub = world.leagues.rookie[0];
    // Make roster[0] a high-level veteran and roster[4] a young rookie right near level-up!
    const youngId = baseClub.roster[4].id;
    const club = {
      ...baseClub,
      roster: baseClub.roster.map((p, idx) =>
        idx === 0
          ? { ...p, age: 34, level: 8, xp: 0, xpGrowthMultiplier: 0.7 }
          : idx === 4
            ? { ...p, age: 19, level: 1, xp: 150, skillPoints: 0, xpGrowthMultiplier: 1.4 }
            : { ...p, age: 29, level: 5, xp: 0, xpGrowthMultiplier: 1.0 },
      ),
    };

    const fakePack: OpenedFoilPackResult = {
      tier: 'sandlot_foil',
      tierLabel: '1994 Sandlot Foil Pack',
      cards: [
        { slot: 1, kind: 'cash_windfall', rarity: 'common', title: '+$500', subtitle: 'Cash', cashBonus: 500 },
        {
          slot: 2,
          kind: 'training_xp',
          rarity: 'rare',
          title: '90s Batting-Cage Pass (+80 XP, +1 SP)',
          subtitle: 'Boost',
          xpBonus: 80,
          spBonus: 1,
        },
        { slot: 3, kind: 'hype_ticket', rarity: 'common', title: '+10 Hype', subtitle: 'Hype', hypeBonus: 10 },
      ],
    };

    const applied = applyFoilPackRewardsToClub(club, fakePack);
    const boostedYoung = applied.club.roster.find((p) => p.id === youngId)!;
    expect(boostedYoung.level).toBeGreaterThan(1);
    expect(boostedYoung.skillPoints).toBeGreaterThanOrEqual(2);
    expect(applied.summaryLines.some((line) => line.includes(boostedYoung.name))).toBe(true);
  });
});
