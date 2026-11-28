import { describe, expect, it } from 'vitest';
import { createEmptySeasonStats } from '../models/player';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  awardDisciplineMasteryFromGame,
  awardDisciplineMasteryFromPractice,
  awardDisciplineMasteryFromStatDelta,
  checkNodeMasteryGate,
  getDisciplinesForPlayer,
  getNodeMasteryDiscipline,
  getNodeMasteryRequirement,
  resolvePlayerSkillMastery,
} from './skillTreeMastery';
import { canUnlockSkillNode } from './skillTrees';

describe('Skyrim-Inspired Baseball Discipline Mastery (TASK-133)', () => {
  it('maps nodes to disciplines and enforces brisk Tier 1 (0), Tier 2 (20), Tier 3 (50) gates', () => {
    expect(getNodeMasteryDiscipline('b_pwr_1')).toBe('power');
    expect(getNodeMasteryDiscipline('cap_moonshot_bomb')).toBe('power');
    expect(getNodeMasteryDiscipline('p_spin_2')).toBe('spin');
    expect(getNodeMasteryDiscipline('cap_ice_veins')).toBe('command');
    expect(getNodeMasteryDiscipline('cap_cannon_arm')).toBe('fielding');

    expect(getNodeMasteryRequirement('b_pwr_1')).toBe(0);
    expect(getNodeMasteryRequirement('b_pwr_2')).toBe(20);
    expect(getNodeMasteryRequirement('cap_moonshot_bomb')).toBe(50);
  });

  it('grows discipline mastery naturally from game box scores and practice drills without grind', () => {
    const rookie = createPlayer(createSeededRng(1331), {
      position: 'CF',
      tier: 'rookie',
      marketTier: 'rookie',
    });
    const lowMastery = {
      ...rookie,
      skillMastery: { power: 10, contact: 10, speed: 10, fielding: 10, heat: 0, spin: 0, command: 0 },
    };

    expect(checkNodeMasteryGate(lowMastery, 'b_pwr_1').met).toBe(true);
    expect(checkNodeMasteryGate(lowMastery, 'b_pwr_2').met).toBe(false);

    // Big game with 2 HRs + 2 SBs rapidly builds power & speed mastery
    const afterGame = awardDisciplineMasteryFromGame(lowMastery, {
      playerId: rookie.id,
      atBats: 4,
      hits: 3,
      doubles: 1,
      triples: 0,
      homeRuns: 2,
      rbis: 4,
      runs: 2,
      walks: 1,
      strikeouts: 0,
      stolenBases: 2,
      caughtStealing: 0,
      sacFlies: 0,
    });
    expect(resolvePlayerSkillMastery(afterGame).power).toBeGreaterThanOrEqual(20);
    expect(resolvePlayerSkillMastery(afterGame).speed).toBeGreaterThanOrEqual(20);
    expect(checkNodeMasteryGate(afterGame, 'b_pwr_2').met).toBe(true);

    // Practice drill gives focused +6 mastery jump
    const afterPractice = awardDisciplineMasteryFromPractice(lowMastery, 'power_launch_cage');
    expect(resolvePlayerSkillMastery(afterPractice).power).toBe(16);
  });

  it('preserves unlocked nodes on legacy saves by flooring mastery to already-unlocked tiers', () => {
    const vet = createPlayer(createSeededRng(1332), { position: 'SP', tier: 'aa' });
    const legacy = {
      ...vet,
      skillMastery: undefined,
      unlockedSkillIds: ['p_heat_1', 'p_heat_2', 'cap_blazing_comet'],
    };
    const resolved = resolvePlayerSkillMastery(legacy);
    expect(resolved.heat).toBeGreaterThanOrEqual(50);
  });

  it('gates Tier 2+ skill unlocks when explicit skillMastery is below threshold and grows via post-game stat deltas', () => {
    const rookie = createPlayer(createSeededRng(1333), {
      position: 'RF',
      tier: 'rookie',
      marketTier: 'rookie',
    });
    const gated = {
      ...rookie,
      skillPoints: 10,
      unlockedSkillIds: ['b_pwr_1'],
      skillMastery: { power: 14, contact: 10, speed: 10, fielding: 10, heat: 0, spin: 0, command: 0 },
    };
    const blocked = canUnlockSkillNode(gated, 'b_pwr_2');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/Mastery 20/i);

    const grown = awardDisciplineMasteryFromStatDelta(gated, {
      ...createEmptySeasonStats(),
      games: 1,
      plateAppearances: 4,
      atBats: 4,
      hits: 3,
      doubles: 1,
      homeRuns: 1,
      rbis: 3,
      stolenBases: 1,
      putouts: 2,
    });
    expect(resolvePlayerSkillMastery(grown).power).toBeGreaterThanOrEqual(20);
    expect(canUnlockSkillNode(grown, 'b_pwr_2').allowed).toBe(true);

    // Pitchers grow heat/spin/command mastery via game pitcher lines & stat deltas + clean innings
    const pitcher = createPlayer(createSeededRng(1334), { position: 'SP', tier: 'rookie', marketTier: 'rookie' });
    const lowPitcher = {
      ...pitcher,
      skillMastery: { power: 0, contact: 0, speed: 0, fielding: 0, heat: 5, spin: 5, command: 5 },
    };
    const afterPitchGame = awardDisciplineMasteryFromGame(lowPitcher, null, {
      playerId: pitcher.id,
      outsRecorded: 12,
      pitchesThrown: 55,
      strikeouts: 6,
      walks: 0,
    });
    expect(resolvePlayerSkillMastery(afterPitchGame).heat).toBeGreaterThan(15);
    expect(resolvePlayerSkillMastery(afterPitchGame).command).toBeGreaterThan(15);

    const afterPitchDelta = awardDisciplineMasteryFromStatDelta(lowPitcher, {
      ...createEmptySeasonStats(),
      inningsPitchedOuts: 9,
      pitchesThrown: 42,
      pitchingStrikeouts: 5,
      pitchingWalks: 2,
    });
    expect(resolvePlayerSkillMastery(afterPitchDelta).spin).toBeGreaterThan(12);

    // Null delta, zero-work line, unknown practice activity, and role discipline lookup
    expect(awardDisciplineMasteryFromStatDelta(lowPitcher, null).skillMastery).toEqual(lowPitcher.skillMastery);
    expect(awardDisciplineMasteryFromGame(lowPitcher, { atBats: 0, walks: 0 }, { outsRecorded: 0, pitchesThrown: 0 }).skillMastery).toEqual(lowPitcher.skillMastery);
    expect(awardDisciplineMasteryFromPractice(lowPitcher, 'unknown_drill')).toBe(lowPitcher);
    expect(getDisciplinesForPlayer(pitcher)).toEqual(['heat', 'spin', 'command']);
    expect(getDisciplinesForPlayer(rookie)).toEqual(['power', 'contact', 'speed', 'fielding']);
  });
});
