import { describe, expect, it } from 'vitest';
import { PLAYER_CATALOG } from '../catalog/playerCatalog';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { availableHobbyChats, discoverPlayerHobby, getPlayerHobby } from './playerHobbies';

describe('Off the Clock', () => {
  it('assigns stable stories across the catalog, including fandom and exclusive figure modeling', () => {
    const hobbies = PLAYER_CATALOG.map(getPlayerHobby);
    const ids = hobbies.map(h => h.id);
    expect(new Set(ids).size).toBeGreaterThanOrEqual(35);
    for (const id of ['figure-modeling','nail-art','onsen','weights','shopping','downhill-skiing','water-skiing','sightseeing','clubbing','leatherwork','sewing']) expect(ids).toContain(id);
    expect(PLAYER_CATALOG.filter((_, i) => ids[i] === 'onsen').every(p => p.nationalityId === 'JPN')).toBe(true);
    for (const [i, player] of PLAYER_CATALOG.entries()) {
      expect(getPlayerHobby(player)).toEqual(hobbies[i]);
      if (player.traits.playerLook !== 'female') expect(['figure-modeling', 'nail-art']).not.toContain(ids[i]);
    }
    const pinned = ['beach-volleyball','park-chess','sunbathing','crochet','computer-programming','mecha-kits','fantasy-cards'];
    const players = ['showcase-kiko','catalog-yu-ting','catalog-mara','mbm-0030','showcase-ana','showcase-rico','showcase-finn'];
    expect(players.map(id => ids[PLAYER_CATALOG.findIndex(p => p.id === id)])).toEqual(pinned);
  });

  it('banks a choice after games one and three, including a bench player, and caps morale', () => {
    const club = createClub(createSeededRng(1994), {id:'home', city:'Harbor', name:'Otters', mascot:'Otter', leagueTier:'rookie', isHuman:true, colors:{primary:'#156', secondary:'#357', accent:'#ffa', monogram:'HO'}});
    const bench = club.roster.find(p => !club.lineup.some(slot => slot.playerId === p.id))!;
    expect(discoverPlayerHobby(club, bench.id)).toBe(club);
    const available = {...club, wins:3, roster:club.roster.map(p => p.id === bench.id ? {...p, morale:99} : p)};
    expect(availableHobbyChats(available)).toBe(2);
    expect(discoverPlayerHobby(available, 'rival')).toBe(available);
    const opened = discoverPlayerHobby(available, bench.id);
    expect(opened.roster.find(p => p.id === bench.id)?.morale).toBe(100);
    expect(availableHobbyChats(opened)).toBe(1);
    expect(discoverPlayerHobby(opened, bench.id)).toBe(opened);
    expect(opened.hobbyMemories?.[0]).toMatchObject({playerId:bench.id, playerName:bench.name, quote:getPlayerHobby(bench).quote});
  });

});
