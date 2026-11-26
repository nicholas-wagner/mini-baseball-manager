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
