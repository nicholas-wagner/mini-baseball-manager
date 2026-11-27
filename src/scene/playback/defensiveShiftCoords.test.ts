import { describe, expect, it } from 'vitest';
import { DIAMOND_DEFENDER_COORDS } from './eventChoreographer';
import { OUTFIELD_STARTS } from './diamondLayout';
import { getShiftDefenderCoords } from './defensiveShiftCoords';

describe('TASK-118 — Pure 3D Defensive Shift Coordinates (defensiveShiftCoords)', () => {
  it('matches DIAMOND_DEFENDER_COORDS and OUTFIELD_STARTS exactly for standard alignment with empty bases', () => {
    const coords = getShiftDefenderCoords('standard');
    for (const entry of DIAMOND_DEFENDER_COORDS) {
      expect(coords[entry.pos]).toEqual({ x: entry.x, y: entry.y, z: entry.z });
    }
    expect(coords.LF).toEqual(OUTFIELD_STARTS.LF);
    expect(coords.CF).toEqual(OUTFIELD_STARTS.CF);
    expect(coords.RF).toEqual(OUTFIELD_STARTS.RF);
  });

  it('brings all 4 infielders noticeably closer to home plate on infield_in', () => {
    const standard = getShiftDefenderCoords('standard');
    const infieldIn = getShiftDefenderCoords('infield_in');

    for (const pos of ['1B', '2B', 'SS', '3B'] as const) {
      const dz = infieldIn[pos].z - standard[pos].z;
      expect(dz).toBeGreaterThanOrEqual(2.8);
      expect(dz).toBeLessThanOrEqual(3.4);
    }
    // Outfielders remain unchanged on infield_in
    expect(infieldIn.LF).toEqual(standard.LF);
    expect(infieldIn.CF).toEqual(standard.CF);
    expect(infieldIn.RF).toEqual(standard.RF);
  });

  it('pushes outfielders deeper toward the warning track and widens 1B/3B toward the foul lines on no_doubles', () => {
    const standard = getShiftDefenderCoords('standard');
    const noDoubles = getShiftDefenderCoords('no_doubles');

    for (const pos of ['LF', 'CF', 'RF'] as const) {
      expect(noDoubles[pos].z).toBeCloseTo(standard[pos].z - 3.6, 5);
    }
    expect(Math.abs(noDoubles['1B'].x) - Math.abs(standard['1B'].x)).toBeCloseTo(1.4, 5);
    expect(Math.abs(noDoubles['3B'].x) - Math.abs(standard['3B'].x)).toBeCloseTo(1.4, 5);
  });

  it('charges 1B/3B aggressively toward home, shades 2B toward 1B, and moves SS toward 2B on bunt_defense', () => {
    const standard = getShiftDefenderCoords('standard');
    const bunt = getShiftDefenderCoords('bunt_defense');

    expect(bunt['1B'].z - standard['1B'].z).toBeCloseTo(4.4, 5);
    expect(bunt['3B'].z - standard['3B'].z).toBeCloseTo(4.4, 5);
    expect(Math.abs(bunt['1B'].x)).toBeLessThan(Math.abs(standard['1B'].x));
    expect(Math.abs(bunt['3B'].x)).toBeLessThan(Math.abs(standard['3B'].x));

    // 2B shades toward 1B (+x, +z); SS shades toward 2B (closer to x=0)
    expect(bunt['2B'].x).toBeGreaterThan(standard['2B'].x);
    expect(bunt['2B'].z).toBeGreaterThan(standard['2B'].z);
    expect(Math.abs(bunt.SS.x)).toBeLessThan(Math.abs(standard.SS.x));
  });

  it('shifts 1B to hold the bag whenever bases[0] is occupied and returns fresh immutable vectors', () => {
    const withRunner1B = getShiftDefenderCoords('standard', ['runner-1', null, null]);
    expect(withRunner1B['1B']).toEqual({ x: 9.2, y: 0.04, z: -10.1 });

    const noRunner1B = getShiftDefenderCoords('standard', [null, 'runner-2', null]);
    expect(noRunner1B['1B']).toEqual({ x: 8.8, y: 0.04, z: -11.4 });

    // Mutating returned object never corrupts subsequent calls
    withRunner1B['1B'].x = 999;
    expect(getShiftDefenderCoords('standard', ['runner-1', null, null])['1B'].x).toBe(9.2);
  });
});
