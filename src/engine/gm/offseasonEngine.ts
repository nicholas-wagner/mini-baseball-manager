import type { FieldPosition } from '../handedness/types';
import {
  advanceOffseasonWorld,
  type TierPromotionTransition,
} from '../league/seasonEngine';
import {
  LEAGUE_TIER_ORDER,
  MAX_ACTIVE_ROSTER_SIZE,
  MIN_ACTIVE_ROSTER_SIZE,
  SOFT_CAP_MULTIPLIER,
  TIER_SALARY_CAPS,
  type Club,
  type LeagueTierId,
} from '../models/club';
import { isPitcherPosition, type Player } from '../models/player';
import { createSeededRng, type SeededRng } from '../rng/seededRng';
import {
  evaluateRetirementAndCoachTransition,
  type RetiredLegendCoachCandidate,
} from '../rpg/lifecycle';
import {
  generateMarketPool,
  validateRosterAddition,
} from './marketTiers';
import { buildOptimalLineup, createPlayer } from './rosterFactory';

export { TIER_SALARY_CAPS };

export interface SalaryCapCheck {
  allowed: boolean;
  currentPayroll: number;
  projectedPayroll: number;
  cap: number;
  remainingSpace: number;
  reason?: string;
}

export type SalaryCapCeiling = 'hard' | 'soft';

export interface RetiredPlayerNotice {
  playerId: string;
  playerName: string;
  clubId: string;
  clubName: string;
  position: FieldPosition;
  age: number;
  seasonsPlayed: number;
}

export interface OffseasonState {
  seasonJustEnded: number;
  nextSeasonNumber: number;
  worldSeed: number;
  humanClubId: string;
  worldChampionClubId: string;
  humanWonWorldChampionship: boolean;
  transitions: readonly TierPromotionTransition[];
  retirements: readonly RetiredPlayerNotice[];
  retiredCoachCandidates: readonly RetiredLegendCoachCandidate[];
  leagues: Record<LeagueTierId, Club[]>;
  pendingExpiringPlayers: Player[];
  draftPool: Player[];
  draftRoundsRemaining: number;
  freeAgentPool: Player[];
}

const DRAFT_POSITIONS: readonly FieldPosition[] = [
  'SP',
  'RP',
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];

/** Sums the annual salaries of every player on an active roster. */
export function computeClubPayroll(roster: readonly Player[]): number {
  return roster.reduce((sum, p) => sum + p.contract.salaryPerSeason, 0);
}

/** Validates whether adding a contract stays under the hard cap, or the 115% soft cap when asked. */
export function validateSalaryCapRoom(
  club: Pick<Club, 'leagueTier' | 'roster'>,
  incomingAnnualSalary: number,
  outgoingAnnualSalary = 0,
  ceiling: SalaryCapCeiling = 'hard',
): SalaryCapCheck {
  const cap = TIER_SALARY_CAPS[club.leagueTier];
  const limit = ceiling === 'soft' ? Math.round(cap * SOFT_CAP_MULTIPLIER) : cap;
  const currentPayroll = computeClubPayroll(club.roster);
  const projectedPayroll = Math.max(0, currentPayroll - outgoingAnnualSalary + incomingAnnualSalary);
  const remainingSpace = limit - currentPayroll;

  if (projectedPayroll > limit) {
    return {
      allowed: false,
      currentPayroll,
      projectedPayroll,
      cap,
      remainingSpace,
      reason: `Over ${club.leagueTier.toUpperCase()} salary cap ($${projectedPayroll.toLocaleString()} / $${limit.toLocaleString()}).`,
    };
  }
  return {
    allowed: true,
    currentPayroll,
    projectedPayroll,
    cap,
    remainingSpace,
  };
}

function findClub(
  leagues: Readonly<Record<LeagueTierId, Club[]>>,
  clubId: string,
): Club | null {
  for (const tier of LEAGUE_TIER_ORDER) {
    const match = leagues[tier].find((c) => c.id === clubId);
    if (match) return match;
  }
  return null;
}

function replaceClub(
  leagues: Readonly<Record<LeagueTierId, Club[]>>,
  updated: Club,
): Record<LeagueTierId, Club[]> {
  return {
    ...leagues,
    [updated.leagueTier]: leagues[updated.leagueTier].map((c) =>
      c.id === updated.id ? updated : c,
    ),
  };
}

function syncClubDepthIds(club: Club, nextRoster: Player[]): Club {
  const rosterIds = new Set(nextRoster.map((p) => p.id));
  const rotationIds = nextRoster
    .filter((p) => p.position === 'SP')
    .map((p) => p.id);
  const bullpenIds = nextRoster
    .filter((p) => p.position === 'RP')
    .map((p) => p.id);
  const hitters = nextRoster.filter((p) => !isPitcherPosition(p.position));
  const keepLineup =
    club.lineup.length === 9 && club.lineup.every((s) => rosterIds.has(s.playerId));
  const nextLineup = keepLineup
    ? club.lineup
    : hitters.length >= 9
      ? buildOptimalLineup(nextRoster)
      : club.lineup.filter((s) => rosterIds.has(s.playerId));
  return {
    ...club,
    roster: nextRoster,
    lineup: nextLineup,
    rotationIds: rotationIds.length > 0 ? rotationIds : club.rotationIds.filter((id) => rosterIds.has(id)),
    bullpenIds: bullpenIds.length > 0 ? bullpenIds : club.bullpenIds.filter((id) => rosterIds.has(id)),
  };
}

function processSingleClubRetirementsAndExpirations(
  rng: SeededRng,
  club: Club,
  isHuman: boolean,
): {
  club: Club;
  retired: RetiredPlayerNotice[];
  coachCandidates: RetiredLegendCoachCandidate[];
  humanExpiring: Player[];
  releasedToFa: Player[];
} {
  const retired: RetiredPlayerNotice[] = [];
  const coachCandidates: RetiredLegendCoachCandidate[] = [];
  const humanExpiring: Player[] = [];
  const releasedToFa: Player[] = [];
  const retained: Player[] = [];
  const clubLabel = `${club.city} ${club.name}`;

  for (const player of club.roster) {
    const retirement = evaluateRetirementAndCoachTransition(rng, player, clubLabel);
    if (retirement.retires) {
      retired.push({
        playerId: player.id,
        playerName: player.name,
        clubId: club.id,
        clubName: clubLabel,
        position: player.position,
        age: player.age,
        seasonsPlayed: player.careerService.seasonsPlayed,
      });
      if (retirement.coachCandidate) {
        coachCandidates.push(retirement.coachCandidate);
      }
      continue;
    }

    const nextYears = player.contract.yearsRemaining - 1;
    if (nextYears > 0) {
      retained.push({
        ...player,
        contract: { ...player.contract, yearsRemaining: nextYears },
      });
      continue;
    }

    const expiringPlayer: Player = {
      ...player,
      contract: { ...player.contract, yearsRemaining: 0 },
    };
    if (isHuman) {
      humanExpiring.push(expiringPlayer);
      continue;
    }

    const payrollSoFar = computeClubPayroll(retained);
    const fitsCap = payrollSoFar + expiringPlayer.contract.salaryPerSeason <= TIER_SALARY_CAPS[club.leagueTier];
    if (fitsCap && retained.length < MAX_ACTIVE_ROSTER_SIZE && rng.chance(0.55)) {
      retained.push({
        ...expiringPlayer,
        contract: { ...expiringPlayer.contract, yearsRemaining: rng.int(1, 3) },
      });
    } else {
      releasedToFa.push({
        ...expiringPlayer,
        contract: { ...expiringPlayer.contract, yearsRemaining: rng.int(1, 3) },
      });
    }
  }

  return {
    club: syncClubDepthIds(club, retained),
    retired,
    coachCandidates,
    humanExpiring,
    releasedToFa,
  };
}

function generateDraftProspects(rng: SeededRng, tier: LeagueTierId, count: number): Player[] {
  const prospects: Player[] = [];
  for (let i = 0; i < count; i += 1) {
    const pos = DRAFT_POSITIONS[i % DRAFT_POSITIONS.length];
    const rookie = createPlayer(rng, {
      position: pos,
      tier,
      marketTier: 'rookie',
    });
    prospects.push({
      ...rookie,
      contract: {
        ...rookie.contract,
        yearsRemaining: 3,
        signingBonus: Math.min(200, rookie.contract.signingBonus),
        salaryPerSeason: Math.min(450, rookie.contract.salaryPerSeason),
      },
    });
  }
  return prospects;
}

/** Starts a full multi-step Offseason: promotion/relegation, retirements, expiring contracts, draft class & FA market. */
export function beginOffseasonCycle(
  leagues: Readonly<Record<LeagueTierId, Club[]>>,
  humanClubId: string,
  worldSeed: number,
  seasonJustEnded: number,
  championsByTier?: Partial<Record<LeagueTierId, string>>,
): OffseasonState {
  const rng = createSeededRng(worldSeed + seasonJustEnded * 4099);
  const offseasonWorld = advanceOffseasonWorld(leagues, worldSeed + seasonJustEnded * 997, championsByTier);
  const worldChampionClubId =
    championsByTier?.majors ?? offseasonWorld.leagues.majors[0].id;

  const retirements: RetiredPlayerNotice[] = [];
  const retiredCoachCandidates: RetiredLegendCoachCandidate[] = [];
  let pendingExpiringPlayers: Player[] = [];
  const releasedToFa: Player[] = [];
  const processedLeagues = {} as Record<LeagueTierId, Club[]>;

  for (const tier of LEAGUE_TIER_ORDER) {
    processedLeagues[tier] = offseasonWorld.leagues[tier].map((club) => {
      const res = processSingleClubRetirementsAndExpirations(rng, club, club.id === humanClubId);
      retirements.push(...res.retired);
      retiredCoachCandidates.push(...res.coachCandidates);
      if (club.id === humanClubId) {
        pendingExpiringPlayers = res.humanExpiring;
      }
      releasedToFa.push(...res.releasedToFa);
      return res.club;
    });
  }

  const humanClub = findClub(processedLeagues, humanClubId);
  const humanTier: LeagueTierId = humanClub?.leagueTier ?? 'rookie';
  const freshFa = generateMarketPool(createSeededRng(worldSeed + seasonJustEnded * 733), humanTier, 10);
  const draftPool = generateDraftProspects(
    createSeededRng(worldSeed + seasonJustEnded * 521),
    humanTier,
    24,
  );

  return {
    seasonJustEnded,
    nextSeasonNumber: seasonJustEnded + 1,
    worldSeed,
    humanClubId,
    worldChampionClubId,
    humanWonWorldChampionship: worldChampionClubId === humanClubId,
    transitions: offseasonWorld.transitions,
    retirements,
    retiredCoachCandidates,
    leagues: processedLeagues,
    pendingExpiringPlayers,
    draftPool,
    draftRoundsRemaining: 3,
    freeAgentPool: [...releasedToFa.slice(0, 14), ...freshFa],
  };
}

/** Resolves an expiring human-club contract: Re-Sign (under Salary Cap) or Release into Free Agency. */
export function resolveExpiringContractDecision(
  state: OffseasonState,
  playerId: string,
  decision: 'resign' | 'release',
  offeredYears = 2,
): { applied: boolean; reason?: string; state: OffseasonState } {
  const player = state.pendingExpiringPlayers.find((p) => p.id === playerId);
  const humanClub = findClub(state.leagues, state.humanClubId);
  if (!player || !humanClub) {
    return { applied: false, reason: 'Expiring player not found.', state };
  }

  const remainingPending = state.pendingExpiringPlayers.filter((p) => p.id !== playerId);
  if (decision === 'release') {
    const releasedPlayer: Player = {
      ...player,
      contract: { ...player.contract, yearsRemaining: Math.max(1, offeredYears) },
    };
    return {
      applied: true,
      state: {
        ...state,
        pendingExpiringPlayers: remainingPending,
        freeAgentPool: [releasedPlayer, ...state.freeAgentPool],
      },
    };
  }

  const rosterCheck = validateRosterAddition(humanClub.roster, player.id);
  if (!rosterCheck.allowed) return { applied: false, reason: rosterCheck.reason, state };

  const capCheck = validateSalaryCapRoom(humanClub, player.contract.salaryPerSeason);
  if (!capCheck.allowed) return { applied: false, reason: capCheck.reason, state };

  const resigned: Player = {
    ...player,
    contract: {
      ...player.contract,
      yearsRemaining: Math.max(1, Math.min(4, offeredYears)),
    },
  };
  const updatedClub = syncClubDepthIds(humanClub, [...humanClub.roster, resigned]);
  return {
    applied: true,
    state: {
      ...state,
      leagues: replaceClub(state.leagues, updatedClub),
      pendingExpiringPlayers: remainingPending,
    },
  };
}

/** Drafts an Amateur Draft prospect for the human club and simulates AI picks for that round. */
export function draftOffseasonProspect(
  state: OffseasonState,
  prospectId: string,
): { drafted: boolean; reason?: string; state: OffseasonState } {
  if (state.draftRoundsRemaining <= 0) {
    return { drafted: false, reason: 'All 3 Amateur Draft rounds are complete.', state };
  }
  const prospect = state.draftPool.find((p) => p.id === prospectId);
  const humanClub = findClub(state.leagues, state.humanClubId);
  if (!prospect || !humanClub) {
    return { drafted: false, reason: 'Draft prospect is no longer on the board.', state };
  }

  const rosterCheck = validateRosterAddition(humanClub.roster, prospect.id);
  if (!rosterCheck.allowed) return { drafted: false, reason: rosterCheck.reason, state };
  const capCheck = validateSalaryCapRoom(humanClub, prospect.contract.salaryPerSeason);
  if (!capCheck.allowed) return { drafted: false, reason: capCheck.reason, state };

  const updatedHuman = syncClubDepthIds(humanClub, [...humanClub.roster, prospect]);
  let remainingPool = state.draftPool.filter((p) => p.id !== prospectId);

  // Let rival AI clubs in the same tier draft 1 prospect each this round
  const nextTierClubs = state.leagues[humanClub.leagueTier].map((club) => {
    if (club.id === humanClub.id) return updatedHuman;
    if (club.roster.length >= MAX_ACTIVE_ROSTER_SIZE || remainingPool.length === 0) return club;
    const aiPick = remainingPool[0];
    if (!validateSalaryCapRoom(club, aiPick.contract.salaryPerSeason).allowed) return club;
    remainingPool = remainingPool.slice(1);
    return syncClubDepthIds(club, [...club.roster, aiPick]);
  });

  return {
    drafted: true,
    state: {
      ...state,
      leagues: {
        ...state.leagues,
        [humanClub.leagueTier]: nextTierClubs,
      },
      draftPool: remainingPool,
      draftRoundsRemaining: state.draftRoundsRemaining - 1,
    },
  };
}

/** Signs an available offseason Free Agent under the 20-man roster limit and Tier Salary Cap. */
export function signOffseasonFreeAgent(
  state: OffseasonState,
  playerId: string,
): { signed: boolean; reason?: string; state: OffseasonState } {
  const agent = state.freeAgentPool.find((p) => p.id === playerId);
  const humanClub = findClub(state.leagues, state.humanClubId);
  if (!agent || !humanClub) {
    return { signed: false, reason: 'Free agent is no longer available.', state };
  }

  const rosterCheck = validateRosterAddition(humanClub.roster, agent.id);
  if (!rosterCheck.allowed) return { signed: false, reason: rosterCheck.reason, state };
  const capCheck = validateSalaryCapRoom(humanClub, agent.contract.salaryPerSeason);
  if (!capCheck.allowed) return { signed: false, reason: capCheck.reason, state };
  if (humanClub.economy.cash < agent.contract.signingBonus) {
    return {
      signed: false,
      reason: `Need $${agent.contract.signingBonus.toLocaleString()} signing bonus.`,
      state,
    };
  }

  const updatedClub: Club = {
    ...syncClubDepthIds(humanClub, [...humanClub.roster, agent]),
    economy: {
      ...humanClub.economy,
      cash: humanClub.economy.cash - agent.contract.signingBonus,
    },
  };
  return {
    signed: true,
    state: {
      ...state,
      leagues: replaceClub(state.leagues, updatedClub),
      freeAgentPool: state.freeAgentPool.filter((p) => p.id !== playerId),
    },
  };
}

function ensureMinimumLegalClubRoster(rng: SeededRng, club: Club): Club {
  const roster = [...club.roster];
  const requiredPositions: FieldPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SP', 'SP', 'RP', 'RP'];

  for (const reqPos of requiredPositions) {
    const count = roster.filter((p) => p.position === reqPos).length;
    const minNeeded = reqPos === 'SP' || reqPos === 'RP' ? 2 : 1;
    if (count < minNeeded && roster.length < MAX_ACTIVE_ROSTER_SIZE) {
      const callup = createPlayer(rng, {
        position: reqPos,
        tier: club.leagueTier,
        marketTier: 'rookie',
      });
      roster.push({
        ...callup,
        contract: { ...callup.contract, salaryPerSeason: 320, signingBonus: 0, yearsRemaining: 2 },
      });
    }
  }

  let fillerIdx = 0;
  while (roster.length < MIN_ACTIVE_ROSTER_SIZE) {
    const pos = DRAFT_POSITIONS[fillerIdx % DRAFT_POSITIONS.length];
    fillerIdx += 1;
    const callup = createPlayer(rng, {
      position: pos,
      tier: club.leagueTier,
      marketTier: 'below_average',
    });
    roster.push({
      ...callup,
      contract: { ...callup.contract, salaryPerSeason: 300, signingBonus: 0, yearsRemaining: 1 },
    });
  }

  const finalRoster = roster.slice(0, MAX_ACTIVE_ROSTER_SIZE);
  const hitterPositions: FieldPosition[] = ['LF', 'RF', '1B', '3B', '2B', 'CF', 'SS', 'C'];
  let extraBatIdx = 0;
  while (finalRoster.filter((p) => !isPitcherPosition(p.position)).length < 9) {
    if (finalRoster.length >= MAX_ACTIVE_ROSTER_SIZE) {
      const dropPitcherIdx = finalRoster.findIndex((p) => isPitcherPosition(p.position));
      if (dropPitcherIdx === -1) break;
      finalRoster.splice(dropPitcherIdx, 1);
    }
    const emergencyBat = createPlayer(rng, {
      position: hitterPositions[extraBatIdx % hitterPositions.length],
      tier: club.leagueTier,
      marketTier: 'rookie',
    });
    extraBatIdx += 1;
    finalRoster.push({
      ...emergencyBat,
      contract: { ...emergencyBat.contract, salaryPerSeason: 300, signingBonus: 0, yearsRemaining: 1 },
    });
  }
  return syncClubDepthIds(club, finalRoster);
}

/** Finalizes Offseason: moves unresolved expiring contracts to FA and ensures legal 15–20 man Opening Day rosters. */
export function completeOffseasonCycle(state: OffseasonState): {
  leagues: Record<LeagueTierId, Club[]>;
  freeAgents: Player[];
  nextSeasonNumber: number;
} {
  const rng = createSeededRng(state.worldSeed + state.nextSeasonNumber * 8803);
  const nextLeagues = {} as Record<LeagueTierId, Club[]>;
  for (const tier of LEAGUE_TIER_ORDER) {
    nextLeagues[tier] = state.leagues[tier].map((club) => ensureMinimumLegalClubRoster(rng, club));
  }

  const leftoverExpiring = state.pendingExpiringPlayers.map((p) => ({
    ...p,
    contract: { ...p.contract, yearsRemaining: 1 },
  }));
  return {
    leagues: nextLeagues,
    freeAgents: [...leftoverExpiring, ...state.freeAgentPool].slice(0, 18),
    nextSeasonNumber: state.nextSeasonNumber,
  };
}
