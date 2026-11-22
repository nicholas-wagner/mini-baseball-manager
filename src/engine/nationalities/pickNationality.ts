import type { SeededRng } from '../rng/seededRng';
import { NATIONALITIES_BY_ID, NATIONALITIES_CATALOG } from './nationalitiesCatalog';
import type { NationalityId, NationalitySpec } from './types';

export function getNationalityById(id: NationalityId): NationalitySpec {
  return NATIONALITIES_BY_ID[id];
}

export function getTotalNationalityWeight(
  catalog: readonly NationalitySpec[] = NATIONALITIES_CATALOG,
): number {
  return catalog.reduce((sum, item) => sum + item.weight, 0);
}

/** A single seeded draw selects a nationality by its share of the total weight. */
export function rollNationality(
  rng: SeededRng,
  catalog: readonly NationalitySpec[] = NATIONALITIES_CATALOG,
): NationalitySpec {
  if (catalog.length === 0) {
    throw new Error('Nationality catalog cannot be empty');
  }
  const totalWeight = getTotalNationalityWeight(catalog);
  const roll = rng.next() * totalWeight;
  let cursor = 0;
  for (const spec of catalog) {
    cursor += spec.weight;
    if (roll < cursor) {
      return spec;
    }
  }
  return catalog[catalog.length - 1];
}

export interface GeneratedIdentity {
  nationality: NationalitySpec;
  fullName: string;
  hometown: string;
}

export function generatePlayerIdentity(
  rng: SeededRng,
  forcedNationalityId?: NationalityId,
): GeneratedIdentity {
  const nationality = forcedNationalityId
    ? getNationalityById(forcedNationalityId)
    : rollNationality(rng);
  const first = rng.pick(nationality.firstNames);
  const last = rng.pick(nationality.lastNames);
  const hometown = rng.pick(nationality.hometowns);

  return {
    nationality,
    fullName: `${first} ${last}`,
    hometown,
  };
}
