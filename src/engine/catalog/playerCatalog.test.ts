import { expect, it } from 'vitest';
import { NATIONALITIES_CATALOG } from '../nationalities/nationalitiesCatalog';
import { generateSixTierWorld } from '../league/seasonEngine';
import { PLAYER_CATALOG } from './playerCatalog';

it('has 3,000 distinct permanent identities and names at the commissioned proportions', () => {
  expect(PLAYER_CATALOG).toHaveLength(3000);
  expect(new Set(PLAYER_CATALOG.map(p => p.id)).size).toBe(3000);
  expect(new Set(PLAYER_CATALOG.map(p => p.name)).size).toBe(3000);
  const women = PLAYER_CATALOG.filter(p => p.traits.playerLook === 'female');
  expect(women).toHaveLength(750);
  expect(women.filter(p => p.traits.bottoms === 'skirt')).toHaveLength(375);
  expect(women.filter(p => p.traits.openCollar)).toHaveLength(75);
  expect(women.filter(p => p.traits.croppedJersey)).toHaveLength(75);
  expect(PLAYER_CATALOG.filter(p => p.traits.glasses !== 'none')).toHaveLength(300);
  for (const nation of NATIONALITIES_CATALOG) {
    expect(PLAYER_CATALOG.filter(p => p.nationalityId === nation.id)).toHaveLength(nation.weight * 30);
  }
});

it('deals unique catalog players to 48 clubs and the opening market by world seed', () => {
  const club = { city: 'Test', clubName: 'Stars', mascot: 'Sun', monogram: 'TS', primaryColor: '#333', secondaryColor: '#777', accentColor: '#fff' };
  const opening = (seed: number) => {
    const world = generateSixTierWorld(seed, club);
    return [...Object.values(world.leagues).flat().flatMap(c => c.roster), ...world.freeAgents];
  };
  const pool = new Map(PLAYER_CATALOG.map(p => [p.id, p]));
  const players = opening(123);
  expect(new Set(players.map(p => p.id)).size).toBe(876);
  for (const p of players) {
    expect(pool.get(p.id)).toMatchObject({ name: p.name, position: p.position, bats: p.bats, throws: p.throws, traits: p.traits });
  }
  expect(opening(123).map(p => p.id)).toEqual(players.map(p => p.id));
  expect(opening(124).map(p => p.id)).not.toEqual(players.map(p => p.id));
});

it('keeps the fixed wardrobe, batting sides and throwing sides consistent across the pool', () => {
  const women = PLAYER_CATALOG.filter(p => p.traits.playerLook === 'female');
  const skirt = women.filter(p => p.traits.bottoms === 'skirt');
  expect(skirt.filter(p => p.traits.skirtLiner === 'shorts')).toHaveLength(300);
  expect(skirt.filter(p => p.traits.skirtLiner === 'briefs')).toHaveLength(75);
  expect(women.filter(p => p.traits.bottoms === 'shorts')).toHaveLength(375);
  const fits = ['AA', 'A', 'B', 'C', 'D', 'DD'];
  expect(fits.map(fit => women.filter(p => p.traits.jerseyFit === fit).length))
    .toEqual([38, 75, 150, 375, 75, 37]);
  expect(['R', 'L', 'S'].map(side => PLAYER_CATALOG.filter(p => p.bats === side).length))
    .toEqual([1500, 1200, 300]);
  const leftShares = { SP: 0.35, RP: 0.5, C: 0.2, '1B': 0.8, '2B': 0, '3B': 0, SS: 0, LF: 0.5, CF: 0.5, RF: 0.5 };
  for (const [position, share] of Object.entries(leftShares)) {
    const group = PLAYER_CATALOG.filter(p => p.position === position);
    expect(group.filter(p => p.throws === 'L')).toHaveLength(group.length * share);
  }
});
