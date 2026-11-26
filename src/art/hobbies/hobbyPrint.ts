import { PLAYER_CATALOG_BY_ID } from '../../engine/catalog/playerCatalog';
import { getPlayerHobby, type HobbyMemory } from '../../engine/rpg/playerHobbies';

const prints = import.meta.glob<string>('./prints/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

export function hobbyPrint(memory: HobbyMemory): string | undefined {
  const print = prints['./prints/' + memory.playerId + '.webp'];
  const player = PLAYER_CATALOG_BY_ID.get(memory.playerId);
  if (!print || !player) return undefined;
  const story = getPlayerHobby(player);
  return story.id === memory.hobbyId && story.quote === memory.quote ? print : undefined;
}
