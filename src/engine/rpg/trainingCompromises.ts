import type { FieldPosition } from '../handedness/types';
import {
  isPitcherPosition,
  PITCH_TYPE_SHORT_LABELS,
  type BatterPitchProfile,
  type PitchSlot,
  type PitchType,
  type PitcherArsenalProfile,
  type Player,
  type PlayerRatings,
} from '../models/player';
import type { SeededRng } from '../rng/seededRng';
import { deriveArsenalExtremes } from './pitchArsenals';
import { evolveSpecialistArchetype } from './specialistsAndPositions';

export type TrainingDrillId =
  | 'power_launch_cage'
  | 'contact_choke_up'
  | 'batter_pitch_recognition'
  | 'bullpen_pitch_lab_polish'
  | 'bullpen_pitch_lab_learn'
  | 'velocity_conditioning'
  | 'command_pinpoint'
  | 'speed_sprint_track';

export interface TrainingDrillRequest {
  drillId: TrainingDrillId;
  targetPitch?: PitchType;
  replacePitchType?: PitchType;
}

export interface TrainingDrillPreview {
  allowed: boolean;
  reason?: string;
  gains: string[];
  compromises: string[];
  fatigueCost: number;
}

export interface TrainingDrillResult {
  trained: boolean;
  reason?: string;
  player: Player;
  summary: string;
}

type CoreRatingKey = keyof Pick<
  PlayerRatings,
  'contact' | 'power' | 'eye' | 'bunt' | 'velocity' | 'movement' | 'control' | 'stamina' | 'speed' | 'fielding' | 'arm'
>;

const HITTER_CORE_KEYS: readonly CoreRatingKey[] = [
  'contact',
  'power',
  'eye',
  'bunt',
  'speed',
  'fielding',
  'arm',
];

const PITCHER_CORE_KEYS: readonly CoreRatingKey[] = [
  'velocity',
  'movement',
  'control',
  'stamina',
  'fielding',
];

const PITCHER_ONLY_DRILLS: ReadonlySet<TrainingDrillId> = new Set([
  'bullpen_pitch_lab_polish',
  'bullpen_pitch_lab_learn',
  'velocity_conditioning',
  'command_pinpoint',
]);

interface StatDrillConfig {
  gainKeys: readonly CoreRatingKey[];
  gainRange: readonly [number, number];
  tradeKey: CoreRatingKey;
  tradeRange: readonly [number, number];
  fatigueCost: number;
  gainsLabel: string;
  compromiseLabel: string;
}

const STAT_DRILL_SPECS: Readonly<
  Record<
    'power_launch_cage' | 'contact_choke_up' | 'velocity_conditioning' | 'command_pinpoint' | 'speed_sprint_track',
    StatDrillConfig
  >
> = {
  power_launch_cage: {
    gainKeys: ['power'],
    gainRange: [2, 4],
    tradeKey: 'contact',
    tradeRange: [1, 2],
    fatigueCost: 12,
    gainsLabel: '+2..+4 Power',
    compromiseLabel: '-1..-2 Contact & +12 Fatigue',
  },
  contact_choke_up: {
    gainKeys: ['contact', 'eye'],
    gainRange: [2, 3],
    tradeKey: 'power',
    tradeRange: [1, 2],
    fatigueCost: 10,
    gainsLabel: '+2..+3 Contact & Eye',
    compromiseLabel: '-1..-2 Power & +10 Fatigue',
  },
  velocity_conditioning: {
    gainKeys: ['velocity', 'arm'],
    gainRange: [2, 3],
    tradeKey: 'control',
    tradeRange: [1, 2],
    fatigueCost: 16,
    gainsLabel: '+2..+3 Velocity & Arm',
    compromiseLabel: '-1..-2 Control & +16 Fatigue',
  },
  command_pinpoint: {
    gainKeys: ['control'],
    gainRange: [2, 4],
    tradeKey: 'velocity',
    tradeRange: [1, 1],
    fatigueCost: 10,
    gainsLabel: '+2..+4 Control',
    compromiseLabel: '-1 Velocity & +10 Fatigue',
  },
  speed_sprint_track: {
    gainKeys: ['speed', 'bunt'],
    gainRange: [2, 3],
    tradeKey: 'power',
    tradeRange: [1, 1],
    fatigueCost: 10,
    gainsLabel: '+2..+3 Speed & Bunt',
    compromiseLabel: '-1 Power & +10 Fatigue',
  },
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Sums core role ratings so totalRatingBudget caps prevent overpowered clones. */
export function computeCoreRatingSum(player: Pick<Player, 'position' | 'ratings'>): number {
  const keys = isPitcherPosition(player.position) ? PITCHER_CORE_KEYS : HITTER_CORE_KEYS;
  let total = 0;
  for (const key of keys) {
    total += player.ratings[key];
  }
  return total;
}

/** Trims non-protected core tools when ratings exceed a player's totalRatingBudget envelope. */
export function enforceRatingBudget(
  ratings: PlayerRatings,
  position: FieldPosition,
  totalRatingBudget: number,
  protectedKey?: CoreRatingKey,
): PlayerRatings {
  const keys = isPitcherPosition(position) ? PITCHER_CORE_KEYS : HITTER_CORE_KEYS;
  const next = { ...ratings };
  let excess = computeCoreRatingSum({ position, ratings: next }) - totalRatingBudget;
  if (excess <= 0) return next;

  const trimOrder = keys
    .filter((k) => k !== protectedKey)
    .sort((a, b) => next[b] - next[a]);

  let guard = 0;
  while (excess > 0 && guard < 300) {
    let trimmedAny = false;
    for (const key of trimOrder) {
      if (excess <= 0) break;
      if (next[key] > 20) {
        next[key] -= 1;
        excess -= 1;
        trimmedAny = true;
      }
    }
    if (!trimmedAny) break;
    guard += 1;
  }
  return next;
}

function validateLearnPitchRequest(
  player: Player,
  request: TrainingDrillRequest,
): string | null {
  const arsenal = player.pitchArsenal;
  if (!arsenal || !request.targetPitch) return 'Pick a new pitch type to learn.';
  if (arsenal.repertoire.some((s) => s.pitchType === request.targetPitch)) {
    return `${player.name} already throws ${PITCH_TYPE_SHORT_LABELS[request.targetPitch]}.`;
  }
  const maxPitches = player.position === 'RP' ? 3 : 5;
  if (arsenal.repertoire.length >= maxPitches && !request.replacePitchType) {
    return `${player.position} pitch cap (${maxPitches}) reached — choose a pitch to replace.`;
  }
  if (
    request.replacePitchType &&
    !arsenal.repertoire.some((s) => s.pitchType === request.replacePitchType)
  ) {
    return 'Replacement pitch must be in current repertoire.';
  }
  return null;
}

function previewPitchDrill(player: Player, request: TrainingDrillRequest): TrainingDrillPreview {
  if (request.drillId === 'batter_pitch_recognition') {
    if (!request.targetPitch) {
      return { allowed: false, reason: 'Choose a pitch type to drill.', gains: [], compromises: [], fatigueCost: 8 };
    }
    const label = PITCH_TYPE_SHORT_LABELS[request.targetPitch];
    return {
      allowed: true,
      gains: [`+4..+7 recognition vs ${label}`],
      compromises: ['-2..-4 timing drift on neglected pitches', '+8 Fatigue'],
      fatigueCost: 8,
    };
  }
  if (request.drillId === 'bullpen_pitch_lab_polish') {
    const owns = request.targetPitch && player.pitchArsenal?.repertoire.some((s) => s.pitchType === request.targetPitch);
    if (!owns || !request.targetPitch) {
      return { allowed: false, reason: 'Pitcher does not throw that pitch.', gains: [], compromises: [], fatigueCost: 12 };
    }
    return {
      allowed: true,
      gains: [`+4..+7 ${PITCH_TYPE_SHORT_LABELS[request.targetPitch]} mastery`],
      compromises: ['-2..-4 mastery rust on neglected pitches', '+12 Fatigue'],
      fatigueCost: 12,
    };
  }
  const learnError = validateLearnPitchRequest(player, request);
  if (learnError) {
    return { allowed: false, reason: learnError, gains: [], compromises: [], fatigueCost: 14 };
  }
  return {
    allowed: true,
    gains: [`Learn ${PITCH_TYPE_SHORT_LABELS[request.targetPitch!]} (40-46 mastery)`],
    compromises: ['-4 Control & -3 mastery rust across existing arsenal', '+14 Fatigue'],
    fatigueCost: 14,
  };
}

/** Previews exact gains, compromises, and eligibility before running any training drill. */
export function previewTrainingDrill(
  player: Player,
  request: TrainingDrillRequest,
): TrainingDrillPreview {
  if (player.fatigue >= 88) {
    return {
      allowed: false,
      reason: `${player.name} is too fatigued (${player.fatigue}/100) to train.`,
      gains: [],
      compromises: [],
      fatigueCost: 0,
    };
  }

  const pitcherDrill = PITCHER_ONLY_DRILLS.has(request.drillId);
  const playerIsPitcher = isPitcherPosition(player.position);
  if (pitcherDrill !== playerIsPitcher) {
    return {
      allowed: false,
      reason: pitcherDrill
        ? 'Only pitchers can run Bullpen / Pitching drills.'
        : 'Pitchers cannot run position-player hitting drills.',
      gains: [],
      compromises: [],
      fatigueCost: 0,
    };
  }

  if (request.drillId in STAT_DRILL_SPECS) {
    const spec = STAT_DRILL_SPECS[request.drillId as keyof typeof STAT_DRILL_SPECS];
    return {
      allowed: true,
      gains: [spec.gainsLabel],
      compromises: [spec.compromiseLabel],
      fatigueCost: spec.fatigueCost,
    };
  }

  return previewPitchDrill(player, request);
}

function deriveBatterExtremes(
  rec: Partial<Record<PitchType, number>>,
  fallbackFav: PitchType,
  fallbackWeak: PitchType,
): { favoritePitch: PitchType; weakPitch: PitchType } {
  const entries = Object.entries(rec) as [PitchType, number][];
  if (entries.length < 2) return { favoritePitch: fallbackFav, weakPitch: fallbackWeak };
  entries.sort((a, b) => b[1] - a[1]);
  return {
    favoritePitch: entries[0][0],
    weakPitch: entries[entries.length - 1][0],
  };
}

function applyBatterPitchRecognitionDrill(
  rng: SeededRng,
  player: Player,
  targetPitch: PitchType,
): TrainingDrillResult {
  const gain = rng.int(4, 7);
  const nextRec: Partial<Record<PitchType, number>> = { ...player.batterPitchProfile.pitchRecognition };
  const before = nextRec[targetPitch] ?? 0;
  nextRec[targetPitch] = clampInt(before + gain, -20, 18);

  const others = (Object.keys(nextRec) as PitchType[]).filter((pt) => pt !== targetPitch);
  const driftCount = Math.min(2, others.length);
  const driftAmount = rng.int(2, 4);
  for (let i = 0; i < driftCount; i += 1) {
    const pick = others[(rng.int(0, others.length - 1) + i) % others.length];
    nextRec[pick] = clampInt((nextRec[pick] ?? 0) - driftAmount, -20, 18);
  }

  const extremes = deriveBatterExtremes(
    nextRec,
    player.batterPitchProfile.favoritePitch,
    player.batterPitchProfile.weakPitch,
  );
  const nextProfile: BatterPitchProfile = {
    favoritePitch: extremes.favoritePitch,
    weakPitch: extremes.weakPitch,
    pitchRecognition: nextRec,
  };
  const nextPlayer: Player = {
    ...player,
    batterPitchProfile: nextProfile,
    fatigue: Math.min(100, player.fatigue + 8),
  };
  return {
    trained: true,
    player: nextPlayer,
    summary: `Pitch Timing (${PITCH_TYPE_SHORT_LABELS[targetPitch]} +${gain}, -${driftAmount} timing drift elsewhere).`,
  };
}

function applyPitchLabPolishDrill(
  rng: SeededRng,
  player: Player,
  targetPitch: PitchType,
): TrainingDrillResult {
  const arsenal = player.pitchArsenal!;
  const gain = rng.int(4, 7);
  const rust = rng.int(2, 4);
  const nextRep: PitchSlot[] = arsenal.repertoire.map((slot) => ({
    pitchType: slot.pitchType,
    mastery:
      slot.pitchType === targetPitch
        ? clampInt(slot.mastery + gain, 20, 99)
        : clampInt(slot.mastery - rust, 20, 99),
  }));
  const extremes = deriveArsenalExtremes(nextRep);
  const nextArsenal: PitcherArsenalProfile = {
    repertoire: nextRep,
    favoritePitch: extremes.favoritePitch,
    weakestPitch: extremes.weakestPitch,
  };
  return {
    trained: true,
    player: {
      ...player,
      pitchArsenal: nextArsenal,
      fatigue: Math.min(100, player.fatigue + 12),
    },
    summary: `Pitch Lab (${PITCH_TYPE_SHORT_LABELS[targetPitch]} +${gain} mastery, -${rust} rust on other pitches).`,
  };
}

function applyPitchLabLearnDrill(
  rng: SeededRng,
  player: Player,
  targetPitch: PitchType,
  replacePitchType?: PitchType,
): TrainingDrillResult {
  const arsenal = player.pitchArsenal!;
  const rawMastery = rng.int(40, 46);
  const baseRep: PitchSlot[] = arsenal.repertoire
    .filter((slot) => slot.pitchType !== replacePitchType)
    .map((slot) => ({
      pitchType: slot.pitchType,
      mastery: clampInt(slot.mastery - 3, 20, 99),
    }));
  const nextRep: PitchSlot[] = [...baseRep, { pitchType: targetPitch, mastery: rawMastery }];
  const extremes = deriveArsenalExtremes(nextRep);
  const nextRatings: PlayerRatings = {
    ...player.ratings,
    control: clampInt(player.ratings.control - 4, 20, player.statCaps.control),
  };

  return {
    trained: true,
    player: {
      ...player,
      ratings: nextRatings,
      pitchArsenal: {
        repertoire: nextRep,
        favoritePitch: extremes.favoritePitch,
        weakestPitch: extremes.weakestPitch,
      },
      fatigue: Math.min(100, player.fatigue + 14),
    },
    summary: `Learned ${PITCH_TYPE_SHORT_LABELS[targetPitch]} (${rawMastery} mastery; -4 Control & -3 arsenal rust).`,
  };
}

function applyStatCompromiseDrill(
  rng: SeededRng,
  player: Player,
  drillId: keyof typeof STAT_DRILL_SPECS,
): TrainingDrillResult {
  const spec = STAT_DRILL_SPECS[drillId];
  const gainDelta = rng.int(spec.gainRange[0], spec.gainRange[1]);
  const tradeDelta = rng.int(spec.tradeRange[0], spec.tradeRange[1]);
  const updated: PlayerRatings = { ...player.ratings };

  for (const key of spec.gainKeys) {
    updated[key] = clampInt(updated[key] + gainDelta, 20, player.statCaps[key]);
  }
  updated[spec.tradeKey] = clampInt(updated[spec.tradeKey] - tradeDelta, 20, player.statCaps[spec.tradeKey]);

  const budgeted = enforceRatingBudget(
    updated,
    player.position,
    player.totalRatingBudget,
    spec.gainKeys[0],
  );
  const nextPlayer: Player = {
    ...player,
    ratings: budgeted,
    fatigue: Math.min(100, player.fatigue + spec.fatigueCost),
    specialistArchetype: evolveSpecialistArchetype({
      position: player.position,
      specialistArchetype: player.specialistArchetype,
      ratings: budgeted,
    }),
  };

  return {
    trained: true,
    player: nextPlayer,
    summary: `${spec.gainsLabel} achieved (compromise: ${spec.compromiseLabel}).`,
  };
}

/** Runs a deterministic compromise-first training drill bounded by statCaps and totalRatingBudget. */
export function applyTrainingDrill(
  rng: SeededRng,
  player: Player,
  request: TrainingDrillRequest,
): TrainingDrillResult {
  const check = previewTrainingDrill(player, request);
  if (!check.allowed) {
    return {
      trained: false,
      reason: check.reason,
      player,
      summary: check.reason ?? 'Drill unavailable.',
    };
  }

  if (request.drillId === 'batter_pitch_recognition') {
    return applyBatterPitchRecognitionDrill(rng, player, request.targetPitch!);
  }
  if (request.drillId === 'bullpen_pitch_lab_polish') {
    return applyPitchLabPolishDrill(rng, player, request.targetPitch!);
  }
  if (request.drillId === 'bullpen_pitch_lab_learn') {
    return applyPitchLabLearnDrill(rng, player, request.targetPitch!, request.replacePitchType);
  }
  return applyStatCompromiseDrill(rng, player, request.drillId);
}
