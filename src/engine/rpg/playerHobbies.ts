import type { Club } from '../models/club';
import type { Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { localHobbies, sharedHobbies, womensHobbies } from './hobbyCatalog';

export interface HobbyMemory {
  playerId: string;
  playerName: string;
  hobbyId: string;
  title: string;
  quote: string;
}

const featured: Record<string, string> = {
  'showcase-kiko': 'beach-volleyball', 'catalog-yu-ting': 'park-chess', 'catalog-mara': 'sunbathing',
  'mbm-0030': 'crochet', 'showcase-ana': 'computer-programming', 'showcase-rico': 'mecha-kits',
  'showcase-finn': 'fantasy-cards', 'catalog-wade': 'sewing', 'catalog-bento': 'band',
};

export function getPlayerHobby(player: Pick<Player, 'id' | 'traits' | 'nationalityId'>) {
  const rng = createSeededRng(player.traits.seed);
  const fixed = sharedHobbies.find(hobby => hobby.id === featured[player.id]);
  const pool = player.traits.playerLook === 'female' ? [...sharedHobbies, ...womensHobbies] : sharedHobbies;
  const hobby = fixed ?? (rng.chance(0.18) ? localHobbies[player.nationalityId] : rng.pick(pool));
  const quote = fixed ? hobby.stories[0] : rng.pick(hobby.stories);
  return { id: hobby.id, title: hobby.title, clue: hobby.clue, quote };
}

export function clubHobbyGames(club: Club): number {
  return (club.priorHobbyGames ?? 0) + club.wins + club.losses;
}

export function availableHobbyChats(club: Club): number {
  return Math.max(0, Math.ceil(clubHobbyGames(club) / 2) - (club.hobbyMemories?.length ?? 0));
}

export function discoverPlayerHobby(club: Club, id: string): Club {
  const player = club.roster.find(member => member.id === id);
  const memories = club.hobbyMemories ?? [];
  if (!player || !availableHobbyChats(club) || memories.some(memory => memory.playerId === id)) return club;
  const hobby = getPlayerHobby(player);
  return {
    ...club,
    hobbyMemories: [{playerId:id, playerName:player.name, hobbyId:hobby.id, title:hobby.title, quote:hobby.quote}, ...memories],
    roster: club.roster.map(member => member.id === id ? {...member, morale:Math.min(100, member.morale + 2)} : member),
  };
}
