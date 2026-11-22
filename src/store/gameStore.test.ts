import { describe, expect, it } from 'vitest';
import { validateLineup } from '../engine/gm/rosterFactory';
import { createGameStore } from './gameStore';
import { createSaveRepository } from './persistence';

describe('Career Zustand Store (Club Creator, Lineup & Exhibition Loop)', () => {

  it('creates a new career with an 8-team Rookie tier, valid lineup, and Level 1 manager', () => {
    const store = createGameStore();
    store.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });

    const state = store.getState();
    const humanClub = state.getHumanClub();
    expect(humanClub).not.toBeNull();
    expect(humanClub!.name).toBe('Comets');
    expect(state.leagues.rookie).toHaveLength(8);
    expect(validateLineup(humanClub!).valid).toBe(true);
    expect(state.manager?.name).toBe('Coach Skip');
    expect(state.manager?.level).toBe(1);
  });

  it('swaps lineup slots, replaces batters with bench hitters, optimizes lineup, and updates rotation', () => {
    const store = createGameStore();
    store.getState().startNewCareer({
      city: 'Harbor',
      clubName: 'Otters',
      mascot: 'Otter',
      monogram: 'HO',
      primaryColor: '#1D63B8',
      secondaryColor: '#0F2B46',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 4242,
    });

    const beforeClub = store.getState().getHumanClub()!;
    const firstIdBefore = beforeClub.lineup[0].playerId;
    const fourthIdBefore = beforeClub.lineup[3].playerId;

    store.getState().swapLineupSlots(0, 3);
    const afterSwap = store.getState().getHumanClub()!;
    expect(afterSwap.lineup[0].playerId).toBe(fourthIdBefore);
    expect(afterSwap.lineup[3].playerId).toBe(firstIdBefore);
    expect(validateLineup(afterSwap).valid).toBe(true);

    const activeIds = new Set(afterSwap.lineup.map((s) => s.playerId));
    const benchHitter = afterSwap.roster.find(
      (p) => p.position !== 'SP' && p.position !== 'RP' && !activeIds.has(p.id),
    )!;
    store.getState().assignLineupPlayer(8, benchHitter.id);
    const afterBenchSub = store.getState().getHumanClub()!;
    expect(afterBenchSub.lineup[8].playerId).toBe(benchHitter.id);
    expect(validateLineup(afterBenchSub).valid).toBe(true);

    store.getState().autoOptimizeHumanLineup();
    expect(validateLineup(store.getState().getHumanClub()!).valid).toBe(true);

    const sp1 = store.getState().getHumanClub()!.rotationIds[0];
    const sp2 = store.getState().getHumanClub()!.rotationIds[1];
    store.getState().swapRotationOrder(0, 1);
    expect(store.getState().getHumanClub()!.rotationIds[0]).toBe(sp2);
    expect(store.getState().getHumanClub()!.rotationIds[1]).toBe(sp1);
  });

  it('simulates an exhibition game, commits rewards & stats, and persists/imports slots', async () => {
    const store = createGameStore(createSaveRepository());
    store.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });

    const beforeClub = store.getState().getHumanClub()!;
    const opponent = store.getState().leagues.rookie.find((c) => !c.isHuman)!;
    const summary = store.getState().playInstantExhibition(opponent.id, 9001);

    expect(summary).not.toBeNull();
    const afterClub = store.getState().getHumanClub()!;
    expect(afterClub.wins + afterClub.losses).toBe(1);
    expect(afterClub.economy.cash).toBeGreaterThan(beforeClub.economy.cash);
    expect(store.getState().lastPostGameSummary).toEqual(summary);

    await store.getState().saveCareerToSlot('slot-1');
    const json = store.getState().exportCurrentCareerJson();

    // Overwrite active career, then load back from slot-1 and import JSON
    store.getState().startNewCareer({
      city: 'Other',
      clubName: 'Sharks',
      mascot: 'Shark',
      monogram: 'OS',
      primaryColor: '#2FB356',
      secondaryColor: '#181B2C',
      accentColor: '#FFFFFF',
      managerName: 'New Coach',
      seed: 55,
    });
    expect(store.getState().getHumanClub()!.name).toBe('Sharks');

    await store.getState().loadCareerFromSlot('slot-1');
    expect(store.getState().getHumanClub()!.name).toBe('Comets');
    expect(store.getState().getHumanClub()!.wins + store.getState().getHumanClub()!.losses).toBe(1);

    const importedOk = store.getState().importCareerJson(json);
    expect(importedOk).toBe(true);
    expect(store.getState().getHumanClub()!.name).toBe('Comets');
  });
});
