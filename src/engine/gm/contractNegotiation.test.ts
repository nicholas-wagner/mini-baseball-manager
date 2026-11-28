import { describe, expect, it } from 'vitest';
import { createClub } from './rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import {
  applyNegotiatedContractExtension,
  buildPlayerExtensionDemand,
  evaluateContractOffer,
} from './contractNegotiation';

describe('Simple Personality-Driven Contract Extension Negotiations (TASK-144)', () => {
  it('differentiates youth bridge deals, loyalist discounts, prime stars, and vet security demands', () => {
    const club = createClub(createSeededRng(1441), {
      id: 'neg-club',
      city: 'Deal',
      name: 'Makers',
      mascot: 'Pen',
      colors: { primary: '#1D3557', secondary: '#E63946', accent: '#FFD166', monogram: 'DM' },
      leagueTier: 'aa',
      isHuman: true,
    });

    const base = club.roster[0];
    const youth = buildPlayerExtensionDemand({ ...base, age: 21, morale: 65, personality: 'gym_rat', mentalTraits: [] });
    const vet = buildPlayerExtensionDemand({ ...base, age: 34, morale: 65, personality: 'gym_rat', mentalTraits: [] });
    const loyal = buildPlayerExtensionDemand({ ...base, age: 27, morale: 85, personality: 'clutch_captain', mentalTraits: ['clubhouse_glue'] });

    expect(youth.archetype).toBe('youth_bridge');
    expect(vet.archetype).toBe('veteran_security');
    expect(vet.preferredYears).toBe(3);
    expect(loyal.archetype).toBe('hometown_loyalist');
    expect(loyal.askingSalary).toBeLessThan(youth.askingSalary);
  });

  it('handles 3-round counteroffers, walk-away on lowballs, and applies accepted extensions cleanly', () => {
    const club = createClub(createSeededRng(1442), {
      id: 'neg-club-2',
      city: 'Deal',
      name: 'Signers',
      mascot: 'Pen',
      colors: { primary: '#1D3557', secondary: '#E63946', accent: '#FFD166', monogram: 'DS' },
      leagueTier: 'aa',
      isHuman: true,
    });
    const player = club.roster[1];
    const demand = buildPlayerExtensionDemand(player);

    // Extreme lowball walks away
    const lowball = evaluateContractOffer(club, player, demand, {
      years: 1,
      salaryPerSeason: Math.round(demand.askingSalary * 0.35),
    }, 1);
    expect(lowball.status).toBe('walked');

    // Mildly below ask returns a fair counteroffer in Round 1
    const mild = evaluateContractOffer(club, player, demand, {
      years: demand.preferredYears,
      salaryPerSeason: Math.round(demand.askingSalary * 0.85),
    }, 1);
    expect(['counter', 'accepted']).toContain(mild.status);

    // Meeting ask gets accepted and persists cleanly onto the club
    const accepted = evaluateContractOffer(club, player, demand, {
      years: demand.preferredYears,
      salaryPerSeason: demand.askingSalary,
    }, 2);
    expect(accepted.status).toBe('accepted');

    const signed = applyNegotiatedContractExtension(club, player.id, {
      years: demand.preferredYears,
      salaryPerSeason: demand.askingSalary,
    });
    expect(signed.applied).toBe(true);
    const updated = signed.club.roster.find((p) => p.id === player.id)!;
    expect(updated.contract.yearsRemaining).toBe(player.contract.yearsRemaining + demand.preferredYears);
    expect(updated.contract.salaryPerSeason).toBe(demand.askingSalary);
  });
});
