import { expect, it } from 'vitest';
import { PLAYER_CATALOG, PLAYER_CATALOG_BY_ID } from '../../engine/catalog/playerCatalog';
import { playerIllustration } from './illustratedPlayerPool';

it.each([
  { first: 1, last: 100, women: 25 },
  { first: 101, last: 350, women: 56 },
  { first: 351, last: 600, women: 52 },
  { first: 601, last: 1600, women: 232 },
])('binds distinct prints to commissioned players $first through $last', ({ first, last, women }) => {
  const batch = PLAYER_CATALOG.filter(player => player.id.startsWith('mbm-')).slice(first - 1, last);
  expect(batch).toHaveLength(last - first + 1);
  expect(batch.filter(player => player.traits.playerLook === 'female')).toHaveLength(women);
  const prints = batch.map(player => playerIllustration(player.id));
  expect(prints.every(Boolean)).toBe(true);
  expect(new Set(prints).size).toBe(batch.length);
  expect(playerIllustration('legacy-procedural-player')).toBeUndefined();
});

it('gives every fixed catalog player a distinct portrait, including the showcase players', () => {
  const prints = PLAYER_CATALOG.map(player => playerIllustration(player.id));
  expect(prints).not.toContain(undefined);
  expect(new Set(prints).size).toBe(PLAYER_CATALOG.length);
});

it('ties every shipped batch print to an existing player', () => {
  const paths = Object.keys(import.meta.glob('./illustrations/batch-*/*.png'));
  const ids = paths.map(path => path.slice(path.lastIndexOf('/') + 1, -4));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every(id => PLAYER_CATALOG_BY_ID.has(id))).toBe(true);
});
