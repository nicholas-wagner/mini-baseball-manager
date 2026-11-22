import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import { MAX_ACTIVE_ROSTER_SIZE } from '../models/club';
import {
  beginOffseasonCycle,
  completeOffseasonCycle,
  computeClubPayroll,
  draftOffseasonProspect,
  resolveExpiringContractDecision,
  signOffseasonFreeAgent,
  TIER_SALARY_CAPS,
  validateSalaryCapRoom,
} from './offseasonEngine';

const HUMAN_INPUT = {
  city: 'Sandlot',
  clubName: 'Comets',
  mascot: 'Rocket Dog',
  monogram: 'SC',
  primaryColor: '#E63946',
  secondaryColor: '#1D3557',
  accentColor: '#FFD166',
};

describe('End-of-Season & Offseason Engine + Tier Salary Caps (TASK-065)', () => {
  it('enforces monotonically increasing Tier Salary Caps from Rookie Sandlot to Mini Major League', () => {
    expect(TIER_SALARY_CAPS.rookie).toBeLessThan(TIER_SALARY_CAPS.low_a);
    expect(TIER_SALARY_CAPS.low_a).toBeLessThan(TIER_SALARY_CAPS.high_a);
    expect(TIER_SALARY_CAPS.high_a).toBeLessThan(TIER_SALARY_CAPS.aa);
    expect(TIER_SALARY_CAPS.aa).toBeLessThan(TIER_SALARY_CAPS.aaa);
    expect(TIER_SALARY_CAPS.aaa).toBeLessThan(TIER_SALARY_CAPS.majors);

    const world = generateSixTierWorld(1994, HUMAN_INPUT);
    const human = world.leagues.rookie[0];
    const payroll = computeClubPayroll(human.roster);
    expect(payroll).toBeGreaterThan(0);

    const allowedCheck = validateSalaryCapRoom(human, 500);
    expect(allowedCheck.cap).toBe(TIER_SALARY_CAPS.rookie);

    const overCapCheck = validateSalaryCapRoom(human, TIER_SALARY_CAPS.rookie + 5000);
    expect(overCapCheck.allowed).toBe(false);
    expect(overCapCheck.reason).toMatch(/salary cap/i);
  });

  it('processes retirements, expiring contracts, re-signing/release, 3-round draft, and FA signings under Salary Cap', () => {
    const world = generateSixTierWorld(2025, HUMAN_INPUT);
    // Inject one 40-year-old guaranteed retiree and two 1-year expiring contracts onto the human club
    const human = world.leagues.rookie[0];
    const moddedHuman = {
      ...human,
      economy: { ...human.economy, cash: 50000 },
      roster: human.roster.map((p, idx) => {
        if (idx === 10) return { ...p, age: 40 }; // guaranteed retirement
        if (idx === 11) return { ...p, age: 26, contract: { ...p.contract, yearsRemaining: 1, salaryPerSeason: 450 } };
        if (idx === 12) return { ...p, age: 27, contract: { ...p.contract, yearsRemaining: 1, salaryPerSeason: 450 } };
        return { ...p, age: Math.min(p.age, 31), contract: { ...p.contract, yearsRemaining: Math.max(2, p.contract.yearsRemaining), salaryPerSeason: 450 } };
      }),
    };
    const leagues = {
      ...world.leagues,
      rookie: [moddedHuman, ...world.leagues.rookie.slice(1)],
    };

    const retiredTargetId = moddedHuman.roster[10].id;
    const resignTargetId = moddedHuman.roster[11].id;
    const releaseTargetId = moddedHuman.roster[12].id;

    // 1. Begin Offseason -> processes retirements, expiring contracts, draft class & FA market
    let state = beginOffseasonCycle(leagues, human.id, 2025, 1);
    expect(state.worldChampionClubId).toBeTruthy();
    expect(state.retirements.some((r) => r.playerId === retiredTargetId)).toBe(true);
    expect(state.pendingExpiringPlayers.some((p) => p.id === resignTargetId)).toBe(true);
    expect(state.pendingExpiringPlayers.some((p) => p.id === releaseTargetId)).toBe(true);
    expect(state.draftPool.length).toBeGreaterThanOrEqual(20);
    expect(state.draftRoundsRemaining).toBe(3);

    // 2. Re-sign one expiring player and let the other walk to Free Agency
    const resignRes = resolveExpiringContractDecision(state, resignTargetId, 'resign', 2);
    expect(resignRes.applied).toBe(true);
    state = resignRes.state;
    expect(state.pendingExpiringPlayers.some((p) => p.id === resignTargetId)).toBe(false);

    const releaseRes = resolveExpiringContractDecision(state, releaseTargetId, 'release');
    expect(releaseRes.applied).toBe(true);
    state = releaseRes.state;
    expect(state.freeAgentPool.some((p) => p.id === releaseTargetId)).toBe(true);

    // 3. Draft across all 3 Amateur Draft rounds
    for (let round = 0; round < 3; round += 1) {
      const pickTarget = state.draftPool[0];
      const pickRes = draftOffseasonProspect(state, pickTarget.id);
      expect(pickRes.drafted).toBe(true);
      state = pickRes.state;
    }
    expect(state.draftRoundsRemaining).toBe(0);

    // 4. Sign a Free Agent if under 20-man cap & Salary Cap
    const affordableFa = state.freeAgentPool.find((fa) => fa.contract.salaryPerSeason <= 700);
    if (affordableFa) {
      const signRes = signOffseasonFreeAgent(state, affordableFa.id);
      if (signRes.signed) {
        state = signRes.state;
      }
    }

    // 5. Complete Offseason -> guarantees legal rosters <= 20 and valid lineups across all 48 clubs
    const finalized = completeOffseasonCycle(state);
    const updatedHuman = Object.values(finalized.leagues)
      .flat()
      .find((c) => c.id === human.id)!;

    expect(updatedHuman.roster.length).toBeGreaterThanOrEqual(15);
    expect(updatedHuman.roster.length).toBeLessThanOrEqual(MAX_ACTIVE_ROSTER_SIZE);
    expect(updatedHuman.roster.some((p) => p.id === retiredTargetId)).toBe(false);
    expect(updatedHuman.roster.some((p) => p.id === resignTargetId)).toBe(true);
    expect(computeClubPayroll(updatedHuman.roster)).toBeLessThanOrEqual(
      TIER_SALARY_CAPS[updatedHuman.leagueTier],
    );
  });
});
