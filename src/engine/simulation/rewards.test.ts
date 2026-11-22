import { describe, expect, it } from 'vitest';
import { createClub, type CreateClubOptions } from '../gm/rosterFactory';
import { createManagerProfile } from '../models/manager';
import { createSeededRng } from '../rng/seededRng';
import { simFullGame } from './baseballEngine';
import {
  applyPostGameProgression,
  calculatePostGameRewards,
  selectGameMvp,
} from './rewards';

const AWAY_OPTS: CreateClubOptions = {
  id: 'club-rewards-away',
  city: 'Comet',
  name: 'Blazers',
  mascot: 'Fox',
  colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'CB' },
  leagueTier: 'rookie',
  isHuman: false,
};

const HOME_OPTS: CreateClubOptions = {
  id: 'club-rewards-home',
  city: 'Sandlot',
  name: 'Comets',
  mascot: 'Rocket Dog',
  colors: { primary: '#1D63B8', secondary: '#0F2B46', accent: '#FFD166', monogram: 'SC' },
  leagueTier: 'rookie',
  isHuman: true,
};

describe('Post-Game MVP & Rewards Engine', () => {
  it('selects a valid Game MVP from participants on the field with a summary', () => {
    const away = createClub(createSeededRng(101), AWAY_OPTS);
    const home = createClub(createSeededRng(202), HOME_OPTS);
    const result = simFullGame(away, home, 1994);

    const mvp = selectGameMvp(result, away, home);
    const allIds = new Set([...away.roster, ...home.roster].map((p) => p.id));

    expect(allIds.has(mvp.playerId)).toBe(true);
    expect([away.id, home.id]).toContain(mvp.clubId);
    expect(mvp.playerName.length).toBeGreaterThan(2);
    expect(mvp.summary.length).toBeGreaterThan(3);
    expect(mvp.impactScore).toBeGreaterThan(0);
  });

  it('awards higher cash, hype, and manager XP for a win than a loss', () => {
    const away = createClub(createSeededRng(303), AWAY_OPTS);
    const home = createClub(createSeededRng(404), HOME_OPTS);
    const result = simFullGame(away, home, 2025);

    const homeWon = result.winnerClubId === home.id;
    const winRewards = calculatePostGameRewards(home, result, true, true);
    const lossRewards = calculatePostGameRewards(home, result, true, false);

    expect(winRewards.attendance).toBeGreaterThan(0);
    expect(winRewards.cashDelta).toBeGreaterThan(lossRewards.cashDelta);
    expect(winRewards.managerXp).toBeGreaterThan(lossRewards.managerXp);
    expect(winRewards.hypeDelta).toBeGreaterThan(lossRewards.hypeDelta);
    expect(Object.keys(winRewards.playerXpById).length).toBeGreaterThanOrEqual(9);

    // Ensure away rewards still compute positive gate/travel baseline
    const awayRewards = calculatePostGameRewards(away, result, false, !homeWon);
    expect(awayRewards.cashDelta).toBeGreaterThan(0);
  });

  it('levels up players and manager when XP crosses thresholds and updates club state', () => {
    const away = createClub(createSeededRng(505), AWAY_OPTS);
    const home = createClub(createSeededRng(606), HOME_OPTS);
    const preLeveledHome = {
      ...home,
      roster: home.roster.map((player, index) =>
        index === 0 ? { ...player, xp: 95, level: 1, skillPoints: 1 } : player,
      ),
    };
    const manager = { ...createManagerProfile({ name: 'Skip', avatarSeed: 9 }), xp: 115 };
    const result = simFullGame(away, preLeveledHome, 777);
    const won = result.winnerClubId === preLeveledHome.id;
    const rewards = calculatePostGameRewards(preLeveledHome, result, true, won);
    rewards.playerXpById[preLeveledHome.roster[0].id] = 40;

    const updated = applyPostGameProgression(
      preLeveledHome,
      manager,
      rewards,
      result.playerStatDeltas,
      won,
    );

    expect(updated.club.economy.cash).toBe(preLeveledHome.economy.cash + rewards.cashDelta);
    expect(updated.club.wins + updated.club.losses).toBe(1);

    const leveledPlayer = updated.club.roster[0];
    expect(leveledPlayer.level).toBe(2);
    expect(leveledPlayer.skillPoints).toBe(2);

    expect(updated.manager.level).toBeGreaterThanOrEqual(2);
    expect(updated.manager.wins + updated.manager.losses).toBe(1);
  });

  it('scales earned XP by xpGrowthMultiplier and respects statCaps when leveling up', () => {
    const away = createClub(createSeededRng(810), AWAY_OPTS);
    const home = createClub(createSeededRng(811), HOME_OPTS);
    const rookie = {
      ...home.roster[0],
      xpGrowthMultiplier: 1.35,
      xp: 90,
      level: 1,
      statCaps: { ...home.roster[0].statCaps, contact: home.roster[0].ratings.contact },
    };
    const veteran = {
      ...home.roster[1],
      xpGrowthMultiplier: 0.3,
    };
    const modHome = {
      ...home,
      roster: [rookie, veteran, ...home.roster.slice(2)],
    };
    const result = simFullGame(away, modHome, 888);
    result.playerStatDeltas[rookie.id] = { ...rookie.seasonStats, games: 1, hits: 2, rbis: 2 };
    result.playerStatDeltas[veteran.id] = { ...veteran.seasonStats, games: 1, hits: 2, rbis: 2 };

    const rewards = calculatePostGameRewards(modHome, result, true, true);
    expect(rewards.playerXpById[rookie.id]).toBeGreaterThan(rewards.playerXpById[veteran.id]);

    const after = applyPostGameProgression(modHome, createManagerProfile({ name: 'Skip', avatarSeed: 1 }), rewards, result.playerStatDeltas, true);
    expect(after.club.roster[0].ratings.contact).toBe(rookie.statCaps.contact);

    // Total rating budget cap also prevents unbounded passive level-up inflation
    const cappedTotal =
      rookie.ratings.contact +
      rookie.ratings.power +
      rookie.ratings.eye +
      rookie.ratings.bunt +
      rookie.ratings.speed +
      rookie.ratings.fielding +
      rookie.ratings.arm;
    const tightBudgetRookie = { ...rookie, totalRatingBudget: cappedTotal };
    const tightHome = { ...modHome, roster: [tightBudgetRookie, ...modHome.roster.slice(1)] };
    const afterTight = applyPostGameProgression(
      tightHome,
      createManagerProfile({ name: 'Skip', avatarSeed: 1 }),
      rewards,
      result.playerStatDeltas,
      true,
    );
    const r = afterTight.club.roster[0].ratings;
    const afterSum = r.contact + r.power + r.eye + r.bunt + r.speed + r.fielding + r.arm;
    expect(afterSum).toBeLessThanOrEqual(tightBudgetRookie.totalRatingBudget);
  });
});
