import type { FieldPosition } from '../handedness/types';
import {
  MAX_ACADEMY_ROSTER_SIZE,
  MAX_ACTIVE_ROSTER_SIZE,
  type Club,
  type LeagueTierId,
} from '../models/club';
import {
  computePlayerOverall,
  isPitcherPosition,
  PITCH_TYPE_SHORT_LABELS,
  SPECIALIST_LABELS,
  type Player,
  type PositionalFlexibilityProfile,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { validateRosterAddition } from './marketTiers';
import { validateSalaryCapRoom } from './offseasonEngine';
import { createPlayer } from './rosterFactory';

export type ScoutDetailLevel = 0 | 1 | 2 | 3;

export interface DraftRoomState {
  tier: LeagueTierId;
  humanClubId: string;
  draftOrderClubIds: readonly string[];
  roundsRemaining: number;
  prospects: Player[];
  scoutLevels: Record<string, ScoutDetailLevel>;
}

export interface ScoutedProspectReport {
  playerId: string;
  name: string;
  position: FieldPosition;
  age: number;
  scoutLevel: ScoutDetailLevel;
  ceilingGrade: string;
  specialistHint: string;
  flexibilityProfile: PositionalFlexibilityProfile | null;
  exactCapSummary: {
    primaryCap: number;
    secondaryCap: number;
    ceilingOvrEstimate: number;
  } | null;
  pitchIntelRevealed: boolean;
  pitchIntelSummary: string;
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

export const SCOUTING_ACTION_COST = 350;

function scoreToGrade(score: number): string {
  if (score >= 88) return 'A+';
  if (score >= 82) return 'A';
  if (score >= 76) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 58) return 'C';
  return 'D';
}

function estimateCeilingScore(player: Player): number {
  const c = player.statCaps;
  if (isPitcherPosition(player.position)) {
    return Math.round(c.velocity * 0.35 + c.movement * 0.3 + c.control * 0.25 + c.stamina * 0.1);
  }
  return Math.round(c.contact * 0.3 + c.power * 0.25 + c.eye * 0.15 + c.speed * 0.15 + c.fielding * 0.15);
}

/** Creates a 3-round reverse-standings Amateur Draft class with full Fog-of-War scouting state. */
export function beginAmateurDraft(
  rng: SeededRng,
  tierClubs: readonly Club[],
  humanClubId: string,
  tier: LeagueTierId,
  prospectCount = 28,
): DraftRoomState {
  const sortedReverse = [...tierClubs].sort((a, b) => a.wins - b.wins || b.losses - a.losses);
  const prospects: Player[] = [];
  for (let i = 0; i < prospectCount; i += 1) {
    const pos = DRAFT_POSITIONS[i % DRAFT_POSITIONS.length];
    const rookie = createPlayer(rng, { position: pos, tier, marketTier: 'rookie' });
    prospects.push({
      ...rookie,
      age: rng.int(18, 21),
      contract: {
        ...rookie.contract,
        salaryPerSeason: Math.min(450, rookie.contract.salaryPerSeason),
        signingBonus: Math.min(200, rookie.contract.signingBonus),
        yearsRemaining: 3,
      },
    });
  }

  return {
    tier,
    humanClubId,
    draftOrderClubIds: sortedReverse.map((c) => c.id),
    roundsRemaining: 3,
    prospects,
    scoutLevels: {},
  };
}

/** Spends club scouting budget to lift one layer of Fog-of-War on a prospect (0 -> 1 -> 2 -> 3). */
export function scoutDraftProspect(
  draft: DraftRoomState,
  club: Club,
  prospectId: string,
  cost = SCOUTING_ACTION_COST,
): { scouted: boolean; reason?: string; draft: DraftRoomState; club: Club } {
  const exists = draft.prospects.some((p) => p.id === prospectId);
  if (!exists) return { scouted: false, reason: 'Prospect not found in draft pool.', draft, club };

  const currentLevel = draft.scoutLevels[prospectId] ?? 0;
  if (currentLevel >= 3) {
    return { scouted: false, reason: 'Prospect is already fully scouted (Level 3).', draft, club };
  }
  if (club.economy.scoutingBudget < cost) {
    return {
      scouted: false,
      reason: `Need $${cost.toLocaleString()} scouting budget (have $${club.economy.scoutingBudget.toLocaleString()}).`,
      draft,
      club,
    };
  }

  const nextLevel = (currentLevel + 1) as ScoutDetailLevel;
  return {
    scouted: true,
    draft: {
      ...draft,
      scoutLevels: { ...draft.scoutLevels, [prospectId]: nextLevel },
    },
    club: {
      ...club,
      economy: {
        ...club.economy,
        scoutingBudget: club.economy.scoutingBudget - cost,
      },
    },
  };
}

function formatPitchIntel(player: Player): string {
  if (isPitcherPosition(player.position) && player.pitchArsenal) {
    const pitches = player.pitchArsenal.repertoire
      .map((s) => PITCH_TYPE_SHORT_LABELS[s.pitchType])
      .join(', ');
    return `${player.pitchArsenal.repertoire.length}P (${pitches}) • Out: ${PITCH_TYPE_SHORT_LABELS[player.pitchArsenal.favoritePitch]}`;
  }
  return `Crushes ${PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.favoritePitch]} • Weak vs ${PITCH_TYPE_SHORT_LABELS[player.batterPitchProfile.weakPitch]}`;
}

/** Produces the Fog-of-War filtered scouting report for a prospect based on current scout level. */
export function getScoutedProspectReport(
  draft: DraftRoomState,
  prospectId: string,
): ScoutedProspectReport | null {
  const player = draft.prospects.find((p) => p.id === prospectId);
  if (!player) return null;

  const level = draft.scoutLevels[prospectId] ?? 0;
  const ceiling = estimateCeilingScore(player);
  const exactCaps =
    level >= 2
      ? {
          primaryCap: isPitcherPosition(player.position)
            ? player.statCaps.velocity
            : player.statCaps.contact,
          secondaryCap: isPitcherPosition(player.position)
            ? player.statCaps.movement
            : player.statCaps.power,
          ceilingOvrEstimate: ceiling,
        }
      : null;

  return {
    playerId: player.id,
    name: player.name,
    position: player.position,
    age: player.age,
    scoutLevel: level,
    ceilingGrade: level >= 1 ? scoreToGrade(ceiling) : '?',
    specialistHint: level >= 1 ? SPECIALIST_LABELS[player.specialistArchetype] : 'Unscouted',
    flexibilityProfile: level >= 2 ? player.flexibilityProfile : null,
    exactCapSummary: exactCaps,
    pitchIntelRevealed: level >= 3,
    pitchIntelSummary: level >= 3 ? formatPitchIntel(player) : 'Scout Lv.3 to unlock pitch matchups',
  };
}

function chooseDraftDestination(
  club: Club,
  prospect: Player,
  preference: 'auto' | 'active' | 'academy',
): { destination: 'active' | 'academy' | null; reason?: string } {
  const activeCheck = validateRosterAddition(club.roster, prospect.id);
  const capCheck = validateSalaryCapRoom(club, prospect.contract.salaryPerSeason);
  const canActive = activeCheck.allowed && capCheck.allowed;
  const canAcademy = club.academyProspects.length < MAX_ACADEMY_ROSTER_SIZE;

  if (preference === 'active') {
    if (canActive) return { destination: 'active' };
    return { destination: null, reason: !activeCheck.allowed ? activeCheck.reason : capCheck.reason };
  }
  if (preference === 'academy') {
    return canAcademy
      ? { destination: 'academy' }
      : { destination: null, reason: `Farm Academy full (${MAX_ACADEMY_ROSTER_SIZE}/${MAX_ACADEMY_ROSTER_SIZE}).` };
  }
  if (canActive) return { destination: 'active' };
  if (canAcademy) return { destination: 'academy' };
  return {
    destination: null,
    reason: `Both Active Roster (${MAX_ACTIVE_ROSTER_SIZE}) and Farm Academy (${MAX_ACADEMY_ROSTER_SIZE}) are full.`,
  };
}

/** Drafts a rookie into Active Roster or 6-slot Farm Academy, respecting 20-man & Salary Cap limits. */
export function draftProspectToClub(
  draft: DraftRoomState,
  club: Club,
  prospectId: string,
  destinationPref: 'auto' | 'active' | 'academy' = 'auto',
): {
  drafted: boolean;
  destination: 'active' | 'academy' | null;
  reason?: string;
  draft: DraftRoomState;
  club: Club;
} {
  if (draft.roundsRemaining <= 0) {
    return { drafted: false, destination: null, reason: 'All 3 Amateur Draft rounds completed.', draft, club };
  }
  const prospect = draft.prospects.find((p) => p.id === prospectId);
  if (!prospect) {
    return { drafted: false, destination: null, reason: 'Prospect already drafted.', draft, club };
  }

  const slot = chooseDraftDestination(club, prospect, destinationPref);
  if (!slot.destination) {
    return { drafted: false, destination: null, reason: slot.reason, draft, club };
  }

  const nextClub: Club =
    slot.destination === 'active'
      ? { ...club, roster: [...club.roster, prospect] }
      : { ...club, academyProspects: [...club.academyProspects, prospect] };

  // Remove drafted prospect and let rival clubs clear up to 1 top OVR prospect per round
  const remaining = draft.prospects
    .filter((p) => p.id !== prospectId)
    .sort((a, b) => computePlayerOverall(b) - computePlayerOverall(a));
  const aiDrainCount = Math.min(Math.max(0, draft.draftOrderClubIds.length - 1), remaining.length);
  const afterAiRound = remaining.slice(aiDrainCount);

  return {
    drafted: true,
    destination: slot.destination,
    draft: {
      ...draft,
      prospects: afterAiRound,
      roundsRemaining: draft.roundsRemaining - 1,
    },
    club: nextClub,
  };
}
