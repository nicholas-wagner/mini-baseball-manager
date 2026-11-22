import { describe, expect, it } from 'vitest';
import { createEmptySeasonStats } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  advanceCareerServiceForSeason,
  computeCareerExperienceScore,
  deriveExperienceTier,
  evaluateVeteranSavvyEdge,
  rollInitialCareerService,
  updateCareerServiceAfterGame,
  xpRequiredForNextLevel,
} from './careerExperience';

describe('Slow-Earned Career Experience & Veteran Savvy Advantage (TASK-060)', () => {
  it('starts rookies green (0 seasons) and veterans as cagey veterans with realistic mileage', () => {
    const rng = createSeededRng(2026060);
    const rookie = rollInitialCareerService(rng, 'rookie', 19, 'CF');
    const avg = rollInitialCareerService(rng, 'average', 25, '2B');
    const vet = rollInitialCareerService(rng, 'veteran', 34, 'SP');

    expect(rookie.seasonsPlayed).toBe(0);
    expect(rookie.experienceTier).toBe('rookie_green');
    expect(rookie.experienceScore).toBeLessThan(15);

    expect(avg.seasonsPlayed).toBeGreaterThanOrEqual(2);
    expect(vet.seasonsPlayed).toBeGreaterThanOrEqual(6);
    expect(vet.experienceTier).toBe('cagey_veteran');
    expect(vet.experienceScore).toBeGreaterThanOrEqual(70);
  });

  it('requires multiple full seasons of games and plate appearances to reach cagey_veteran', () => {
    let service = rollInitialCareerService(createSeededRng(10), 'rookie', 19, 'SS');
    let careerStats = createEmptySeasonStats();

    // 1 single game barely budges experienceScore
    careerStats = { ...careerStats, games: 1, plateAppearances: 4, atBats: 4 };
    const afterOneGame = updateCareerServiceAfterGame(service, careerStats, false);
    expect(afterOneGame.experienceScore - service.experienceScore).toBeLessThanOrEqual(2);
    expect(afterOneGame.experienceTier).toBe('rookie_green');

    // Simulate 5 full 21-game seasons (~84 PA/season)
    service = afterOneGame;
    for (let season = 0; season < 5; season += 1) {
      careerStats = {
        ...careerStats,
        games: careerStats.games + 21,
        plateAppearances: careerStats.plateAppearances + 84,
        atBats: careerStats.atBats + 74,
      };
      service = advanceCareerServiceForSeason(
        updateCareerServiceAfterGame(service, careerStats, season >= 3),
        careerStats,
      );
    }

    expect(service.seasonsPlayed).toBe(5);
    expect(service.experienceScore).toBeGreaterThanOrEqual(65);
    expect(['seasoned', 'cagey_veteran']).toContain(service.experienceTier);

    // 6th full season firmly cements cagey_veteran
    careerStats = {
      ...careerStats,
      games: careerStats.games + 21,
      plateAppearances: careerStats.plateAppearances + 84,
      atBats: careerStats.atBats + 74,
    };
    service = advanceCareerServiceForSeason(
      updateCareerServiceAfterGame(service, careerStats, true),
      careerStats,
    );
    expect(service.experienceTier).toBe('cagey_veteran');

    expect(deriveExperienceTier(10)).toBe('rookie_green');
    expect(deriveExperienceTier(25)).toBe('developing');
    expect(deriveExperienceTier(55)).toBe('seasoned');
    expect(deriveExperienceTier(80)).toBe('cagey_veteran');
    expect(computeCareerExperienceScore(0, createEmptySeasonStats(), 0)).toBe(0);
  });

  it('grants seasoned veterans a subtle Eye/Control and high-LI composure edge over green rookies and uses slower level XP curve', () => {
    const rookieEdgeLow = evaluateVeteranSavvyEdge('rookie_green', 0.9);
    const rookieEdgeHigh = evaluateVeteranSavvyEdge('rookie_green', 2.2);
    const vetEdgeLow = evaluateVeteranSavvyEdge('cagey_veteran', 0.9);
    const vetEdgeHigh = evaluateVeteranSavvyEdge('cagey_veteran', 2.2);

    expect(vetEdgeLow.eyeDelta).toBeGreaterThan(rookieEdgeLow.eyeDelta);
    expect(vetEdgeLow.controlDelta).toBeGreaterThan(rookieEdgeLow.controlDelta);
    expect(vetEdgeLow.eyeDelta).toBeLessThanOrEqual(3); // subtle, never overpowering!
    expect(vetEdgeHigh.composureDelta).toBeGreaterThan(0);
    expect(rookieEdgeHigh.composureDelta).toBeLessThan(0); // subtle rookie jitters in huge moments
    expect(vetEdgeLow.rustMultiplier).toBeLessThan(1.0);

    expect(xpRequiredForNextLevel(1)).toBe(200);
    expect(xpRequiredForNextLevel(2)).toBe(400);
    expect(xpRequiredForNextLevel(5)).toBe(1000);
  });
});
