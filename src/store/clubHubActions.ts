import {
  commissionHomeBallpark,
  type BallparkPresetId,
} from '../engine/ballparks/stadiumCatalog';
import {
  upgradeStadiumFacility,
  type StadiumUpgradeId,
} from '../engine/ballparks/stadiumProgression';
import {
  applyUniformToClub,
  type UniformCustomization,
} from '../engine/customization/uniformDesigner';
import {
  buildDistrictBuilding,
  evaluateDistrictBonuses,
  type DistrictBuildingId,
} from '../engine/economy/districtBuilder';
import {
  signParodySponsor,
  signTvContract,
} from '../engine/economy/sponsorsTv';
import {
  applyExhibitionDuelRewards,
  runFriendExhibitionDuel,
  type ExhibitionDuelResult,
} from '../engine/events/exhibitionDuel';
import {
  applySurpriseEventChoice,
  type SurpriseEventCard,
  type SurpriseEventChoice,
} from '../engine/events/surpriseDeck';
import {
  applyJuneMiracleScenario,
  claimTimeCapsuleReward,
  type TimeCapsuleChallengeId,
  type TimeCapsuleContext,
} from '../engine/events/timeCapsuleChallenges';
import {
  callUpAcademyProspect,
  runAcademyPassiveDevelopment,
  stashProspectInAcademy,
} from '../engine/gm/academy';
import {
  evaluateClubStaffBonuses,
  fireStaffMember,
  hireStaffMember,
  runOffseasonCoachingClinic,
} from '../engine/gm/coaches';
import { createPlayer } from '../engine/gm/rosterFactory';
import {
  executeTradeProposal,
  type TradeProposal,
} from '../engine/gm/tradeEngine';
import type { GameLengthInnings } from '../engine/models/player';
import {
  runWinterBallAssignment,
  type WinterBallReport,
  type WinterLeagueId,
} from '../engine/gm/winterBall';
import { setPlayerPlayThroughStatus } from '../engine/health/healthEngine';
import {
  athleticTrainerToStaffMember,
  teamDoctorToStaffMember,
  type AthleticTrainer,
  type TeamDoctor,
} from '../engine/health/medicalStaff';
import { retirePlayerJerseyNumber } from '../engine/league/awards';
import {
  evaluateManagerTreePassives,
  unlockManagerSkillNode,
} from '../engine/manager/managerTree';
import type { Club, LeagueTierId } from '../engine/models/club';
import type { StaffMember } from '../engine/models/manager';
import { createSeededRng } from '../engine/rng/seededRng';
import {
  runPracticeComplexActivity,
  type PracticeComplexRequest,
} from '../engine/rpg/practiceEngine';
import {
  equipRelicOnPlayer,
  unequipRelicFromPlayer,
} from '../engine/rpg/relics';
import { hireRetiredLegendCoachForClub } from '../engine/league/playoffBracket';
import type { RetiredLegendCoachCandidate } from '../engine/rpg/lifecycle';
import { useGameStore } from './gameStore';

function replaceHumanClub(
  leagues: Record<LeagueTierId, Club[]>,
  updated: Club,
): Record<LeagueTierId, Club[]> {
  return {
    ...leagues,
    [updated.leagueTier]: leagues[updated.leagueTier].map((c) =>
      c.id === updated.id ? updated : c,
    ),
  };
}

function replaceClubsInTier(
  leagues: Record<LeagueTierId, Club[]>,
  tier: LeagueTierId,
  replacements: readonly Club[],
): Record<LeagueTierId, Club[]> {
  const map = new Map(replacements.map((c) => [c.id, c]));
  return {
    ...leagues,
    [tier]: leagues[tier].map((c) => map.get(c.id) ?? c),
  };
}

export function hireHumanClubStaff(candidate: StaffMember): { hired: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { hired: false, reason: 'No active club.' };
  const res = hireStaffMember(club, candidate);
  if (!res.hired) return { hired: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { hired: true };
}

export function hireHumanTeamDoctor(doctor: TeamDoctor): { hired: boolean; reason?: string } {
  return hireHumanClubStaff(teamDoctorToStaffMember(doctor));
}

export function hireHumanAthleticTrainer(
  trainer: AthleticTrainer,
): { hired: boolean; reason?: string } {
  return hireHumanClubStaff(athleticTrainerToStaffMember(trainer));
}

export function fireHumanClubStaff(staffId: string): void {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return;
  const updated = fireStaffMember(club, staffId);
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, updated) });
}

export function runHumanStaffClinic(staffId: string): { upgraded: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { upgraded: false, reason: 'No active club.' };
  const res = runOffseasonCoachingClinic(club, staffId);
  if (!res.upgraded) return { upgraded: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { upgraded: true };
}

export function commissionHumanBallpark(
  targetId: BallparkPresetId,
): { commissioned: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { commissioned: false, reason: 'No active club.' };
  const res = commissionHomeBallpark(club, targetId);
  if (!res.commissioned) return { commissioned: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { commissioned: true };
}

export function upgradeHumanStadium(
  upgradeId: StadiumUpgradeId,
): { upgraded: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { upgraded: false, reason: 'No active club.' };
  const res = upgradeStadiumFacility(club, upgradeId);
  if (!res.upgraded) return { upgraded: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { upgraded: true };
}

export function updateHumanEconomyPricing(
  ticketPrice: number,
  concessionPrice: number,
  concessionQuality: 1 | 2 | 3,
): void {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return;
  const updatedClub: Club = {
    ...club,
    economy: {
      ...club.economy,
      ticketPrice: Math.max(4, Math.min(60, Math.round(ticketPrice))),
      concessionPrice: Math.max(2, Math.min(24, Math.round(concessionPrice))),
      concessionQuality,
    },
  };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, updatedClub) });
}

export function signHumanParodySponsor(
  sponsorId: string,
): { signed: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { signed: false, reason: 'No active club.' };
  const res = signParodySponsor(club, sponsorId);
  if (!res.signed) return { signed: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { signed: true };
}

export function signHumanTvContract(
  tvContractId: string,
): { signed: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { signed: false, reason: 'No active club.' };
  const res = signTvContract(club, tvContractId);
  if (!res.signed) return { signed: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { signed: true };
}

export function buildHumanDistrictTile(
  slotId: string,
  buildingId: DistrictBuildingId,
): { built: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { built: false, reason: 'No active club.' };
  const res = buildDistrictBuilding(club, slotId, buildingId);
  if (!res.built) return { built: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { built: true };
}

export function resolveHumanSurpriseEvent(
  card: SurpriseEventCard,
  choiceId: string,
): { applied: boolean; choice: SurpriseEventChoice | null; boostedPlayerName?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { applied: false, choice: null };
  const rng = createSeededRng(state.worldSeed + state.rosterActionNonce * 419 + 17);
  const res = applySurpriseEventChoice(rng, club, card, choiceId);
  if (!res.applied) return { applied: false, choice: null };
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, res.club),
  });
  return {
    applied: true,
    choice: res.choice,
    boostedPlayerName: res.boostedPlayerName,
  };
}

export function executeHumanTradeWithRival(
  rivalClubId: string,
  proposal: TradeProposal,
): { executed: boolean; reason: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { executed: false, reason: 'No active club.' };
  const tierClubs = state.leagues[club.leagueTier] ?? [];
  const rival = tierClubs.find((c) => c.id === rivalClubId);
  if (!rival) return { executed: false, reason: 'Rival club not found in tier.' };

  const res = executeTradeProposal(club, rival, proposal);
  if (!res.executed) return { executed: false, reason: res.reason };

  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceClubsInTier(state.leagues, club.leagueTier, [res.clubA, res.clubB]),
  });
  return { executed: true, reason: res.reason };
}

export function runHumanWinterBall(
  playerIds: readonly string[],
  destinationId: WinterLeagueId,
): WinterBallReport {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) {
    return { sent: false, reason: 'No active club.', club: null as never, graduates: [], totalCost: 0 };
  }
  const rng = createSeededRng(state.worldSeed + state.rosterActionNonce * 571 + 31);
  const report = runWinterBallAssignment(rng, club, playerIds, destinationId);
  if (!report.sent) return report;
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, report.club),
  });
  return report;
}

export function retireHumanPlayerJersey(
  playerId: string,
): { retired: boolean; reason?: string; jerseyNumber?: number; playerName?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { retired: false, reason: 'No active club.' };
  const player = club.roster.find((p) => p.id === playerId);
  if (!player) return { retired: false, reason: 'Player not found.' };
  const res = retirePlayerJerseyNumber(club, player);
  if (!res.retired) return { retired: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { retired: true, jerseyNumber: player.jerseyNumber, playerName: player.name };
}

export function launchHumanJuneMiracleScenario(): { launched: boolean; summary: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { launched: false, summary: 'No active club.' };
  const scenarioClub = applyJuneMiracleScenario(club);
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, scenarioClub) });
  return {
    launched: true,
    summary:
      '1994 June Miracle active! Your squad is 1–10 with +$4,500 emergency cash — rally to 11+ wins to survive!',
  };
}

export function claimHumanTimeCapsuleReward(
  challengeId: TimeCapsuleChallengeId,
  claimedIds: readonly TimeCapsuleChallengeId[],
  ctx: TimeCapsuleContext = {},
): { claimed: boolean; reason?: string; claimedIds: TimeCapsuleChallengeId[] } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { claimed: false, reason: 'No active club.', claimedIds: [...claimedIds] };
  const res = claimTimeCapsuleReward(club, challengeId, claimedIds, ctx);
  if (!res.claimed) return { claimed: false, reason: res.reason, claimedIds: res.claimedIds };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { claimed: true, claimedIds: res.claimedIds };
}

export function runHumanPracticeActivity(
  playerId: string,
  request: PracticeComplexRequest,
): { trained: boolean; summary: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { trained: false, summary: 'No active club.' };
  const player = club.roster.find((p) => p.id === playerId);
  if (!player) return { trained: false, summary: 'Player not found.' };

  const rng = createSeededRng(state.worldSeed + state.rosterActionNonce * 293);
  const staffBonuses = evaluateClubStaffBonuses(club.coaches.activeStaff ?? []);
  const managerPassives = evaluateManagerTreePassives(state.manager);
  const res = runPracticeComplexActivity(rng, player, request, {
    staffBonuses,
    managerPassives,
  });
  if (!res.trained) return { trained: false, summary: res.summary };

  const updatedClub: Club = {
    ...club,
    roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
    economy: {
      ...club.economy,
      teamHype: Math.min(100, club.economy.teamHype + res.clubHypeDelta),
    },
  };
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, updatedClub),
  });
  return { trained: true, summary: res.summary };
}

export function unlockHumanManagerNode(nodeId: string): { unlocked: boolean; reason?: string } {
  const state = useGameStore.getState();
  if (!state.manager) return { unlocked: false, reason: 'No active manager.' };
  const res = unlockManagerSkillNode(state.manager, nodeId);
  if (!res.unlocked) return { unlocked: false, reason: res.reason };
  useGameStore.setState({ manager: res.manager });
  return { unlocked: true };
}

export function equipHumanPlayerRelic(
  playerId: string,
  relicId: string,
): { equipped: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { equipped: false, reason: 'No active club.' };
  const target = club.roster.find((p) => p.id === playerId);
  if (!target) return { equipped: false, reason: 'Player not found.' };
  const res = equipRelicOnPlayer(target, relicId);
  if (!res.equipped) return { equipped: false, reason: res.reason };
  const updatedClub: Club = {
    ...club,
    roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
  };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, updatedClub) });
  return { equipped: true };
}

export function unequipHumanPlayerRelic(playerId: string, relicId: string): void {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return;
  const updatedClub: Club = {
    ...club,
    roster: club.roster.map((p) =>
      p.id === playerId ? unequipRelicFromPlayer(p, relicId) : p,
    ),
  };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, updatedClub) });
}

export function applyHumanUniformCustomization(
  config: UniformCustomization,
): { applied: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { applied: false, reason: 'No active club.' };
  const updated = applyUniformToClub(club, config);
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, updated) });
  return { applied: true };
}

const ACADEMY_SCOUT_COST = 900;

export function scoutAndStashHumanAcademyProspect(): {
  stashed: boolean;
  reason?: string;
  prospectName?: string;
} {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { stashed: false, reason: 'No active club.' };
  if (club.economy.cash < ACADEMY_SCOUT_COST) {
    return {
      stashed: false,
      reason: `Need $${ACADEMY_SCOUT_COST.toLocaleString()} scouting budget to sign a Youth Academy prospect.`,
    };
  }
  const rng = createSeededRng(state.worldSeed + state.rosterActionNonce * 733 + 19);
  const positions = ['SS', 'CF', 'SP', 'RP', 'C', '3B', 'RF', '2B', '1B', 'LF'] as const;
  const rawProspect = createPlayer(rng, {
    position: rng.pick(positions),
    tier: club.leagueTier,
    marketTier: 'rookie',
  });
  const youthProspect = {
    ...rawProspect,
    age: rng.int(18, 20),
    contract: {
      ...rawProspect.contract,
      salaryPerSeason: Math.min(rawProspect.contract.salaryPerSeason, 500),
      yearsRemaining: 3,
    },
  };
  const res = stashProspectInAcademy(club, youthProspect);
  if (!res.stashed) return { stashed: false, reason: res.reason };
  const chargedClub: Club = {
    ...res.club,
    economy: {
      ...res.club.economy,
      cash: res.club.economy.cash - ACADEMY_SCOUT_COST,
    },
  };
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, chargedClub),
  });
  return { stashed: true, prospectName: youthProspect.name };
}

export function runHumanAcademyTrainingCamp(): {
  developedCount: number;
  summary: string;
} {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { developedCount: 0, summary: 'No active club.' };
  const district = evaluateDistrictBonuses(club.stadium.districtTiles);
  const rng = createSeededRng(state.worldSeed + state.rosterActionNonce * 617 + 7);
  const res = runAcademyPassiveDevelopment(rng, club, district.trainingBonus);
  if (res.developedCount === 0) {
    return { developedCount: 0, summary: 'Scout at least 1 Youth Prospect into your Academy first!' };
  }
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, res.club),
  });
  return {
    developedCount: res.developedCount,
    summary: `Academy Camp boosted ${res.developedCount} farm prospect(s) with XP & tool polish!`,
  };
}

export function callUpHumanAcademyProspect(prospectId: string): {
  calledUp: boolean;
  reason?: string;
  debutBoostBanner?: string;
} {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { calledUp: false, reason: 'No active club.' };
  const res = callUpAcademyProspect(club, prospectId);
  if (!res.calledUp) return { calledUp: false, reason: res.reason };
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, res.club),
  });
  return { calledUp: true, debutBoostBanner: res.debutBoostBanner };
}

export function runHumanFriendExhibitionDuel(
  challengerClub: Club,
  innings: GameLengthInnings = 5,
): { played: boolean; result?: ExhibitionDuelResult; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { played: false, reason: 'No active club.' };
  const seed = state.worldSeed + state.rosterActionNonce * 941 + 88;
  const duel = runFriendExhibitionDuel(club, challengerClub, { innings, seed });
  const rewardedClub = applyExhibitionDuelRewards(club, duel);
  useGameStore.setState({
    rosterActionNonce: state.rosterActionNonce + 1,
    leagues: replaceHumanClub(state.leagues, rewardedClub),
  });
  return { played: true, result: duel };
}

export function setHumanPlayerPlayThrough(
  playerId: string,
  playingThrough: boolean,
): { allowed: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { allowed: false, reason: 'No active club.' };
  const target = club.roster.find((p) => p.id === playerId);
  if (!target) return { allowed: false, reason: 'Player not found.' };
  const res = setPlayerPlayThroughStatus(target, playingThrough);
  if (!res.allowed) return { allowed: false, reason: res.reason };
  const updatedClub: Club = {
    ...club,
    roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
  };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, updatedClub) });
  return { allowed: true };
}

export function hireHumanRetiredLegendCoach(
  legend: RetiredLegendCoachCandidate,
): { hired: boolean; reason?: string; coachName?: string } {
  const state = useGameStore.getState();
  const baseClub = state.activeOffseason
    ? Object.values(state.activeOffseason.leagues)
        .flat()
        .find((c) => c.id === state.activeOffseason?.humanClubId) ?? state.getHumanClub()
    : state.getHumanClub();
  if (!baseClub) return { hired: false, reason: 'No active club.' };

  const res = hireRetiredLegendCoachForClub(baseClub, legend);
  if (!res.hired) return { hired: false, reason: res.reason };

  const nextLeagues = replaceHumanClub(state.leagues, res.club);
  if (state.activeOffseason) {
    useGameStore.setState({
      leagues: nextLeagues,
      activeOffseason: {
        ...state.activeOffseason,
        leagues: replaceHumanClub(state.activeOffseason.leagues, res.club),
        retiredCoachCandidates: state.activeOffseason.retiredCoachCandidates.filter(
          (c) => c.formerPlayerId !== legend.formerPlayerId,
        ),
      },
    });
  } else {
    useGameStore.setState({ leagues: nextLeagues });
  }
  return { hired: true, coachName: res.staff.name };
}
