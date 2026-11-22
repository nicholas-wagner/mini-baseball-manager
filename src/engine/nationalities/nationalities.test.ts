import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import { NATIONALITIES_CATALOG } from './nationalitiesCatalog';
import {
  generatePlayerIdentity,
  getNationalityById,
  getTotalNationalityWeight,
  rollNationality,
} from './pickNationality';
import type { NationalityId } from './types';

describe('Global Nationalities & Cultural Heritage System', () => {
  it('defines all 11 requested nationalities summing to exactly 100% weight', () => {
    expect(NATIONALITIES_CATALOG).toHaveLength(11);
    expect(getTotalNationalityWeight()).toBe(100);
    expect(getNationalityById('USA').weight).toBe(50);

    const internationalIds: NationalityId[] = [
      'CAN',
      'JPN',
      'KOR',
      'MEX',
      'DOM',
      'PRI',
      'BRA',
      'ARG',
      'AUS',
      'IRL',
    ];
    for (const id of internationalIds) {
      const spec = getNationalityById(id);
      expect(spec.weight).toBe(5);
      expect(spec.firstNames.length).toBeGreaterThanOrEqual(6);
      expect(spec.lastNames.length).toBeGreaterThanOrEqual(6);
      expect(spec.hometowns.length).toBeGreaterThanOrEqual(4);
      expect(spec.heritageAbility.name.length).toBeGreaterThan(2);
      expect(spec.heritageAbility.mythOrAnimal.length).toBeGreaterThan(2);
    }
  });

  it('matches the 50% USA and 5% international distribution across 10,000 seeded rolls', () => {
    const rng = createSeededRng(199409);
    const counts: Record<string, number> = {};
    const sampleSize = 10_000;

    for (let i = 0; i < sampleSize; i += 1) {
      const nat = rollNationality(rng);
      counts[nat.id] = (counts[nat.id] ?? 0) + 1;
    }

    const usaShare = (counts.USA ?? 0) / sampleSize;
    expect(usaShare).toBeGreaterThan(0.48);
    expect(usaShare).toBeLessThan(0.52);

    for (const spec of NATIONALITIES_CATALOG) {
      if (spec.id === 'USA') continue;
      const share = (counts[spec.id] ?? 0) / sampleSize;
      expect(share).toBeGreaterThan(0.038);
      expect(share).toBeLessThan(0.062);
    }
  });

  it('generates culturally matched names and hometowns deterministically', () => {
    const a = generatePlayerIdentity(createSeededRng(77), 'IRL');
    const b = generatePlayerIdentity(createSeededRng(77), 'IRL');

    expect(a).toEqual(b);
    expect(a.nationality.id).toBe('IRL');
    expect(a.nationality.heritageAbility.name).toMatch(/leprechaun/i);
    expect(a.nationality.hometowns).toContain(a.hometown);

    const unforcedA = generatePlayerIdentity(createSeededRng(909));
    const unforcedB = generatePlayerIdentity(createSeededRng(909));
    expect(unforcedA).toEqual(unforcedB);
    expect(NATIONALITIES_CATALOG.map((n) => n.id)).toContain(unforcedA.nationality.id);
  });

  it('guards against empty catalogs and floating-point upper-bound rolls', () => {
    expect(() => rollNationality(createSeededRng(1), [])).toThrow(/cannot be empty/i);

    const maxBoundaryRng = {
      ...createSeededRng(1),
      next: () => 1,
    };
    const picked = rollNationality(maxBoundaryRng);
    expect(picked.id).toBe(NATIONALITIES_CATALOG[NATIONALITIES_CATALOG.length - 1].id);
  });

  it('assigns unique Cultural Heritage ability IDs to every nationality', () => {
    const ids = new Set(NATIONALITIES_CATALOG.map((n) => n.heritageAbility.id));
    expect(ids.size).toBe(NATIONALITIES_CATALOG.length);
  });
});
