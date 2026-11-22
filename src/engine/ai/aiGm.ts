import {
  beginOffseasonCycle,
  completeOffseasonCycle,
} from '../gm/offseasonEngine';
import { buildOptimalLineup } from '../gm/rosterFactory';
import { evaluatePlatoonMatchup } from '../handedness/handedness';
import type { ThrowsHand } from '../handedness/types';
import {
  generateSixTierWorld,
  simulateBestOfThreePlayoffs,
  simulateSeriesRound,
} from '../league/seasonEngine';
import {
  LEAGUE_TIER_ORDER,
  type AiArchetype,
  type Club,
  type LeagueTierId,
  type LineupSlot,
} from '../models/club';
import {
  computePlayerOverall,
  isPitcherPosition,
  type GameLengthInnings,
  type Player,
} from '../models/player';
import { evaluatePitcherRoleSituation } from '../rpg/pitcherRoles';

export interface BullpenDecisionContext {
  inning: number;
  regulationInnings: GameLengthInnings;
  lead: number;
  leverageIndex: number;
  upcomingBatter: Player;
}

export interface HeadlessSoakSummary {
  seasonsCompleted: number;
  worldChampionsBySeason: string[];
  totalRetirements: number;
  finalClubs: Club[];
}

function scoreMashers(p: Player): number {
  return p.ratings.power * 0.55 + p.ratings.gapPower * 0.2 + p.ratings.contact * 0.15 + p.ratings.velocity * 0.1;
}

function scoreSpeedDemons(p: Player): number {
  return p.ratings.speed * 0.45 + p.ratings.contact * 0.25 + p.ratings.bunt * 0.15 + p.ratings.range * 0.15;
}

function scoreAceFactory(p: Player): number {
  if (isPitcherPosition(p.position)) {
    return p.ratings.velocity * 0.35 + p.ratings.movement * 0.3 + p.ratings.control * 0.25 + p.ratings.stamina * 0.1 + 18;
  }
  return computePlayerOverall(p) * 0.85;
}

function scoreDefenseFirst(p: Player): number {
  return p.ratings.fielding * 0.38 + p.ratings.range * 0.35 + p.ratings.arm * 0.17 + p.ratings.control * 0.1;
}

function scoreMoneyball(p: Player): number {
  const obpTools = p.ratings.eye * 0.35 + p.ratings.contact * 0.25 + p.ratings.control * 0.2;
  const ceiling = (p.statCaps.contact + p.statCaps.eye + p.statCaps.velocity) / 3;
  const costEfficiency = 24_000 / Math.max(400, p.contract.salaryPerSeason + 800);
  return obpTools + ceiling * 0.25 + Math.min(25, costEfficiency);
}

const ARCHETYPE_SCORERS: Readonly<Record<AiArchetype, (p: Player) => number>> = {
  mashers: scoreMashers,
  speed_demons: scoreSpeedDemons,
  ace_factory: scoreAceFactory,
  defense_first: scoreDefenseFirst,
  moneyball: scoreMoneyball,
};

/** Evaluates a player's strategic value under one of the 5 AI GM philosophies. */
export function scorePlayerForAiArchetype(archetype: AiArchetype, player: Player): number {
  const base = ARCHETYPE_SCORERS[archetype](player);
  const rookieUpside = player.marketTier === 'rookie' ? 4 : 0;
  return Number((base + rookieUpside).toFixed(2));
}

/** Selects the highest-valued prospect for an AI GM philosophy from a draft pool. */
export function selectAiDraftPick(
  archetype: AiArchetype,
  prospects: readonly Player[],
): Player | null {
  if (prospects.length === 0) return null;
  let best = prospects[0];
  let bestScore = scorePlayerForAiArchetype(archetype, best);
  for (let i = 1; i < prospects.length; i += 1) {
    const score = scorePlayerForAiArchetype(archetype, prospects[i]);
    if (score > bestScore) {
      best = prospects[i];
      bestScore = score;
    }
  }
  return best;
}

/** Builds a platoon-aware 9-man lineup optimized against an opposing LHP or RHP starter. */
export function buildAiPlatoonLineup(
  club: Club,
  opposingPitcherThrows: ThrowsHand,
): LineupSlot[] {
  const baseLineup = buildOptimalLineup(club.roster);
  const byId = new Map(club.roster.map((p) => [p.id, p]));
  const scored = baseLineup.map((slot) => {
    const player = byId.get(slot.playerId);
    const platoon = player
      ? evaluatePlatoonMatchup(player.bats, opposingPitcherThrows)
      : { batterContactDelta: 0, batterPowerDelta: 0 };
    const offenseScore = player
      ? player.ratings.contact +
        player.ratings.power +
        platoon.batterContactDelta * 2 +
        platoon.batterPowerDelta * 2
      : 0;
    return { slot, offenseScore };
  });

  scored.sort((a, b) => b.offenseScore - a.offenseScore);
  return scored.map((entry, idx) => ({
    ...entry.slot,
    orderIndex: idx,
  }));
}

const BULLPEN_ROLE_EDGE_CHECKERS: Readonly<
  Partial<
    Record<
      NonNullable<Player['pitcherRole']>,
      (ctx: BullpenDecisionContext, side: 'L' | 'R') => number
    >
  >
> = {
  closer: (ctx) => (ctx.inning >= ctx.regulationInnings && ctx.lead > 0 && ctx.lead <= 3 ? 28 : 0),
  loogy: (ctx, side) => (ctx.inning < ctx.regulationInnings && side === 'L' ? 22 : 0),
  fireman: (ctx) => (ctx.inning < ctx.regulationInnings && ctx.leverageIndex >= 1.65 ? 16 : 0),
};

function computeBullpenRoleEdge(
  reliever: Player,
  ctx: BullpenDecisionContext,
  effectiveBatterSide: 'L' | 'R',
): number {
  const checker = reliever.pitcherRole ? BULLPEN_ROLE_EDGE_CHECKERS[reliever.pitcherRole] : undefined;
  return checker ? checker(ctx, effectiveBatterSide) : 0;
}

function scoreBullpenCandidate(reliever: Player, ctx: BullpenDecisionContext): number {
  const effectiveBatterSide = ctx.upcomingBatter.bats === 'L' ? 'L' : 'R';
  const roleEval = evaluatePitcherRoleSituation(reliever, {
    inning: ctx.inning,
    lead: ctx.lead,
    hasRunnersOn: ctx.leverageIndex >= 1.4,
    leverageIndex: ctx.leverageIndex,
    batterEffectiveSide: effectiveBatterSide,
  });
  const roleEdge = computeBullpenRoleEdge(reliever, ctx, effectiveBatterSide);
  const weakPitch = ctx.upcomingBatter.batterPitchProfile.weakPitch;
  const arsenalCountersWeak = reliever.pitchArsenal?.repertoire.some((s) => s.pitchType === weakPitch)
    ? 6
    : 0;
  return (
    computePlayerOverall(reliever) +
    roleEval.stuffDelta * 2 +
    roleEval.controlDelta * 1.5 +
    roleEdge +
    arsenalCountersWeak
  );
}

/** Picks the smartest available bullpen reliever weighing Closer/Setup/LOOGY/Fireman roles & pitch matchups. */
export function chooseAiBullpenReliever(
  availableRelievers: readonly Player[],
  ctx: BullpenDecisionContext,
): Player | null {
  if (availableRelievers.length === 0) return null;
  let best = availableRelievers[0];
  let bestScore = scoreBullpenCandidate(best, ctx);
  for (let i = 1; i < availableRelievers.length; i += 1) {
    const score = scoreBullpenCandidate(availableRelievers[i], ctx);
    if (score > bestScore) {
      best = availableRelievers[i];
      bestScore = score;
    }
  }
  return best;
}

/** Runs a fast multi-season headless soak test validating roster legality, aging, retirements & stability. */
export function runTenSeasonHeadlessSoak(
  worldSeed: number,
  seasons = 10,
): HeadlessSoakSummary {
  const world = generateSixTierWorld(worldSeed, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
  let leagues = world.leagues;
  const worldChampionsBySeason: string[] = [];
  let totalRetirements = 0;

  for (let season = 1; season <= seasons; season += 1) {
    const championsByTier: Partial<Record<LeagueTierId, string>> = {};
    LEAGUE_TIER_ORDER.forEach((tier, tierIdx) => {
      // Simulate 2 brisk series rounds + Best-of-3 playoffs per tier for fast multi-season soak validation
      let tierClubs = leagues[tier];
      for (let series = 0; series < 2; series += 1) {
        tierClubs = simulateSeriesRound(
          tierClubs,
          series,
          worldSeed + season * 1000 + tierIdx * 97 + series * 13,
          5,
        ).clubs;
      }
      const playoffs = simulateBestOfThreePlayoffs(
        tierClubs,
        worldSeed + season * 2000 + tierIdx * 131,
        5,
      );
      championsByTier[tier] = playoffs.championClubId;
      leagues = { ...leagues, [tier]: tierClubs };
    });

    const offseason = beginOffseasonCycle(
      leagues,
      world.humanClubId,
      worldSeed,
      season,
      championsByTier,
    );
    worldChampionsBySeason.push(offseason.worldChampionClubId);
    totalRetirements += offseason.retirements.length;
    leagues = completeOffseasonCycle(offseason).leagues;
  }

  return {
    seasonsCompleted: seasons,
    worldChampionsBySeason,
    totalRetirements,
    finalClubs: LEAGUE_TIER_ORDER.flatMap((tier) => leagues[tier]),
  };
}
