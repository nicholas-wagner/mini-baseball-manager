import { isPitcherPosition, type Player, type PlayerRatings } from '../models/player';

export type SynergyBondId =
  | 'bash_brothers'
  | 'battery_telepathy'
  | 'double_play_wizards'
  | 'speed_demons'
  | 'clutch_captains'
  | 'no_fly_zone';

export interface ActiveSynergyBond {
  id: SynergyBondId;
  name: string;
  callout: string;
  memberNames: readonly string[];
  description: string;
  bonuses: Partial<Record<keyof PlayerRatings, number>>;
}

export interface ClubhouseChemistryReport {
  moraleScore: number; // 0..100
  chemistryTier: 'electric' | 'tight_knit' | 'steady' | 'tense';
  glueLeaderCount: number;
  activeBonds: readonly ActiveSynergyBond[];
  totalTeamRatingBonus: Record<'contact' | 'power' | 'speed' | 'fielding' | 'control' | 'clutch', number>;
}

function checkBashBrothers(roster: readonly Player[]): ActiveSynergyBond | null {
  const sluggers = roster.filter((p) => !isPitcherPosition(p.position) && p.ratings.power >= 74);
  if (sluggers.length < 2) return null;
  return {
    id: 'bash_brothers',
    name: 'Bash Brothers',
    callout: 'BASH BROTHERS DUO!',
    memberNames: sluggers.slice(0, 2).map((p) => p.name),
    description: 'Two middle-of-the-order mashers feed off each other (+3 Power, +2 Clutch).',
    bonuses: { power: 3, clutch: 2 },
  };
}

function checkBatteryTelepathy(roster: readonly Player[]): ActiveSynergyBond | null {
  const catcher = roster.find((p) => p.position === 'C' && p.ratings.fielding >= 70);
  const ace = roster.find((p) => isPitcherPosition(p.position) && p.ratings.control >= 72);
  if (!catcher || !ace) return null;
  return {
    id: 'battery_telepathy',
    name: 'Battery Telepathy',
    callout: 'BATTERY TELEPATHY!',
    memberNames: [ace.name, catcher.name],
    description: 'Pitcher and Catcher stay one step ahead (+3 Control, +2 Clutch).',
    bonuses: { control: 3, clutch: 2 },
  };
}

function checkDoublePlayWizards(roster: readonly Player[]): ActiveSynergyBond | null {
  const ss = roster.find((p) => p.position === 'SS' && p.ratings.fielding >= 72);
  const second = roster.find((p) => p.position === '2B' && p.ratings.fielding >= 72);
  if (!ss || !second) return null;
  return {
    id: 'double_play_wizards',
    name: 'Double-Play Wizards',
    callout: 'TURN-TWO WIZARDS!',
    memberNames: [ss.name, second.name],
    description: 'Silky SS/2B keystone tandem locks down the infield (+4 Fielding).',
    bonuses: { fielding: 4 },
  };
}

function checkSpeedDemons(roster: readonly Player[]): ActiveSynergyBond | null {
  const burners = roster.filter((p) => !isPitcherPosition(p.position) && p.ratings.speed >= 76);
  if (burners.length < 2) return null;
  return {
    id: 'speed_demons',
    name: 'Speed Demons',
    callout: 'SPEED DEMONS ON THE LOOSE!',
    memberNames: burners.slice(0, 3).map((p) => p.name),
    description: 'Table-setting track stars rattle opposing defenses (+3 Speed, +2 Contact).',
    bonuses: { speed: 3, contact: 2 },
  };
}

function checkClutchCaptains(roster: readonly Player[]): ActiveSynergyBond | null {
  const captains = roster.filter(
    (p) => p.personality === 'clutch_captain' || p.mentalTraits.includes('clubhouse_glue'),
  );
  if (captains.length < 2) return null;
  return {
    id: 'clutch_captains',
    name: 'Clubhouse Captains',
    callout: 'CAPTAINS CLUBHOUSE AURA!',
    memberNames: captains.slice(0, 2).map((p) => p.name),
    description: 'Veteran leadership steadies the dugout in crunch time (+3 Clutch, +1 Contact).',
    bonuses: { clutch: 3, contact: 1 },
  };
}

function checkNoFlyZone(roster: readonly Player[]): ActiveSynergyBond | null {
  const outfielders = roster.filter(
    (p) => (p.position === 'LF' || p.position === 'CF' || p.position === 'RF') && p.ratings.range >= 72,
  );
  if (outfielders.length < 3) return null;
  return {
    id: 'no_fly_zone',
    name: 'No-Fly-Zone Outfield',
    callout: 'NO-FLY ZONE!',
    memberNames: outfielders.slice(0, 3).map((p) => p.name),
    description: 'All three outfielders patrol every gap (+3 Fielding, +1 Speed).',
    bonuses: { fielding: 3, speed: 1 },
  };
}

const SYNERGY_DETECTORS = [
  checkBashBrothers,
  checkBatteryTelepathy,
  checkDoublePlayWizards,
  checkSpeedDemons,
  checkClutchCaptains,
  checkNoFlyZone,
] as const;

function classifyChemistryTier(morale: number): ClubhouseChemistryReport['chemistryTier'] {
  if (morale >= 80) return 'electric';
  if (morale >= 65) return 'tight_knit';
  if (morale >= 45) return 'steady';
  return 'tense';
}

function sumBondRatingBonuses(activeBonds: readonly ActiveSynergyBond[]) {
  const totals = { contact: 0, power: 0, speed: 0, fielding: 0, control: 0, clutch: 0 };
  for (const bond of activeBonds) {
    totals.contact += bond.bonuses.contact ?? 0;
    totals.power += bond.bonuses.power ?? 0;
    totals.speed += bond.bonuses.speed ?? 0;
    totals.fielding += bond.bonuses.fielding ?? 0;
    totals.control += bond.bonuses.control ?? 0;
    totals.clutch += bond.bonuses.clutch ?? 0;
  }
  return totals;
}

/** Evaluates Clubhouse Chemistry morale and active Duo/Trio Synergy Bonds for a club roster. */
export function evaluateClubhouseChemistry(roster: readonly Player[]): ClubhouseChemistryReport {
  const activeBonds: ActiveSynergyBond[] = [];
  for (const detector of SYNERGY_DETECTORS) {
    const found = detector(roster);
    if (found) activeBonds.push(found);
  }

  const glueLeaderCount = roster.filter((p) => p.mentalTraits.includes('clubhouse_glue')).length;
  const highEnergyCount = roster.filter((p) => p.mentalTraits.includes('high_energy')).length;
  const showboatClash = Math.max(0, roster.filter((p) => p.personality === 'showboat').length - 3) * 4;
  const avgMorale =
    roster.length > 0 ? roster.reduce((sum, p) => sum + p.morale, 0) / roster.length : 60;
  const moraleScore = Math.max(
    15,
    Math.min(
      100,
      Math.round(avgMorale + glueLeaderCount * 3 + highEnergyCount * 1.5 + activeBonds.length * 2 - showboatClash),
    ),
  );

  return {
    moraleScore,
    chemistryTier: classifyChemistryTier(moraleScore),
    glueLeaderCount,
    activeBonds,
    totalTeamRatingBonus: sumBondRatingBonuses(activeBonds),
  };
}
