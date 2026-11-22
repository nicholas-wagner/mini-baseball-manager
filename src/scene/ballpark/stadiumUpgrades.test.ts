import { describe, expect, it } from 'vitest';
import { createInitialStadium } from '../../engine/models/club';
import {
  computeStadiumVisualSpec,
  createStadiumEvolutionOverlay,
} from './stadiumUpgrades';

describe('Visual 3D Stadium Evolution Engine (TASK-033)', () => {
  it('distinguishes Rookie Sandlot look-and-feel from Pro Major League multi-deck cathedrals & domes', () => {
    const sandlot = createInitialStadium('Backyard Sandlot', 'rookie', 'sandlot_commons');
    const sandlotSpec = computeStadiumVisualSpec('rookie', sandlot, ['turbo_fizz']);

    expect(sandlotSpec.architectureLabel).toBe('Neighborhood Sandlot');
    expect(sandlotSpec.fenceStyle).toBe('chain_link');
    expect(sandlotSpec.upperDeckCount).toBe(0);
    expect(sandlotSpec.hasJumbotron).toBe(false);
    expect(sandlotSpec.hasDomeTrusses).toBe(false);
    expect(sandlotSpec.billboards).toHaveLength(1);
    expect(sandlotSpec.billboards[0].title).toBe('TURBO FIZZ SODA');

    const majorsDome = createInitialStadium('Metro Colosseum', 'majors', 'neon_metro_dome');
    majorsDome.retiredNumbers = [{ jerseyNumber: 24, playerName: 'Kenji Sato' }];
    majorsDome.championshipPennants = [{ season: 1, leagueTier: 'majors' }];
    majorsDome.districtTiles[0].buildingId = 'nacho_cantina';

    const majorsSpec = computeStadiumVisualSpec('majors', majorsDome, ['turbo_fizz', 'pixel_pizza']);
    expect(majorsSpec.architectureLabel).toBe('Pro Major League Cathedral');
    expect(majorsSpec.upperDeckCount).toBe(2);
    expect(majorsSpec.hasLuxurySuites).toBe(true);
    expect(majorsSpec.hasDomeTrusses).toBe(true);
    expect(majorsSpec.hasJumbotron).toBe(true);
    expect(majorsSpec.hasMascotCannon).toBe(true);
    expect(majorsSpec.retiredNumbers).toHaveLength(1);
    expect(majorsSpec.pennantCount).toBe(1);
    expect(majorsSpec.skylineCount).toBeGreaterThanOrEqual(5);
  });

  it('constructs and disposes Three.js evolution meshes cleanly in Node/jsdom without WebGL', () => {
    const stadium = createInitialStadium('Grand Cathedral', 'majors', 'grand_cathedral');
    stadium.retiredNumbers = [
      { jerseyNumber: 7, playerName: 'Maya Ortiz' },
      { jerseyNumber: 42, playerName: 'Jackie Star' },
    ];
    stadium.championshipPennants = [{ season: 2, leagueTier: 'majors' }];

    const overlay = createStadiumEvolutionOverlay('majors', stadium, ['turbo_fizz']);
    expect(overlay.group.children.length).toBeGreaterThan(10);
    expect(() => overlay.dispose()).not.toThrow();
  });
});
