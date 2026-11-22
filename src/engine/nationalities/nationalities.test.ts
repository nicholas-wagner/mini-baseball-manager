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
  it('allocates all 100 percentage points across the WBC field and the two legacy entries', () => {
    const expected: Record<NationalityId, number> = {
      USA: 50, CAN: 3, JPN: 3, KOR: 3, MEX: 3, DOM: 3, PRI: 3, AUS: 3,
      ITA: 3, NED: 3, TPE: 3, CUB: 3, VEN: 3, CHN: 2.5, PAN: 2,
      COL: 1.5, ISR: 1.5, BRA: 1, CZE: 1, GBR: 1, NCA: 1, RSA: 1,
      ESP: 0.5, ARG: 0.5, IRL: 0.5,
    };
    expect(Object.fromEntries(NATIONALITIES_CATALOG.map((n) => [n.id, n.weight]))).toEqual(expected);
    expect(getTotalNationalityWeight()).toBe(100);
    for (const spec of NATIONALITIES_CATALOG) {
      expect(getNationalityById(spec.id)).toBe(spec);
      expect(spec.firstNames.length).toBeGreaterThanOrEqual(6);
      expect(spec.lastNames.length).toBeGreaterThanOrEqual(6);
      expect(spec.hometowns.length).toBeGreaterThanOrEqual(4);
      expect(spec.heritageAbility.name.length).toBeGreaterThan(2);
      expect(spec.heritageAbility.mythOrAnimal.length).toBeGreaterThan(2);
    }
  });

  it('allocates exactly the promised number of half-percent slots to each nationality', () => {
    const rng = createSeededRng(199409);
    const counts = new Map<NationalityId, number>();
    for (let slot = 0; slot < 200; slot++) {
      const nat = rollNationality({ ...rng, next: () => (slot + 0.5) / 200 });
      counts.set(nat.id, (counts.get(nat.id) ?? 0) + 1);
    }
    for (const spec of NATIONALITIES_CATALOG) {
      expect(counts.get(spec.id)).toBe(spec.weight * 2);
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
