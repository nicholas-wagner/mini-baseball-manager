import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng/seededRng';
import {
  evaluateFreeAgentOffer,
  generateFreeAgencyMarket,
  negotiateAndSignFreeAgent,
  releasePlayerWithWaiverPenalty,
} from './freeAgency';
import { createClub } from './rosterFactory';

describe('Free Agency, Contract Negotiations, Bidding Wars & Waivers (TASK-026)', () => {
  it('generates rival bidding offers and resolves contract negotiations under 20-man roster & Salary Cap limits', () => {
    const rng = createSeededRng(2601);
    const fullClub = createClub(rng, {
      id: 'c-fa',
      city: 'Metro',
      name: 'Knights',
      mascot: 'Knight',
      colors: { primary: '#2563EB', secondary: '#0F172A', accent: '#FFD166', monogram: 'MK' },
      leagueTier: 'aa',
      isHuman: true,
    });
    // Trim 3 expiring contracts so club enters Free Agency with genuine Salary Cap room
    const club = { ...fullClub, roster: fullClub.roster.slice(0, 15) };
    const rival = createClub(rng, {
      id: 'c-rival',
      city: 'Harbor',
      name: 'Sharks',
      mascot: 'Shark',
      colors: { primary: '#0EA5E9', secondary: '#0F172A', accent: '#FFD166', monogram: 'HS' },
      leagueTier: 'aa',
      isHuman: false,
    });

    const market = generateFreeAgencyMarket(rng, 'aa', [rival], 10);
    expect(market).toHaveLength(10);
    // Pick an affordable candidate inside AA Salary Cap
    const listing = [...market].sort((a, b) => a.askingSalary - b.askingSalary)[0];
    expect(listing.askingSalary).toBeGreaterThan(0);

    // Lowball offer rejected cleanly
    const lowball = evaluateFreeAgentOffer(
      listing,
      {
        salaryPerSeason: Math.round(listing.askingSalary * 0.4),
        years: 1,
        signingBonus: 0,
      },
      club,
    );
    expect(lowball.accepted).toBe(false);

    // Competitive offer beating rival bid & matching asking years succeeds and updates roster + cash
    const winningSalary = Math.max(listing.askingSalary, listing.highestRivalBid + 250);
    const signed = negotiateAndSignFreeAgent(club, market, listing.player.id, {
      salaryPerSeason: winningSalary,
      years: listing.askingYears,
      signingBonus: Math.min(800, listing.player.contract.signingBonus + 100),
    });
    expect(signed.signed).toBe(true);
    expect(signed.club.roster.some((p) => p.id === listing.player.id)).toBe(true);
    expect(signed.market.some((m) => m.player.id === listing.player.id)).toBe(false);
    expect(signed.club.economy.cash).toBeLessThan(club.economy.cash);

    // Over-Salary-Cap contract offer is cleanly blocked
    const secondListing = signed.market[0];
    const overCap = negotiateAndSignFreeAgent(signed.club, signed.market, secondListing.player.id, {
      salaryPerSeason: 90_000,
      years: 2,
      signingBonus: 0,
    });
    expect(overCap.signed).toBe(false);
    expect(overCap.reason).toMatch(/salary cap/i);
  });

  it('applies waiver dead-cap buyout and extra clubhouse morale hit when cutting a clubhouse_glue veteran', () => {
    const rng = createSeededRng(2602);
    const baseClub = createClub(rng, {
      id: 'c-cut',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Dog',
      colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
      leagueTier: 'rookie',
      isHuman: true,
    });
    const glueTarget = {
      ...baseClub.roster[baseClub.roster.length - 1],
      mentalTraits: ['clubhouse_glue' as const],
      contract: { salaryPerSeason: 1200, yearsRemaining: 2, signingBonus: 200 },
    };
    const club = {
      ...baseClub,
      roster: [...baseClub.roster.slice(0, -1), glueTarget],
    };

    const released = releasePlayerWithWaiverPenalty(club, glueTarget.id);
    expect(released.released).toBe(true);
    expect(released.deadCapCost).toBeGreaterThan(0);
    expect(released.moraleDelta).toBeLessThanOrEqual(-5);
    expect(released.club.economy.cash).toBe(club.economy.cash - released.deadCapCost);
    expect(released.club.roster.some((p) => p.id === glueTarget.id)).toBe(false);
  });
});
