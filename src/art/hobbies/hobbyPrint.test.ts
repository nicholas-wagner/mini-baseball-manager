import { expect, it } from 'vitest';
import { PLAYER_CATALOG_BY_ID } from '../../engine/catalog/playerCatalog';
import { getPlayerHobby } from '../../engine/rpg/playerHobbies';
import { playerHobbyStories } from '../../engine/rpg/playerHobbyStories';
import { hobbyPrint } from './hobbyPrint';

it('pairs each personally authored story with its catalog player and WebP', () => {
  for (const [id, story] of Object.entries(playerHobbyStories)) {
    const player = PLAYER_CATALOG_BY_ID.get(id)!;
    const hobby = getPlayerHobby(player);
    expect(hobby, id).toMatchObject(story!);
    const memory = { playerId: id, playerName: player.name, hobbyId: hobby.id, ...hobby };
    expect(hobbyPrint(memory), id).toContain(id + '.webp');
  }
});

it('gives every fixed catalog player a distinct illustrated memory', () => {
  const clues = new Set<string>();
  const quotes = new Set<string>();
  for (const player of PLAYER_CATALOG_BY_ID.values()) {
    const hobby = getPlayerHobby(player);
    const memory = { playerId: player.id, playerName: player.name, hobbyId: hobby.id, ...hobby };
    expect(hobbyPrint(memory), player.id).toContain(player.id + '.webp');
    clues.add(hobby.clue);
    quotes.add(hobby.quote);
  }
  expect(clues.size).toBe(PLAYER_CATALOG_BY_ID.size);
  expect(quotes.size).toBe(PLAYER_CATALOG_BY_ID.size);
});
