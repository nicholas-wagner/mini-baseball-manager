import { PLAYER_CATALOG_BY_ID } from '../catalog/playerCatalog';
import { TIER_SALARY_CAPS, type Club } from '../models/club';
import {
  computePlayerOverall,
  isPitcherPosition,
  type Player,
  type PlayerMarketTier,
  type PlayerRatings,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { evolveSpecialistArchetype } from '../rpg/specialistsAndPositions';
import {
  buildOptimalLineup,
  createClub,
  createPlayer,
  type CreateClubOptions,
} from './rosterFactory';

export type StartingRosterPreset =
  | 'balanced'
  | 'all_rookies'
  | 'veterans'
  | 'good_defense'
  | 'good_hitting'
  | 'good_pitching';

export interface StartingRosterPresetSpec {
  id: StartingRosterPreset;
  label: string;
  tagline: string;
  pros: string;
  cons: string;
}

/** Fair Rookie Sandlot parity target average OVR shared across all 6 presets (matches Rookie AI clubs). */
export const ROOKIE_PARITY_TARGET_OVR = 58;

export const STARTING_ROSTER_PRESETS: readonly StartingRosterPresetSpec[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    tagline: 'Classic Rookie Sandlot mix',
    pros: 'No glaring holes; steady lineup & rotation',
    cons: 'No single runaway strength out of the gate',
  },
  {
    id: 'all_rookies',
    label: 'All Rookies',
    tagline: '100% youth rebuild with huge ceiling',
    pros: '1.35x XP growth, lowest payroll, booming stat caps',
    cons: 'Green rookie jitters in high-leverage moments',
  },
  {
    id: 'veterans',
    label: 'Veterans',
    tagline: 'Crafty wily pros mentoring from Day 1',
    pros: 'Veteran Eye/Control & clutch composure right away',
    cons: 'Minimal 0.30x XP growth & looming retirements',
  },
  {
    id: 'good_defense',
    label: 'Good Defense',
    tagline: 'Leather-first vacuum-cleaner gloves',
    pros: 'Elite Fielding, Range & Arm shut down rallies',
    cons: 'Lighter bat power means tight low-scoring games',
  },
  {
    id: 'good_hitting',
    label: 'Good Hitting',
    tagline: 'Sluggers & gap mashers from 1 to 9',
    pros: 'Potent Contact, Power & Gap offense',
    cons: 'Work-in-progress mound & average defense',
  },
  {
    id: 'good_pitching',
    label: 'Good Pitching',
    tagline: 'Filthy rotation & lockdown bullpen',
    pros: 'Sharp Velocity, Movement & Control arms',
    cons: 'Scrappy small-ball offense must scratch runs',
  },
];

function clampRating(value: number, cap = 99): number {
  return Math.max(28, Math.min(cap, Math.round(value)));
}

function shiftRatings(
  r: PlayerRatings,
  caps: PlayerRatings,
  deltas: Partial<Record<keyof PlayerRatings, number>>,
): PlayerRatings {
  const next = { ...r };
  for (const [k, delta] of Object.entries(deltas) as [keyof PlayerRatings, number][]) {
    next[k] = clampRating(next[k] + delta, caps[k]);
  }
  return next;
}

function applyTiltToPlayer(player: Player, preset: StartingRosterPreset): Player {
  const pitcher = isPitcherPosition(player.position);
  let ratings = player.ratings;

  if (preset === 'good_defense') {
    ratings = pitcher
      ? shiftRatings(ratings, player.statCaps, { fielding: 5, control: 2, velocity: -2 })
      : shiftRatings(ratings, player.statCaps, { fielding: 8, range: 8, arm: 6, power: -6, gapPower: -4 });
  } else if (preset === 'good_hitting') {
    ratings = pitcher
      ? shiftRatings(ratings, player.statCaps, { velocity: -5, movement: -4, control: -5 })
      : shiftRatings(ratings, player.statCaps, { contact: 6, power: 7, gapPower: 5, fielding: -5, range: -4 });
  } else if (preset === 'good_pitching') {
    ratings = pitcher
      ? shiftRatings(ratings, player.statCaps, { velocity: 6, movement: 6, control: 6 })
      : shiftRatings(ratings, player.statCaps, { contact: -5, power: -6, gapPower: -4 });
  }

  return {
    ...player,
    ratings,
    specialistArchetype: evolveSpecialistArchetype({
      position: player.position,
      specialistArchetype: player.specialistArchetype,
      ratings,
    }),
  };
}

function nudgeAllPlayerCoreTools(player: Player, delta: number): Player {
  const pitcher = isPitcherPosition(player.position);
  const patch: Partial<Record<keyof PlayerRatings, number>> = pitcher
    ? { velocity: delta, movement: delta, control: delta, stamina: delta }
    : { contact: delta, power: delta, gapPower: delta, speed: delta, fielding: delta, range: delta };
  return {
    ...player,
    ratings: shiftRatings(player.ratings, player.statCaps, patch),
  };
}

function calibrateRosterToRookieParity(roster: Player[]): Player[] {
  let current = [...roster];
  for (let pass = 0; pass < 8; pass += 1) {
    const avg = current.reduce((sum, p) => sum + computePlayerOverall(p), 0) / current.length;
    const diff = ROOKIE_PARITY_TARGET_OVR - avg;
    if (Math.abs(diff) <= 1.2) break;
    const step = diff > 0 ? Math.min(3, Math.ceil(diff)) : Math.max(-3, Math.floor(diff));
    current = current.map((p) => nudgeAllPlayerCoreTools(p, step));
  }
  return current;
}

function scaleContractsUnderRookieCap(roster: Player[]): Player[] {
  const cap = TIER_SALARY_CAPS.rookie;
  const total = roster.reduce((sum, p) => sum + p.contract.salaryPerSeason, 0);
  if (total <= cap - 1500) return roster;
  const ratio = (cap - 2000) / Math.max(1, total);
  return roster.map((p) => ({
    ...p,
    contract: {
      ...p.contract,
      salaryPerSeason: Math.max(300, Math.round(p.contract.salaryPerSeason * ratio)),
    },
  }));
}

function rebuildRosterWithForcedMarketTier(
  rng: SeededRng,
  baseRoster: readonly Player[],
  tierPicker: (idx: number) => PlayerMarketTier,
): Player[] {
  return baseRoster.map((existing, idx) =>
    createPlayer(rng, {
      position: existing.position,
      identity: PLAYER_CATALOG_BY_ID.get(existing.id),
      tier: 'rookie',
      jerseyNumber: existing.jerseyNumber,
      idPrefix: existing.id.split('-')[0],
      marketTier: tierPicker(idx),
    }),
  );
}

/** Creates a fair Rookie-tier starting club shaped by one of the 6 strategic starting presets. */
export function createClubWithStartingPreset(
  rng: SeededRng,
  options: CreateClubOptions,
  preset: StartingRosterPreset = 'balanced',
): Club {
  const baseClub = createClub(rng, { ...options, leagueTier: 'rookie' });
  let shapedRoster = baseClub.roster;

  if (preset === 'all_rookies') {
    shapedRoster = rebuildRosterWithForcedMarketTier(rng, baseClub.roster, () => 'rookie');
  } else if (preset === 'veterans') {
    shapedRoster = rebuildRosterWithForcedMarketTier(rng, baseClub.roster, (idx) =>
      idx % 4 === 3 ? 'average' : 'veteran',
    );
  } else if (preset !== 'balanced') {
    shapedRoster = baseClub.roster.map((p) => applyTiltToPlayer(p, preset));
  }

  const parityRoster = scaleContractsUnderRookieCap(calibrateRosterToRookieParity(shapedRoster));
  const rotationIds = parityRoster.filter((p) => p.position === 'SP').map((p) => p.id);
  const bullpenIds = parityRoster.filter((p) => p.position === 'RP').map((p) => p.id);

  return {
    ...baseClub,
    roster: parityRoster,
    lineup: buildOptimalLineup(parityRoster),
    rotationIds,
    bullpenIds,
  };
}
