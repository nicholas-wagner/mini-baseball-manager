import { describe, expect, it } from 'vitest';
import { FAIR_TICKET_PRICE_BY_TIER } from '../economy/attendance';
import type { Club } from '../models/club';
import { createSeededRng } from '../rng/seededRng';
import {
  applyRoutineFrontOfficeAutomation,
  evaluateRoutineFrontOfficePlan,
  FRONT_OFFICE_MODE_OPTIONS,
} from './frontOfficeMode';
import { createClub, validateLineup } from './rosterFactory';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

function makeRookieClub(seed = 1994): Club {
  return createClub(createSeededRng(seed), {
    id: 'human-club',
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: COLORS,
    leagueTier: 'rookie',
    isHuman: true,
  });
}

describe('3-Mode Front Office Assistant GM Engine (TASK-094)', () => {
  it('exposes the 3 front office modes (auto, semi_auto, manual)', () => {
    expect(FRONT_OFFICE_MODE_OPTIONS.map((opt) => opt.id)).toEqual(['auto', 'semi_auto', 'manual']);
  });

  it('stays quiet when lineup is healthy and ticket pricing is already in the fair tier band', () => {
    const club = makeRookieClub(1994);
    const cleanClub: Club = {
      ...club,
      economy: { ...club.economy, ticketPrice: FAIR_TICKET_PRICE_BY_TIER.rookie },
    };

    const plan = evaluateRoutineFrontOfficePlan(cleanClub);
    expect(plan.hasMandatoryIlStarter).toBe(false);
    expect(plan.needsAction).toBe(false);
    expect(plan.items).toHaveLength(0);

    const applied = applyRoutineFrontOfficeAutomation(cleanClub);
    expect(applied.actionsApplied).toHaveLength(0);
    expect(applied.club.economy.ticketPrice).toBe(FAIR_TICKET_PRICE_BY_TIER.rookie);
  });

  it('detects and fixes mandatory IL starters, off-band ticket prices, and OOP lineup spots cleanly', () => {
    const club = makeRookieClub(2089);
    const injuredId = club.lineup[0].playerId;
    const messyClub: Club = {
      ...club,
      economy: { ...club.economy, ticketPrice: 28 },
      roster: club.roster.map((p) =>
        p.id === injuredId
          ? {
              ...p,
              activeHealthStatus: {
                conditionId: 'broken_wrist',
                name: 'Sprained Wrist',
                kind: 'injury',
                rarity: 'rare',
                category: 'arm_elbow_shoulder',
                gamesRemaining: 5,
                seasonEnding: false,
                canPlayThrough: false,
                playingThrough: false,
                careerEndingTriggered: false,
                statPenalties: { contact: -15 },
              },
            }
          : p,
      ),
    };

    const plan = evaluateRoutineFrontOfficePlan(messyClub, 'L');
    expect(plan.needsAction).toBe(true);
    expect(plan.hasMandatoryIlStarter).toBe(true);
    expect(plan.items.some((item) => item.kind === 'il_lineup_fix')).toBe(true);
    expect(plan.items.some((item) => item.kind === 'fair_tickets')).toBe(true);

    const result = applyRoutineFrontOfficeAutomation(messyClub, 'L');
    expect(result.actionsApplied.length).toBeGreaterThanOrEqual(2);
    expect(result.club.economy.ticketPrice).toBe(FAIR_TICKET_PRICE_BY_TIER.rookie);
    expect(result.club.lineup.some((slot) => slot.playerId === injuredId)).toBe(false);
    expect(validateLineup(result.club).valid).toBe(true);
  });

  it('detects and repairs out-of-position starters when an opposing starter handedness is provided', () => {
    const club = makeRookieClub(2099);
    const fairClub: Club = {
      ...club,
      economy: { ...club.economy, ticketPrice: FAIR_TICKET_PRICE_BY_TIER.rookie },
    };
    // Swap C and CF defensive positions so at least one starter is out of position
    const catcherIdx = fairClub.lineup.findIndex((s) => s.defensivePosition === 'C');
    const cfIdx = fairClub.lineup.findIndex((s) => s.defensivePosition === 'CF');
    const scrambledLineup = fairClub.lineup.map((slot, idx) => {
      if (idx === catcherIdx) return { ...slot, defensivePosition: 'CF' as const };
      if (idx === cfIdx) return { ...slot, defensivePosition: 'C' as const };
      return slot;
    });
    const oopClub: Club = { ...fairClub, lineup: scrambledLineup };

    const plan = evaluateRoutineFrontOfficePlan(oopClub, 'R');
    expect(plan.needsAction).toBe(true);
    expect(plan.items.some((item) => item.kind === 'platoon_lineup')).toBe(true);

    const applied = applyRoutineFrontOfficeAutomation(oopClub, 'R');
    expect(applied.actionsApplied.length).toBeGreaterThanOrEqual(1);
    expect(validateLineup(applied.club).valid).toBe(true);
  });
});
