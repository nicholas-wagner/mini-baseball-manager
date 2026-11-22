import {
  MAX_ACADEMY_ROSTER_SIZE,
  type Club,
} from '../models/club';
import { isPitcherPosition, type Player } from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { validateRosterAddition } from './marketTiers';
import { validateSalaryCapRoom } from './offseasonEngine';

/** Stashes a young prospect into the 6-slot Farm Academy without clogging the 20-man active roster. */
export function stashProspectInAcademy(
  club: Club,
  prospect: Player,
): { stashed: boolean; reason?: string; club: Club } {
  if (club.academyProspects.length >= MAX_ACADEMY_ROSTER_SIZE) {
    return {
      stashed: false,
      reason: `Prospect Academy full (${MAX_ACADEMY_ROSTER_SIZE}/${MAX_ACADEMY_ROSTER_SIZE}).`,
      club,
    };
  }
  if (club.academyProspects.some((p) => p.id === prospect.id)) {
    return { stashed: false, reason: 'Prospect is already in the Academy.', club };
  }
  return {
    stashed: true,
    club: {
      ...club,
      academyProspects: [...club.academyProspects, prospect],
    },
  };
}

/** Runs passive series XP & minor skill-polish training across every stashed Farm Academy prospect. */
export function runAcademyPassiveDevelopment(
  rng: SeededRng,
  club: Club,
  academyFacilityBonus = 0,
): { club: Club; developedCount: number } {
  if (club.academyProspects.length === 0) return { club, developedCount: 0 };

  const nextProspects = club.academyProspects.map((p) => {
    const xpGain = Math.round((45 + academyFacilityBonus * 15) * p.xpGrowthMultiplier);
    const boostKey = isPitcherPosition(p.position)
      ? rng.pick(['velocity', 'movement', 'control'] as const)
      : rng.pick(['contact', 'power', 'eye', 'fielding'] as const);
    const currentVal = p.ratings[boostKey];
    const capVal = p.statCaps[boostKey];
    const bumped = currentVal < capVal && rng.chance(0.45) ? currentVal + 1 : currentVal;
    return {
      ...p,
      xp: p.xp + xpGain,
      ratings: { ...p.ratings, [boostKey]: bumped },
    };
  });

  return {
    club: { ...club, academyProspects: nextProspects },
    developedCount: nextProspects.length,
  };
}

/** Promotes a Farm Academy prospect to the Active Roster with a celebratory Rookie Debut morale & Hype boost! */
export function callUpAcademyProspect(
  club: Club,
  prospectId: string,
): { calledUp: boolean; reason?: string; debutBoostBanner?: string; club: Club } {
  const prospect = club.academyProspects.find((p) => p.id === prospectId);
  if (!prospect) {
    return { calledUp: false, reason: 'Prospect not found in Academy.', club };
  }
  const rosterCheck = validateRosterAddition(club.roster, prospect.id);
  if (!rosterCheck.allowed) {
    return { calledUp: false, reason: rosterCheck.reason, club };
  }
  const capCheck = validateSalaryCapRoom(club, prospect.contract.salaryPerSeason);
  if (!capCheck.allowed) {
    return { calledUp: false, reason: capCheck.reason, club };
  }

  const promoted: Player = {
    ...prospect,
    morale: Math.min(100, prospect.morale + 15),
    formScore: Math.min(100, prospect.formScore + 25),
    formState: 'hot',
  };
  return {
    calledUp: true,
    debutBoostBanner: `ROOKIE DEBUT! ${prospect.name} (${prospect.position}) called up from the Academy (+25 Form, +8 Club Hype)!`,
    club: {
      ...club,
      roster: [...club.roster, promoted],
      academyProspects: club.academyProspects.filter((p) => p.id !== prospectId),
      economy: {
        ...club.economy,
        teamHype: Math.min(100, club.economy.teamHype + 8),
      },
    },
  };
}
