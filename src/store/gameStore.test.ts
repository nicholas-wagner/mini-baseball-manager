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

  it('enforces 20-man roster limit across free-agent signings, supports releases, and cross-trains positions', () => {
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

    // Give generous cash to afford any free agents in wire
    const richHuman = {
      ...store.getState().getHumanClub()!,
      economy: { ...store.getState().getHumanClub()!.economy, cash: 50000 },
    };
    store.setState((s) => ({
      leagues: {
        ...s.leagues,
        rookie: s.leagues.rookie.map((c) => (c.id === richHuman.id ? richHuman : c)),
      },
    }));

    expect(store.getState().freeAgents.length).toBeGreaterThanOrEqual(8);
    expect(store.getState().getHumanClub()!.roster).toHaveLength(18);

    // Sign 2 free agents up to MAX_ACTIVE_ROSTER_SIZE = 20
    const fa1 = store.getState().freeAgents[0];
    const fa2 = store.getState().freeAgents[1];
    const fa3 = store.getState().freeAgents[2];

    expect(store.getState().signFreeAgent(fa1.id).signed).toBe(true);
    expect(store.getState().signFreeAgent(fa2.id).signed).toBe(true);
    expect(store.getState().getHumanClub()!.roster).toHaveLength(20);

    // Signing 21st player is rejected by the 20-man cap
    const blocked = store.getState().signFreeAgent(fa3.id);
    expect(blocked.signed).toBe(false);
    expect(blocked.reason).toMatch(/20/);

    // Release a non-core bench player frees a slot back to 19
    const club20 = store.getState().getHumanClub()!;
    const activeIds = new Set(club20.lineup.map((l) => l.playerId));
    const benchHitter = club20.roster.find(
      (p) => p.position !== 'SP' && p.position !== 'RP' && !activeIds.has(p.id),
    )!;
    expect(store.getState().releasePlayer(benchHitter.id).released).toBe(true);
    expect(store.getState().getHumanClub()!.roster).toHaveLength(19);

    // Cross-training raises target position proficiency while applying rust to primary
    const targetHitter = store.getState().getHumanClub()!.roster.find(
      (p) => p.position !== 'SP' && p.position !== 'RP' && p.throws === 'R',
    )!;
    const altPos = targetHitter.position === '3B' ? '1B' : '3B';
    const favBefore = targetHitter.positionProficiency[targetHitter.favoritePosition] ?? 90;
    const trainRes = store.getState().crossTrainPlayerPosition(targetHitter.id, altPos);
    expect(trainRes.trained).toBe(true);

    const updatedHitter = store
      .getState()
      .getHumanClub()!
      .roster.find((p) => p.id === targetHitter.id)!;
    expect(updatedHitter.positionProficiency[altPos]!).toBeGreaterThanOrEqual(45);
    expect(updatedHitter.positionProficiency[updatedHitter.favoritePosition]!).toBeLessThan(favBefore);

    // Compromise training drill updates batter pitch recognition with timing drift
    const weakPitch = updatedHitter.batterPitchProfile.weakPitch;
    const beforeWeakRec = updatedHitter.batterPitchProfile.pitchRecognition[weakPitch] ?? -12;
    const drillRes = store.getState().runCompromiseTrainingDrill(updatedHitter.id, {
      drillId: 'batter_pitch_recognition',
      targetPitch: weakPitch,
    });
    expect(drillRes.trained).toBe(true);
    const afterDrillHitter = store
      .getState()
      .getHumanClub()!
      .roster.find((p) => p.id === updatedHitter.id)!;
    expect(afterDrillHitter.batterPitchProfile.pitchRecognition[weakPitch]!).toBeGreaterThan(
      beforeWeakRec,
    );
  });

  it('unlocks branching skill nodes, unlocks 3-tier Cultural Heritage powers, toggles powers, and respecs (TASK-019, TASK-020)', () => {
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

    const club = store.getState().getHumanClub()!;
    const target = club.roster.find((p) => p.position !== 'SP' && p.position !== 'RP')!;
    store.setState((s) => ({
      leagues: {
        ...s.leagues,
        rookie: s.leagues.rookie.map((c) =>
          c.id === club.id
            ? {
                ...c,
                roster: c.roster.map((p) =>
                  p.id === target.id ? { ...p, skillPoints: 15 } : p,
                ),
              }
            : c,
        ),
      },
    }));

    expect(store.getState().unlockPlayerSkill(target.id, 'b_pwr_1').unlocked).toBe(true);
    expect(store.getState().unlockPlayerSkill(target.id, 'b_pwr_2').unlocked).toBe(true);
    expect(store.getState().unlockPlayerSkill(target.id, 'cap_moonshot_bomb').unlocked).toBe(true);
    expect(store.getState().unlockPlayerHeritageTier(target.id).unlocked).toBe(true);

    const upgraded = store.getState().getHumanClub()!.roster.find((p) => p.id === target.id)!;
    expect(upgraded.equippedPowerIds).toContain('moonshot_bomb');
    expect(upgraded.heritageTierUnlocked).toBe(1);

    expect(store.getState().togglePlayerSpecialPower(target.id, 'moonshot_bomb').changed).toBe(true);
    expect(
      store.getState().getHumanClub()!.roster.find((p) => p.id === target.id)!.equippedPowerIds,
    ).not.toContain('moonshot_bomb');

    const cashBefore = store.getState().getHumanClub()!.economy.cash;
    const respec = store.getState().respecPlayerSkillTree(target.id);
    expect(respec.refundedSp).toBe(6);
    expect(store.getState().getHumanClub()!.economy.cash).toBe(cashBefore - 250);
  });
});
