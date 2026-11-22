import {
  commissionHomeBallpark,
  type BallparkPresetId,
} from '../engine/ballparks/stadiumCatalog';
import {
  evaluateClubStaffBonuses,
  fireStaffMember,
  hireStaffMember,
  runOffseasonCoachingClinic,
} from '../engine/gm/coaches';
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

export function hireHumanClubStaff(candidate: StaffMember): { hired: boolean; reason?: string } {
  const state = useGameStore.getState();
  const club = state.getHumanClub();
  if (!club) return { hired: false, reason: 'No active club.' };
  const res = hireStaffMember(club, candidate);
  if (!res.hired) return { hired: false, reason: res.reason };
  useGameStore.setState({ leagues: replaceHumanClub(state.leagues, res.club) });
  return { hired: true };
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
