import type { ClubStaffBonuses } from '../gm/coaches';
import type { ManagerTreePassives } from '../manager/managerTree';
import {
  isPitcherPosition,
  type PitchType,
  type Player,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { deriveFormState } from './formTracker';
import {
  applyTrainingDrill,
  enforceRatingBudget,
  type TrainingDrillId,
} from './trainingCompromises';

export type PracticeComplexActivityId =
  | TrainingDrillId
  | 'fielding_fungos'
  | 'slump_buster_film'
  | 'fan_meet_and_greet';

export interface PracticeActivityMetadata {
  id: PracticeComplexActivityId;
  label: string;
  roleScope: 'hitter' | 'pitcher' | 'all';
  gainText: string;
  compromiseText: string;
  chibiClip: 'swing' | 'pitch_throw' | 'field_dive' | 'field_run' | 'celebrate';
}

export interface PracticeComplexRequest {
  activityId: PracticeComplexActivityId;
  targetPitch?: PitchType;
  replacePitchType?: PitchType;
}

export interface PracticeComplexResult {
  trained: boolean;
  reason?: string;
  player: Player;
  clubHypeDelta: number;
  summary: string;
}

export const PRACTICE_COMPLEX_ACTIVITIES: readonly PracticeActivityMetadata[] = [
  {
    id: 'power_launch_cage',
    label: 'Power Launch Cage',
    roleScope: 'hitter',
    gainText: '+2..+4 Power',
    compromiseText: '-1..-2 Contact & +12 Fatigue',
    chibiClip: 'swing',
  },
  {
    id: 'contact_choke_up',
    label: 'Contact Choke-Up Cage',
    roleScope: 'hitter',
    gainText: '+2..+3 Contact & Eye',
    compromiseText: '-1..-2 Power & +10 Fatigue',
    chibiClip: 'swing',
  },
  {
    id: 'fielding_fungos',
    label: 'Fielding Fungos',
    roleScope: 'hitter',
    gainText: '+2..+3 Fielding & Range',
    compromiseText: '-1 Power & +10 Fatigue',
    chibiClip: 'field_dive',
  },
  {
    id: 'speed_sprint_track',
    label: 'Sprint Track & Bunts',
    roleScope: 'hitter',
    gainText: '+2..+3 Speed & Bunt',
    compromiseText: '-1 Power & +10 Fatigue',
    chibiClip: 'field_run',
  },
  {
    id: 'velocity_conditioning',
    label: 'Velocity Gas Lab',
    roleScope: 'pitcher',
    gainText: '+2..+3 Velocity & Arm',
    compromiseText: '-1..-2 Control & +16 Fatigue',
    chibiClip: 'pitch_throw',
  },
  {
    id: 'command_pinpoint',
    label: 'Pinpoint Bullpen Corners',
    roleScope: 'pitcher',
    gainText: '+2..+4 Control',
    compromiseText: '-1 Velocity & +10 Fatigue',
    chibiClip: 'pitch_throw',
  },
  {
    id: 'slump_buster_film',
    label: 'Slump-Buster Film Room',
    roleScope: 'all',
    gainText: '+18..+28 Form & +8 Morale (busts cold slumps)',
    compromiseText: 'No raw stat boost & +6 Fatigue',
    chibiClip: 'celebrate',
  },
  {
    id: 'fan_meet_and_greet',
    label: 'Fan Meet & Greet',
    roleScope: 'all',
    gainText: '+3..+6 Popularity & +5 Team Hype',
    compromiseText: 'No field stat gain & +8 Fatigue',
    chibiClip: 'celebrate',
  },
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function runFieldingFungos(
  rng: SeededRng,
  player: Player,
  extraBonus: number,
  fatigueScale: number,
): PracticeComplexResult {
  if (isPitcherPosition(player.position)) {
    return {
      trained: false,
      reason: 'Fielding Fungos is designed for position players.',
      player,
      clubHypeDelta: 0,
      summary: 'Only position players run Fielding Fungos.',
    };
  }
  const gain = rng.int(2, 3) + extraBonus;
  const updated = enforceRatingBudget(
    {
      ...player.ratings,
      fielding: clamp(player.ratings.fielding + gain, 20, player.statCaps.fielding),
      range: clamp(player.ratings.range + gain, 20, player.statCaps.range),
      power: clamp(player.ratings.power - 1, 20, player.statCaps.power),
    },
    player.position,
    player.totalRatingBudget,
    'fielding',
  );
  const fatigueCost = Math.round(10 * fatigueScale);
  return {
    trained: true,
    player: { ...player, ratings: updated, fatigue: Math.min(100, player.fatigue + fatigueCost) },
    clubHypeDelta: 0,
    summary: `Fielding Fungos: +${gain} Fielding & Range (-1 Power, +${fatigueCost} Fatigue).`,
  };
}

function runSlumpBusterFilm(
  rng: SeededRng,
  player: Player,
  slumpExtra: number,
  fatigueScale: number,
): PracticeComplexResult {
  const formGain = rng.int(18, 28) + slumpExtra;
  const nextFormScore = clamp(player.formScore + formGain, -100, 100);
  const fatigueCost = Math.round(6 * fatigueScale);
  return {
    trained: true,
    player: {
      ...player,
      formScore: nextFormScore,
      formState: deriveFormState(nextFormScore),
      morale: Math.min(100, player.morale + 8),
      fatigue: Math.min(100, player.fatigue + fatigueCost),
    },
    clubHypeDelta: 2,
    summary: `Slump-Buster Film Room: +${formGain} Form & +8 Morale (+${fatigueCost} Fatigue).`,
  };
}

function runFanMeetAndGreet(
  rng: SeededRng,
  player: Player,
  fatigueScale: number,
): PracticeComplexResult {
  const popGain = rng.int(3, 6);
  const fatigueCost = Math.round(8 * fatigueScale);
  return {
    trained: true,
    player: {
      ...player,
      ratings: {
        ...player.ratings,
        popularity: Math.min(99, player.ratings.popularity + popGain),
      },
      morale: Math.min(100, player.morale + 5),
      fatigue: Math.min(100, player.fatigue + fatigueCost),
    },
    clubHypeDelta: 5,
    summary: `Fan Meet & Greet: +${popGain} Popularity & +5 Club Hype (+${fatigueCost} Fatigue).`,
  };
}

interface PracticeBonusContext {
  fatigueScale: number;
  drillBonus: number;
  slumpExtra: number;
}

function resolvePracticeBonuses(options: {
  staffBonuses?: Partial<ClubStaffBonuses>;
  managerPassives?: Partial<ManagerTreePassives>;
} = {}): PracticeBonusContext {
  const staff = options.staffBonuses ?? {};
  const mgr = options.managerPassives ?? {};
  return {
    fatigueScale: mgr.practiceFatigueScale ?? 1.0,
    drillBonus: mgr.drillBonus ?? 0,
    slumpExtra: (staff.slumpBusterBonus ?? 0) + (mgr.slumpBusterBonus ?? 0),
  };
}

/** Runs any Practice Complex session honoring compromise trade-offs, staff bonuses & Manager Coach passives. */
export function runPracticeComplexActivity(
  rng: SeededRng,
  player: Player,
  request: PracticeComplexRequest,
  options?: {
    staffBonuses?: Partial<ClubStaffBonuses>;
    managerPassives?: Partial<ManagerTreePassives>;
  },
): PracticeComplexResult {
  if (player.fatigue >= 88) {
    return {
      trained: false,
      reason: `${player.name} is too fatigued (${player.fatigue}/100) for practice.`,
      player,
      clubHypeDelta: 0,
      summary: 'Rest player before training.',
    };
  }

  const ctx = resolvePracticeBonuses(options);
  if (request.activityId === 'fielding_fungos') {
    return runFieldingFungos(rng, player, ctx.drillBonus, ctx.fatigueScale);
  }
  if (request.activityId === 'slump_buster_film') {
    return runSlumpBusterFilm(rng, player, ctx.slumpExtra, ctx.fatigueScale);
  }
  if (request.activityId === 'fan_meet_and_greet') {
    return runFanMeetAndGreet(rng, player, ctx.fatigueScale);
  }

  const base = applyTrainingDrill(rng, player, {
    drillId: request.activityId,
    targetPitch: request.targetPitch,
    replacePitchType: request.replacePitchType,
  });
  return {
    trained: base.trained,
    reason: base.reason,
    player: base.player,
    clubHypeDelta: 0,
    summary: base.summary,
  };
}
