import type { PlaySoundCue } from '../models/playEvent';
import type { Player } from '../models/player';
import { getNationalityById } from '../nationalities/pickNationality';
import type { HeritageAbilitySpec, NationalityId } from '../nationalities/types';
import type { BallVfxStyle } from '../vfx/types';
import { SKILL_TREE_NODES } from './skillTrees';

export interface HeritageGameplayProfile {
  ability: HeritageAbilitySpec;
  batterContactDelta: number;
  batterPowerDelta: number;
  batterEyeDelta: number;
  pitcherStuffDelta: number;
  pitcherControlDelta: number;
  pitcherWhiffBonus: number;
  defenderRangeDelta: number;
  defenderFieldingDelta: number;
  defenderArmDelta: number;
  stealSpeedDelta: number;
  hrCarryMultiplier: number;
  xbhStretchMultiplier: number;
  luckHitProbDelta: number;
  luckZoneProbDelta: number;
  errorMultiplier: number;
  hypeGainMultiplier: number;
  enduranceDrainScale: number;
  summaryTag: string;
}

export interface CapstoneGameplayProfile {
  pitcherStuffDelta: number;
  pitcherControlDelta: number;
  mphBonus: number;
  pitcherWhiffBonus: number;
  batterContactDelta: number;
  batterPowerDelta: number;
  batterEyeDelta: number;
  buntBonus: number;
  chaseRateDelta: number;
  hrCarryMultiplier: number;
  stealSpeedDelta: number;
  defenderRangeDelta: number;
  defenderFieldingDelta: number;
  defenderArmDelta: number;
  errorMultiplier: number;
  hrRobberyChance: number;
  hypeGainMultiplier: number;
  equippedPowerIds: string[];
  equippedPowerNames: string[];
}

export interface ActivatablePowerOption {
  id: string;
  name: string;
  source: 'heritage' | 'capstone';
  calloutText: string;
  vfxColor: string;
  shortEffect: string;
}

export interface ActivePowerSurge {
  powerId: string;
  actor: 'pitcher' | 'batter';
  calloutText: string;
  vfxColor: string;
  ballStyle: BallVfxStyle;
  soundCue: PlaySoundCue;
  contactDelta: number;
  powerDelta: number;
  eyeDelta: number;
  buntBonus: number;
  stuffDelta: number;
  controlDelta: number;
  mphBonus: number;
  whiffBonus: number;
  chaseRateDelta: number;
  hitProbBonus: number;
  hrCarryMultiplier: number;
  xbhStretchMultiplier: number;
  luckHitProbDelta: number;
  luckZoneProbDelta: number;
}

interface HeritageCategoryTemplate {
  batterContact: number;
  batterPower: number;
  batterEye: number;
  pitcherStuff: number;
  pitcherControl: number;
  pitcherWhiff: number;
  defenderRange: number;
  defenderFielding: number;
  defenderArm: number;
  stealSpeed: number;
  hrCarry: number;
  xbhStretch: number;
  luckHit: number;
  luckZone: number;
  errorScale: number;
  hypeGain: number;
  enduranceScale: number;
}

const CATEGORY_TEMPLATES: Readonly<Record<HeritageAbilitySpec['category'], HeritageCategoryTemplate>> = {
  batting: {
    batterContact: 1.6,
    batterPower: 2.2,
    batterEye: 1.2,
    pitcherStuff: 0,
    pitcherControl: 0,
    pitcherWhiff: 0,
    defenderRange: 0,
    defenderFielding: 0,
    defenderArm: 0,
    stealSpeed: 0,
    hrCarry: 0.04,
    xbhStretch: 0.04,
    luckHit: 0,
    luckZone: 0,
    errorScale: 0,
    hypeGain: 0.06,
    enduranceScale: 0,
  },
  pitching: {
    batterContact: 0.6,
    batterPower: 0,
    batterEye: 0.6,
    pitcherStuff: 2.4,
    pitcherControl: 1.6,
    pitcherWhiff: 0.025,
    defenderRange: 0,
    defenderFielding: 0,
    defenderArm: 0,
    stealSpeed: 0,
    hrCarry: 0,
    xbhStretch: 0,
    luckHit: 0,
    luckZone: 0,
    errorScale: 0,
    hypeGain: 0.04,
    enduranceScale: 0,
  },
  fielding: {
    batterContact: 0.4,
    batterPower: 0,
    batterEye: 0,
    pitcherStuff: 0.6,
    pitcherControl: 0.6,
    pitcherWhiff: 0,
    defenderRange: 2.6,
    defenderFielding: 2.6,
    defenderArm: 2.2,
    stealSpeed: 0,
    hrCarry: 0,
    xbhStretch: 0,
    luckHit: 0,
    luckZone: 0,
    errorScale: -0.08,
    hypeGain: 0.05,
    enduranceScale: 0,
  },
  baserunning: {
    batterContact: 1.0,
    batterPower: 0.5,
    batterEye: 0,
    pitcherStuff: 0,
    pitcherControl: 0,
    pitcherWhiff: 0,
    defenderRange: 1.2,
    defenderFielding: 0,
    defenderArm: 0,
    stealSpeed: 3.2,
    hrCarry: 0,
    xbhStretch: 0.07,
    luckHit: 0,
    luckZone: 0,
    errorScale: 0,
    hypeGain: 0.05,
    enduranceScale: -0.05,
  },
  luck: {
    batterContact: 1.1,
    batterPower: 0.4,
    batterEye: 1.4,
    pitcherStuff: 0.8,
    pitcherControl: 1.0,
    pitcherWhiff: 0.01,
    defenderRange: 0.6,
    defenderFielding: 1.0,
    defenderArm: 0,
    stealSpeed: 0.8,
    hrCarry: 0.02,
    xbhStretch: 0.02,
    luckHit: 0.012,
    luckZone: 0.012,
    errorScale: -0.06,
    hypeGain: 0.07,
    enduranceScale: 0,
  },
};

const NATION_EXTRA_FLAVOR: Readonly<Partial<Record<NationalityId, Partial<HeritageCategoryTemplate>>>> = {
  USA: { batterEye: 1.0, xbhStretch: 0.03 },
  DOM: { batterPower: 1.2, hrCarry: 0.04, hypeGain: 0.08 },
  CAN: { batterPower: 0.8, enduranceScale: -0.06 },
  JPN: { pitcherWhiff: 0.015, batterContact: 1.0 },
  KOR: { pitcherStuff: 1.2, defenderRange: 1.0 },
  MEX: { pitcherStuff: 1.0, hrCarry: 0.03 },
  BRA: { stealSpeed: 1.8, defenderRange: 0.8 },
  AUS: { pitcherStuff: 1.0, defenderRange: 1.2 },
  IRL: { luckHit: 0.008, luckZone: 0.008 },
};

const TIER_SCALE: readonly number[] = [0.55, 1.0, 1.45, 1.95];

/** Evaluates a player's live passive + high-leverage National Cultural Heritage effects from Tier 0..3. */
export function evaluateHeritageGameplayProfile(
  player: Pick<Player, 'nationalityId' | 'heritageTierUnlocked'>,
  leverageIndex: number,
): HeritageGameplayProfile {
  const nation = getNationalityById(player.nationalityId);
  const ability = nation.heritageAbility;
  const base = CATEGORY_TEMPLATES[ability.category];
  const extra = NATION_EXTRA_FLAVOR[player.nationalityId];
  const clutchScale = leverageIndex >= 1.55 ? 1.3 : 1.0;
  const scale = (TIER_SCALE[player.heritageTierUnlocked] ?? 0.55) * clutchScale;

  const val = (key: keyof HeritageCategoryTemplate): number =>
    (base[key] + (extra?.[key] ?? 0)) * scale;

  return {
    ability,
    batterContactDelta: Number(val('batterContact').toFixed(2)),
    batterPowerDelta: Number(val('batterPower').toFixed(2)),
    batterEyeDelta: Number(val('batterEye').toFixed(2)),
    pitcherStuffDelta: Number(val('pitcherStuff').toFixed(2)),
    pitcherControlDelta: Number(val('pitcherControl').toFixed(2)),
    pitcherWhiffBonus: Number(val('pitcherWhiff').toFixed(4)),
    defenderRangeDelta: Number(val('defenderRange').toFixed(2)),
    defenderFieldingDelta: Number(val('defenderFielding').toFixed(2)),
    defenderArmDelta: Number(val('defenderArm').toFixed(2)),
    stealSpeedDelta: Number(val('stealSpeed').toFixed(2)),
    hrCarryMultiplier: Number((1 + val('hrCarry')).toFixed(3)),
    xbhStretchMultiplier: Number((1 + val('xbhStretch')).toFixed(3)),
    luckHitProbDelta: Number(val('luckHit').toFixed(4)),
    luckZoneProbDelta: Number(val('luckZone').toFixed(4)),
    errorMultiplier: Math.max(0.65, Number((1 + val('errorScale')).toFixed(3))),
    hypeGainMultiplier: Number((1 + val('hypeGain')).toFixed(3)),
    enduranceDrainScale: Math.max(0.75, Number((1 + val('enduranceScale')).toFixed(3))),
    summaryTag: `★ ${ability.name} (T${player.heritageTierUnlocked})`,
  };
}

type NumericCapstoneDeltas = Omit<
  CapstoneGameplayProfile,
  'equippedPowerIds' | 'equippedPowerNames' | 'hrCarryMultiplier' | 'errorMultiplier' | 'hypeGainMultiplier'
> & {
  hrCarryBonus: number;
  errorScaleBonus: number;
  hypeGainBonus: number;
};

const ZERO_CAPSTONE_DELTAS: NumericCapstoneDeltas = {
  pitcherStuffDelta: 0,
  pitcherControlDelta: 0,
  mphBonus: 0,
  pitcherWhiffBonus: 0,
  batterContactDelta: 0,
  batterPowerDelta: 0,
  batterEyeDelta: 0,
  buntBonus: 0,
  chaseRateDelta: 0,
  hrCarryBonus: 0,
  stealSpeedDelta: 0,
  defenderRangeDelta: 0,
  defenderFieldingDelta: 0,
  defenderArmDelta: 0,
  errorScaleBonus: 0,
  hrRobberyChance: 0,
  hypeGainBonus: 0,
};

type ActiveSurgeNumbers = Omit<
  ActivePowerSurge,
  'powerId' | 'actor' | 'calloutText' | 'vfxColor' | 'ballStyle' | 'soundCue'
>;

export const ZERO_ACTIVE_SURGE_NUMBERS: ActiveSurgeNumbers = {
  contactDelta: 0,
  powerDelta: 0,
  eyeDelta: 0,
  buntBonus: 0,
  stuffDelta: 0,
  controlDelta: 0,
  mphBonus: 0,
  whiffBonus: 0,
  chaseRateDelta: 0,
  hitProbBonus: 0,
  hrCarryMultiplier: 1,
  xbhStretchMultiplier: 1,
  luckHitProbDelta: 0,
  luckZoneProbDelta: 0,
};

interface CapstoneSpec {
  id: string;
  name: string;
  branch: 'pitcher' | 'batter' | 'fielder';
  calloutText: string;
  vfxColor: string;
  ballStyle: BallVfxStyle;
  soundCue: PlaySoundCue;
  shortEffect: string;
  passive: NumericCapstoneDeltas;
  active: ActiveSurgeNumbers;
}

function makeCapstone(
  meta: Omit<CapstoneSpec, 'passive' | 'active'>,
  passive: Partial<NumericCapstoneDeltas>,
  active: Partial<ActiveSurgeNumbers> = {},
): CapstoneSpec {
  return {
    ...meta,
    passive: { ...ZERO_CAPSTONE_DELTAS, ...passive },
    active: { ...ZERO_ACTIVE_SURGE_NUMBERS, ...active },
  };
}

const CAPSTONE_SPECS: Readonly<Record<string, CapstoneSpec>> = {
  blazing_comet: makeCapstone(
    {
      id: 'blazing_comet',
      name: 'Blazing Comet',
      branch: 'pitcher',
      calloutText: 'BLAZING COMET!',
      vfxColor: '#FF4D6D',
      ballStyle: 'blazing_comet',
      soundCue: 'comet_pitch',
      shortEffect: '+3 mph heat & scorching strikeout surge.',
    },
    { pitcherStuffDelta: 3, mphBonus: 3, pitcherWhiffBonus: 0.03 },
    { stuffDelta: 14, mphBonus: 6, whiffBonus: 0.16, controlDelta: 4 },
  ),
  ghost_knuckle: makeCapstone(
    {
      id: 'ghost_knuckle',
      name: 'Ghost Knuckle',
      branch: 'pitcher',
      calloutText: 'GHOST KNUCKLE!',
      vfxColor: '#9B5DE5',
      ballStyle: 'ghost_knuckle',
      soundCue: 'knuckle_warble',
      shortEffect: 'Vanishing knuckle flutter spikes chase & swings-and-misses.',
    },
    { pitcherStuffDelta: 3, pitcherWhiffBonus: 0.035, chaseRateDelta: 0.04 },
    { stuffDelta: 13, whiffBonus: 0.18, chaseRateDelta: 0.14 },
  ),
  tornado_slider: makeCapstone(
    {
      id: 'tornado_slider',
      name: 'Tornado Slider',
      branch: 'pitcher',
      calloutText: 'TORNADO SLIDER!',
      vfxColor: '#00E5FF',
      ballStyle: 'tornado_slider',
      soundCue: 'tornado_whoosh',
      shortEffect: 'Cyclone late sweep bends past bats for Ks.',
    },
    { pitcherStuffDelta: 3, mphBonus: 1, pitcherWhiffBonus: 0.03, chaseRateDelta: 0.03 },
    { stuffDelta: 13, mphBonus: 2, whiffBonus: 0.16, chaseRateDelta: 0.12 },
  ),
  ice_veins: makeCapstone(
    {
      id: 'ice_veins',
      name: 'Ice Veins',
      branch: 'pitcher',
      calloutText: 'ICE VEINS!',
      vfxColor: '#4CC3FF',
      ballStyle: 'blazing_comet',
      soundCue: 'clutch_stinger',
      shortEffect: 'Sub-zero high-leverage pinpoint command & corner strikes.',
    },
    { pitcherStuffDelta: 2, pitcherControlDelta: 4, pitcherWhiffBonus: 0.02 },
    { stuffDelta: 10, controlDelta: 16, luckZoneProbDelta: 0.08, whiffBonus: 0.1 },
  ),
  moonshot_bomb: makeCapstone(
    {
      id: 'moonshot_bomb',
      name: 'Moonshot Bomb-Swing',
      branch: 'batter',
      calloutText: 'MOONSHOT BOMB!',
      vfxColor: '#FFC300',
      ballStyle: 'moonshot_hr',
      soundCue: 'bomb_crack',
      shortEffect: 'Towering uppercut power rockets extra home runs.',
    },
    { batterContactDelta: 1, batterPowerDelta: 4, hrCarryBonus: 0.18 },
    { contactDelta: 8, powerDelta: 18, hitProbBonus: 0.12, hrCarryMultiplier: 1.85 },
  ),
  rally_spark: makeCapstone(
    {
      id: 'rally_spark',
      name: 'Rally Spark',
      branch: 'batter',
      calloutText: 'RALLY SPARK!',
      vfxColor: '#2FB356',
      ballStyle: 'line_drive',
      soundCue: 'bat_crack',
      shortEffect: 'Clutch gap-shot contact machine that charges team Hype.',
    },
    { batterContactDelta: 4, batterPowerDelta: 1, hypeGainBonus: 0.2 },
    { contactDelta: 16, powerDelta: 6, hitProbBonus: 0.16, xbhStretchMultiplier: 1.35 },
  ),
  laser_eye: makeCapstone(
    {
      id: 'laser_eye',
      name: 'Laser Eye',
      branch: 'batter',
      calloutText: 'LASER EYE!',
      vfxColor: '#00E5FF',
      ballStyle: 'line_drive',
      soundCue: 'clutch_stinger',
      shortEffect: 'Pinpoint strike-zone radar crushes chase pitches & draws walks.',
    },
    { batterEyeDelta: 5, batterContactDelta: 3, chaseRateDelta: -0.06 },
    { eyeDelta: 22, contactDelta: 12, chaseRateDelta: -0.18, hitProbBonus: 0.12 },
  ),
  ninja_bunt: makeCapstone(
    {
      id: 'ninja_bunt',
      name: 'Ninja Bunt',
      branch: 'batter',
      calloutText: 'NINJA BUNT!',
      vfxColor: '#9B5DE5',
      ballStyle: 'ninja_bunt',
      soundCue: 'bunt_tap',
      shortEffect: 'Dead-stop chalk bunts & electric base-stealing jumps.',
    },
    { buntBonus: 18, stealSpeedDelta: 5, batterContactDelta: 1 },
    { buntBonus: 28, contactDelta: 14, hitProbBonus: 0.14 },
  ),
  sky_high_leap: makeCapstone(
    {
      id: 'sky_high_leap',
      name: 'Sky-High Leap',
      branch: 'fielder',
      calloutText: 'SKY-HIGH LEAP!',
      vfxColor: '#00E5FF',
      ballStyle: 'line_drive',
      soundCue: 'spring_boing',
      shortEffect: 'Wall-climbing grabs with live Home Run robbery chance.',
    },
    { defenderRangeDelta: 6, defenderFieldingDelta: 3, hrRobberyChance: 0.22 },
  ),
  cannon_arm: makeCapstone(
    {
      id: 'cannon_arm',
      name: 'Cannon Arm',
      branch: 'fielder',
      calloutText: 'CANNON ARM!',
      vfxColor: '#FF4D6D',
      ballStyle: 'blazing_comet',
      soundCue: 'pitch_whoosh',
      shortEffect: 'Laser-beam throws gun down base stealers & tag-up runners.',
    },
    { defenderArmDelta: 12, defenderFieldingDelta: 2 },
  ),
  iron_vacuum: makeCapstone(
    {
      id: 'iron_vacuum',
      name: 'Iron Vacuum',
      branch: 'fielder',
      calloutText: 'IRON VACUUM!',
      vfxColor: '#2FB356',
      ballStyle: 'line_drive',
      soundCue: 'glove_pop',
      shortEffect: 'Magnetic leather slashes defensive errors in half.',
    },
    { defenderFieldingDelta: 7, defenderRangeDelta: 2, errorScaleBonus: -0.55 },
  ),
};

const CAPSTONE_NODE_ID_BY_POWER: Readonly<Record<string, string>> = Object.fromEntries(
  SKILL_TREE_NODES.filter((n) => n.capstonePowerId).map((n) => [n.capstonePowerId!, n.id]),
);

function createEmptyCapstoneProfile(): CapstoneGameplayProfile {
  return {
    pitcherStuffDelta: 0,
    pitcherControlDelta: 0,
    mphBonus: 0,
    pitcherWhiffBonus: 0,
    batterContactDelta: 0,
    batterPowerDelta: 0,
    batterEyeDelta: 0,
    buntBonus: 0,
    chaseRateDelta: 0,
    hrCarryMultiplier: 1,
    stealSpeedDelta: 0,
    defenderRangeDelta: 0,
    defenderFieldingDelta: 0,
    defenderArmDelta: 0,
    errorMultiplier: 1,
    hrRobberyChance: 0,
    hypeGainMultiplier: 1,
    equippedPowerIds: [],
    equippedPowerNames: [],
  };
}

function accumulateCapstoneSpec(
  out: CapstoneGameplayProfile,
  spec: CapstoneSpec,
  highLeverage: boolean,
): void {
  const p = spec.passive;
  out.pitcherStuffDelta += p.pitcherStuffDelta;
  out.pitcherControlDelta += p.pitcherControlDelta + (spec.id === 'ice_veins' && highLeverage ? 4 : 0);
  out.mphBonus += p.mphBonus;
  out.pitcherWhiffBonus += p.pitcherWhiffBonus;
  out.batterContactDelta += p.batterContactDelta;
  out.batterPowerDelta += p.batterPowerDelta;
  out.batterEyeDelta += p.batterEyeDelta;
  out.buntBonus += p.buntBonus;
  out.chaseRateDelta += p.chaseRateDelta;
  out.hrCarryMultiplier += p.hrCarryBonus;
  out.stealSpeedDelta += p.stealSpeedDelta;
  out.defenderRangeDelta += p.defenderRangeDelta;
  out.defenderFieldingDelta += p.defenderFieldingDelta;
  out.defenderArmDelta += p.defenderArmDelta;
  out.errorMultiplier = Math.max(0.35, out.errorMultiplier + p.errorScaleBonus);
  out.hrRobberyChance = Math.min(0.4, out.hrRobberyChance + p.hrRobberyChance);
  out.hypeGainMultiplier += p.hypeGainBonus;
  out.equippedPowerIds.push(spec.id);
  out.equippedPowerNames.push(spec.name);
}

/** Evaluates all equipped individual Skill Tree Capstone Special Powers for live simulation. */
export function evaluateCapstoneGameplayProfile(
  player: Pick<Player, 'equippedPowerIds' | 'unlockedSkillIds'>,
  leverageIndex: number,
): CapstoneGameplayProfile {
  const out = createEmptyCapstoneProfile();
  const highLeverage = leverageIndex >= 1.55;

  for (const powerId of player.equippedPowerIds) {
    const spec = CAPSTONE_SPECS[powerId];
    const reqNode = CAPSTONE_NODE_ID_BY_POWER[powerId];
    if (!spec || (reqNode && !player.unlockedSkillIds.includes(reqNode))) continue;
    accumulateCapstoneSpec(out, spec, highLeverage);
  }
  return out;
}

/** Lists every National Heritage & Equipped Individual Capstone Power this player can actively unleash. */
export function getActivatablePowersForPlayer(
  player: Pick<Player, 'nationalityId' | 'heritageTierUnlocked' | 'equippedPowerIds' | 'unlockedSkillIds'>,
  role: 'pitcher' | 'batter',
): ActivatablePowerOption[] {
  const options: ActivatablePowerOption[] = [];
  const nation = getNationalityById(player.nationalityId);
  const h = nation.heritageAbility;
  options.push({
    id: h.id,
    name: `${h.name} (${nation.shortCode})`,
    source: 'heritage',
    calloutText: h.calloutText,
    vfxColor: h.vfxColor,
    shortEffect: h.shortEffect,
  });

  for (const powerId of player.equippedPowerIds) {
    const spec = CAPSTONE_SPECS[powerId];
    const reqNode = CAPSTONE_NODE_ID_BY_POWER[powerId];
    if (!spec || spec.branch !== role) continue;
    if (reqNode && !player.unlockedSkillIds.includes(reqNode)) continue;
    options.push({
      id: spec.id,
      name: spec.name,
      source: 'capstone',
      calloutText: spec.calloutText,
      vfxColor: spec.vfxColor,
      shortEffect: spec.shortEffect,
    });
  }
  return options;
}

const HERITAGE_BATTER_SURGE: Readonly<Record<HeritageAbilitySpec['category'], ActiveSurgeNumbers>> = {
  batting: { ...ZERO_ACTIVE_SURGE_NUMBERS, contactDelta: 14, powerDelta: 15, eyeDelta: 8, chaseRateDelta: -0.08, hitProbBonus: 0.14, hrCarryMultiplier: 1.55, xbhStretchMultiplier: 1.2, luckHitProbDelta: 0.02 },
  pitching: { ...ZERO_ACTIVE_SURGE_NUMBERS, contactDelta: 11, powerDelta: 8, eyeDelta: 8, chaseRateDelta: -0.08, hitProbBonus: 0.1, hrCarryMultiplier: 1.15, xbhStretchMultiplier: 1.2, luckHitProbDelta: 0.02 },
  fielding: { ...ZERO_ACTIVE_SURGE_NUMBERS, contactDelta: 11, powerDelta: 8, eyeDelta: 8, chaseRateDelta: -0.08, hitProbBonus: 0.1, hrCarryMultiplier: 1.15, xbhStretchMultiplier: 1.2, luckHitProbDelta: 0.02 },
  baserunning: { ...ZERO_ACTIVE_SURGE_NUMBERS, contactDelta: 11, powerDelta: 8, eyeDelta: 8, buntBonus: 16, chaseRateDelta: -0.08, hitProbBonus: 0.14, hrCarryMultiplier: 1.15, xbhStretchMultiplier: 1.5, luckHitProbDelta: 0.02 },
  luck: { ...ZERO_ACTIVE_SURGE_NUMBERS, contactDelta: 11, powerDelta: 8, eyeDelta: 14, chaseRateDelta: -0.08, hitProbBonus: 0.12, hrCarryMultiplier: 1.15, xbhStretchMultiplier: 1.2, luckHitProbDelta: 0.09 },
};

const HERITAGE_PITCHER_SURGE: Readonly<Record<HeritageAbilitySpec['category'], ActiveSurgeNumbers>> = {
  batting: { ...ZERO_ACTIVE_SURGE_NUMBERS, stuffDelta: 11, controlDelta: 8, mphBonus: 2, whiffBonus: 0.11, chaseRateDelta: 0.06, luckZoneProbDelta: 0.02 },
  pitching: { ...ZERO_ACTIVE_SURGE_NUMBERS, stuffDelta: 15, controlDelta: 12, mphBonus: 4, whiffBonus: 0.16, chaseRateDelta: 0.11, luckZoneProbDelta: 0.02 },
  fielding: { ...ZERO_ACTIVE_SURGE_NUMBERS, stuffDelta: 12, controlDelta: 8, mphBonus: 2, whiffBonus: 0.12, chaseRateDelta: 0.07, luckZoneProbDelta: 0.02 },
  baserunning: { ...ZERO_ACTIVE_SURGE_NUMBERS, stuffDelta: 11, controlDelta: 8, mphBonus: 2, whiffBonus: 0.11, chaseRateDelta: 0.06, luckZoneProbDelta: 0.02 },
  luck: { ...ZERO_ACTIVE_SURGE_NUMBERS, stuffDelta: 11, controlDelta: 12, mphBonus: 2, whiffBonus: 0.11, chaseRateDelta: 0.06, luckZoneProbDelta: 0.09 },
};

function buildHeritageActiveSurge(
  actor: 'pitcher' | 'batter',
  player: Pick<Player, 'nationalityId' | 'heritageTierUnlocked'>,
): ActivePowerSurge {
  const ability = getNationalityById(player.nationalityId).heritageAbility;
  const tierScale = 1 + player.heritageTierUnlocked * 0.14;
  const template =
    actor === 'pitcher'
      ? HERITAGE_PITCHER_SURGE[ability.category]
      : HERITAGE_BATTER_SURGE[ability.category];

  return {
    ...template,
    powerId: ability.id,
    actor,
    calloutText: `${ability.calloutText} (${ability.name})`,
    vfxColor: ability.vfxColor,
    ballStyle: ability.ballStyle,
    soundCue: 'heritage_power_surge',
    contactDelta: Math.round(template.contactDelta * tierScale),
    powerDelta: Math.round(template.powerDelta * tierScale),
    eyeDelta: Math.round(template.eyeDelta * tierScale),
    stuffDelta: Math.round(template.stuffDelta * tierScale),
    controlDelta: Math.round(template.controlDelta * tierScale),
  };
}

/** Computes the active pre-pitch surge for either a National Heritage Power or Individual Capstone Power. */
export function evaluateActivePowerSurge(
  powerId: string,
  actor: 'pitcher' | 'batter',
  player: Pick<Player, 'nationalityId' | 'heritageTierUnlocked'>,
): ActivePowerSurge {
  const cap = CAPSTONE_SPECS[powerId];
  if (!cap || cap.branch !== actor) {
    return buildHeritageActiveSurge(actor, player);
  }
  return {
    ...cap.active,
    powerId: cap.id,
    actor,
    calloutText: `${cap.calloutText} (${cap.name})`,
    vfxColor: cap.vfxColor,
    ballStyle: cap.ballStyle,
    soundCue: cap.soundCue,
  };
}
