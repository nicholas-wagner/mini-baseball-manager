import { describe, expect, it } from 'vitest';
import { createGameStore } from './gameStore';
import { availableHobbyChats } from '../engine/rpg/playerHobbies';

function career() {
  const store = createGameStore();
  store.getState().startNewCareer({city:'Harbor', clubName:'Otters', mascot:'Otter', monogram:'HO',
    primaryColor:'#156', secondaryColor:'#357', accentColor:'#ffa', managerName:'Skip', seed:1994});
  return store;
}

describe('Hobby career saves', () => {
  it('counts both sim paths, retains stories after a roster change and carries credit across seasons and backup import', () => {
    const store = career();
    const game = store.getState();
    const club = game.getHumanClub()!;
    const [player] = club.roster;
    game.playInstantExhibition(game.leagues.rookie.find(c => !c.isHuman)!.id, 100);
    const before = game.getHumanClub()!.roster[0].morale;
    game.chatAboutHobby(player.id);
    expect(game.getHumanClub()!.roster[0].morale).toBe(Math.min(100, before + 2));
    game.simNextSeriesRound(5);
    expect(availableHobbyChats(game.getHumanClub()!)).toBe(1);
    game.runPlayoffsAndAdvanceSeason(5);
    expect(availableHobbyChats(game.getHumanClub()!)).toBe(1);
    const saved = game.exportCurrentCareerJson();
    const restored = career().getState();
    restored.importCareerJson(saved);
    const after = restored.getHumanClub()!;
    expect(after.hobbyMemories).toEqual(game.getHumanClub()!.hobbyMemories);
    expect(availableHobbyChats({...after, roster:[]})).toBe(1);
  });
});
