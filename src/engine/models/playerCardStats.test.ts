import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  buildFallbackCardStatRows,
  buildPlayerCardStatProfile,
} from './playerCardStats';

describe('Role-Specific Baseball Card Stats (TASK-063)', () => {
  it('returns pitcher-specific rating rows and pitching stat line for SP and RP', () => {
    const sp = createPlayer(createSeededRng(101), { position: 'SP', tier: 'aa' });
    const rp = createPlayer(createSeededRng(102), { position: 'RP', tier: 'aa' });

    const spProfile = buildPlayerCardStatProfile(sp);
    const rpProfile = buildPlayerCardStatProfile(rp);

    expect(spProfile.roleGroup).toBe('pitcher');
    expect(rpProfile.roleGroup).toBe('pitcher');

    const spLabels = spProfile.ratings.map((row) => row.label);
    expect(spLabels).toEqual(['Velocity', 'Movement', 'Control', 'Stamina', 'Clutch']);
    expect(spLabels).not.toContain('Contact');
    expect(spLabels).not.toContain('Power');
    expect(spLabels).not.toContain('Speed');

    expect(spProfile.ratings[0].value).toBe(sp.ratings.velocity);
    expect(spProfile.ratings[1].value).toBe(sp.ratings.movement);
    expect(spProfile.ratings[2].value).toBe(sp.ratings.control);
    expect(spProfile.ratings[3].value).toBe(sp.ratings.stamina);
    expect(spProfile.ratings[4].value).toBe(sp.ratings.clutch);

    expect(spProfile.statLine).toMatch(/ERA /);
    expect(spProfile.statLine).toMatch(/WHIP /);
    expect(spProfile.statLine).toMatch(/K\/9 /);
    expect(spProfile.statLine).toMatch(/Strk /);
  });

  it('returns batter/fielder-specific 5-tool rating rows and batting/fielding stat line for position players', () => {
    const cf = createPlayer(createSeededRng(201), { position: 'CF', tier: 'aa' });
    const catcher = createPlayer(createSeededRng(202), { position: 'C', tier: 'aa' });

    const cfProfile = buildPlayerCardStatProfile(cf);
    const cProfile = buildPlayerCardStatProfile(catcher);

    expect(cfProfile.roleGroup).toBe('position_player');
    expect(cProfile.roleGroup).toBe('position_player');

    const labels = cfProfile.ratings.map((row) => row.label);
    expect(labels).toEqual(['Contact', 'Power', 'Speed', 'Fielding', 'Arm']);
    expect(labels).not.toContain('Pitching');
    expect(labels).not.toContain('Velocity');
    expect(labels).not.toContain('Stamina');

    expect(cfProfile.ratings[0].value).toBe(cf.ratings.contact);
    expect(cfProfile.ratings[1].value).toBe(cf.ratings.power);
    expect(cfProfile.ratings[2].value).toBe(cf.ratings.speed);
    expect(cfProfile.ratings[3].value).toBe(cf.ratings.fielding);
    expect(cfProfile.ratings[4].value).toBe(cf.ratings.arm);

    expect(cfProfile.statLine).toMatch(/AVG /);
    expect(cfProfile.statLine).toMatch(/OBP /);
    expect(cfProfile.statLine).toMatch(/OPS /);
    expect(cfProfile.statLine).toMatch(/FPCT /);
  });

  it('derives distinct pitcher vs batter/fielder fallback stat rows for lightweight showcase cards', () => {
    const pitcherRows = buildFallbackCardStatRows('SP', {
      contact: 55,
      power: 50,
      speed: 68,
      pitching: 94,
      fielding: 78,
    });
    const batterRows = buildFallbackCardStatRows('SS', {
      contact: 86,
      power: 72,
      speed: 91,
      pitching: 44,
      fielding: 89,
    });

    expect(pitcherRows.map((r) => r.label)).toEqual([
      'Velocity',
      'Movement',
      'Control',
      'Stamina',
      'Fielding',
    ]);
    expect(batterRows.map((r) => r.label)).toEqual([
      'Contact',
      'Power',
      'Speed',
      'Fielding',
      'Arm',
    ]);
    const rpRows = buildFallbackCardStatRows('RP', {
      contact: 50,
      power: 45,
      speed: 65,
      pitching: 90,
      fielding: 74,
    });
    expect(rpRows[3].label).toBe('Stamina');
    expect(rpRows[3].value).toBeLessThan(pitcherRows[3].value);
    expect(pitcherRows.every((r) => r.value >= 1 && r.value <= 99)).toBe(true);
    expect(batterRows.every((r) => r.value >= 1 && r.value <= 99)).toBe(true);
  });
});
