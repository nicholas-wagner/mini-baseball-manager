import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  applyExhibitionDuelRewards,
  buildGuestBossClub,
  GUEST_BOSS_PRESETS,
  runFriendExhibitionDuel,
} from './exhibitionDuel';

function makeHumanClub(seed: number) {
  return createClub(createSeededRng(seed), {
    id: `human-${seed}`,
    isHuman: true,
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
  });
}

describe('Serverless Pass-and-Play Friend Boss Exhibition Duel (100X)', () => {
  it('generates 3 iconic retro 90s Guest Boss clubs deterministically for instant solo or pass-and-play duels', () => {
    expect(GUEST_BOSS_PRESETS).toHaveLength(3);
    const bossA = buildGuestBossClub('cyber_sluggers_94', 'rookie', 9001);
    const bossB = buildGuestBossClub('cyber_sluggers_94', 'rookie', 9001);
    expect(bossA.name).toBe(bossB.name);
    expect(bossA.roster.length).toBeGreaterThanOrEqual(15);
    expect(bossA.lineup).toHaveLength(9);
    expect(bossA.isHuman).toBe(false);

    const osaka = buildGuestBossClub('osaka_kitsune', 'aa', 9002);
    expect(osaka.leagueTier).toBe('aa');
    expect(osaka.roster.every((p) => p.nationalityId === 'JPN')).toBe(true);
  });

  it('simulates a full deterministic Exhibition Duel with highlights, MVP, and shareable box score summary', () => {
    const human = makeHumanClub(4201);
    const boss = buildGuestBossClub('huracan_allstars', 'rookie', 4202);

    const duel1 = runFriendExhibitionDuel(human, boss, { innings: 5, seed: 7777 });
    const duel2 = runFriendExhibitionDuel(human, boss, { innings: 5, seed: 7777 });

    expect(duel1.homeScore).toBe(duel2.homeScore);
    expect(duel1.awayScore).toBe(duel2.awayScore);
    expect(duel1.winnerName).toBe(duel2.winnerName);
    expect(duel1.inningsPlayed).toBeGreaterThanOrEqual(5);
    expect(duel1.highlights.length).toBeGreaterThan(0);
    expect(duel1.mvpName.length).toBeGreaterThan(0);
    expect(duel1.shareableSummary).toContain(human.name);
    expect(duel1.shareableSummary).toContain(boss.name);

    const rewarded = applyExhibitionDuelRewards(human, duel1);
    expect(rewarded.economy.cash).toBe(human.economy.cash + duel1.rewardCash);
    expect(rewarded.economy.teamHype).toBeGreaterThanOrEqual(human.economy.teamHype);
  });
});
