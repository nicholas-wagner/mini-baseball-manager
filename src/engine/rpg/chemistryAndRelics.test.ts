import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { evaluateClubhouseChemistry } from './chemistry';
import {
  equipRelicOnPlayer,
  evaluatePlayerRelicBonuses,
  MAX_RELICS_PER_PLAYER,
  RELIC_CATALOG,
  rollVintageRelicDrop,
  unequipRelicFromPlayer,
} from './relics';

describe('Clubhouse Chemistry & Synergy Bonds (TASK-034) + 90s Gear & Relics (TASK-036)', () => {
  it('detects active Clubhouse Duo/Trio Synergy Combos and evaluates clubhouse morale cleanly', () => {
    const rng = createSeededRng(3401);
    const club = createClub(rng, {
      id: 'c-chem',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'aa',
      isHuman: true,
    });

    // Engineer clear Bash Brothers (2 high-power bats) + Double-Play Wizards (SS + 2B high fielding) + Battery Telepathy (SP + C high control/fielding)
    const roster = club.roster.map((p) => {
      if (p.position === '1B' || p.position === '3B') {
        return { ...p, ratings: { ...p.ratings, power: 82 }, personality: 'clutch_captain' as const };
      }
      if (p.position === 'SS' || p.position === '2B') {
        return { ...p, ratings: { ...p.ratings, fielding: 82, range: 80 } };
      }
      if (p.position === 'SP' || p.position === 'C') {
        return { ...p, ratings: { ...p.ratings, control: 80, fielding: 80 }, mentalTraits: ['clubhouse_glue' as const] };
      }
      return p;
    });

    const report = evaluateClubhouseChemistry(roster);
    expect(report.moraleScore).toBeGreaterThanOrEqual(55);
    expect(report.activeBonds.some((b) => b.id === 'bash_brothers')).toBe(true);
    expect(report.activeBonds.some((b) => b.id === 'double_play_wizards')).toBe(true);
    expect(report.activeBonds.some((b) => b.id === 'battery_telepathy')).toBe(true);
    expect(report.totalTeamRatingBonus.power).toBeGreaterThan(0);
    expect(report.totalTeamRatingBonus.fielding).toBeGreaterThan(0);
  });

  it('provides 24+ 90s Gear & Relics with 2-slot equip limits, Equipment Manager amplification, and seeded loot drops', () => {
    expect(RELIC_CATALOG.length).toBeGreaterThanOrEqual(24);
    expect(new Set(RELIC_CATALOG.map((r) => r.id)).size).toBe(RELIC_CATALOG.length);

    const rng = createSeededRng(3601);
    const hitter = {
      ...createPlayer(rng, { position: 'RF', tier: 'aa' }),
      equippedRelicIds: [] as string[],
    };

    const batRelic = RELIC_CATALOG.find((r) => r.id === 'golden_ash_bat')!;
    const cleatsRelic = RELIC_CATALOG.find((r) => r.id === 'spring_loaded_cleats')!;
    const shadesRelic = RELIC_CATALOG.find((r) => r.id === 'iridescent_90s_shades')!;

    const e1 = equipRelicOnPlayer(hitter, batRelic.id);
    expect(e1.equipped).toBe(true);
    const e2 = equipRelicOnPlayer(e1.player, cleatsRelic.id);
    expect(e2.equipped).toBe(true);
    expect(e2.player.equippedRelicIds).toHaveLength(MAX_RELICS_PER_PLAYER);

    // 3rd relic blocked at 2-slot limit
    const e3 = equipRelicOnPlayer(e2.player, shadesRelic.id);
    expect(e3.equipped).toBe(false);

    const baseBonuses = evaluatePlayerRelicBonuses(e2.player, 1.0);
    const ampBonuses = evaluatePlayerRelicBonuses(e2.player, 1.35);
    expect(baseBonuses.power).toBeGreaterThan(0);
    expect(baseBonuses.speed).toBeGreaterThan(0);
    expect(ampBonuses.power + ampBonuses.speed).toBeGreaterThan(baseBonuses.power + baseBonuses.speed);

    // Unequip frees slot cleanly
    const removed = unequipRelicFromPlayer(e2.player, batRelic.id);
    expect(removed.equippedRelicIds).toEqual([cleatsRelic.id]);

    // Seeded vintage relic drop returns valid catalog relic
    const dropped = rollVintageRelicDrop(rng);
    expect(RELIC_CATALOG.some((r) => r.id === dropped.id)).toBe(true);
  });
});
