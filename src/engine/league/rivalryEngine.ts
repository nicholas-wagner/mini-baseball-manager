import type { Club } from '../models/club';

export type RivalrySparkTrigger =
  | 'crosstown_origin'
  | 'walk_off_finish'
  | 'playoff_rematch'
  | 'poached_free_agent'
  | 'mascot_prank'
  | 'blowout_sweep';

export type RivalryHeatTier = 'neutral' | 'simmering' | 'heated' | 'fierce' | 'blood_feud';

export interface RivalrySparkLog {
  trigger: RivalrySparkTrigger;
  heatDelta: number;
  headline: string;
}

export interface DynamicRivalryRecord {
  id: string;
  clubIdA: string;
  clubIdB: string;
  heat: number; // 0..100
  cupName: string;
  cupHolderClubId: string | null;
  recentSparks: RivalrySparkLog[];
}

export interface RivalryShowdownModifiers {
  tier: RivalryHeatTier;
  hypeGainMultiplier: number; // 1.0..1.50
  xpMultiplier: number; // 1.0..1.25
  attendanceSurgePct: number; // 0..0.35
  isShowdownActive: boolean;
}

export interface RivalryShowdownPreview {
  vsBannerTitle: string;
  heat: number;
  tier: RivalryHeatTier;
  cupName: string;
  cupHolderName: string;
  latestSparkHeadline: string;
  modifiers: RivalryShowdownModifiers;
}

const SPARK_HEAT_DELTAS: Readonly<Record<RivalrySparkTrigger, number>> = {
  crosstown_origin: 40,
  walk_off_finish: 18,
  playoff_rematch: 22,
  poached_free_agent: 25,
  mascot_prank: 14,
  blowout_sweep: 12,
};

function makePairKey(clubIdA: string, clubIdB: string): [string, string] {
  return clubIdA < clubIdB ? [clubIdA, clubIdB] : [clubIdB, clubIdA];
}

function matchesPair(rec: DynamicRivalryRecord, clubIdA: string, clubIdB: string): boolean {
  const [a, b] = makePairKey(clubIdA, clubIdB);
  return rec.clubIdA === a && rec.clubIdB === b;
}

export function getRivalryHeatTier(heat: number): RivalryHeatTier {
  if (heat >= 80) return 'blood_feud';
  if (heat >= 55) return 'fierce';
  if (heat >= 30) return 'heated';
  if (heat >= 15) return 'simmering';
  return 'neutral';
}

/** Creates an instant Crosstown Rival pairing with a custom Traveling Rivalry Cup. */
export function createCrosstownStarterRivalry(
  clubA: Club,
  clubB: Club,
): DynamicRivalryRecord {
  const [a, b] = makePairKey(clubA.id, clubB.id);
  return {
    id: `riv-${a}-${b}`,
    clubIdA: a,
    clubIdB: b,
    heat: SPARK_HEAT_DELTAS.crosstown_origin,
    cupName: `${clubA.city}–${clubB.city} Sandlot Cup`,
    cupHolderClubId: null,
    recentSparks: [
      {
        trigger: 'crosstown_origin',
        heatDelta: SPARK_HEAT_DELTAS.crosstown_origin,
        headline: `Crosstown foes ${clubA.name} & ${clubB.name} battle for local bragging rights!`,
      },
    ],
  };
}

/** Escalates rivalry heat (clamped 0..100) and logs dramatic triggers like walk-offs or poached stars. */
export function recordRivalrySpark(
  records: readonly DynamicRivalryRecord[],
  clubIdA: string,
  clubIdB: string,
  trigger: RivalrySparkTrigger,
  headline: string,
): DynamicRivalryRecord[] {
  const delta = SPARK_HEAT_DELTAS[trigger];
  const spark: RivalrySparkLog = { trigger, heatDelta: delta, headline };
  const existing = records.find((r) => matchesPair(r, clubIdA, clubIdB));

  if (!existing) {
    const [a, b] = makePairKey(clubIdA, clubIdB);
    return [
      ...records,
      {
        id: `riv-${a}-${b}`,
        clubIdA: a,
        clubIdB: b,
        heat: Math.min(100, delta),
        cupName: 'Traveling Rivalry Cup',
        cupHolderClubId: null,
        recentSparks: [spark],
      },
    ];
  }

  return records.map((rec) =>
    rec.id === existing.id
      ? {
          ...rec,
          heat: Math.min(100, rec.heat + delta),
          recentSparks: [spark, ...rec.recentSparks].slice(0, 6),
        }
      : rec,
  );
}

/** Computes live Hype charge, XP, and Attendance Sellout Surge bonuses from Rivalry Heat. */
export function evaluateRivalryShowdownModifiers(heat: number): RivalryShowdownModifiers {
  const tier = getRivalryHeatTier(heat);
  if (tier === 'blood_feud') {
    return {
      tier,
      hypeGainMultiplier: 1.5,
      xpMultiplier: 1.25,
      attendanceSurgePct: 0.35,
      isShowdownActive: true,
    };
  }
  if (tier === 'fierce') {
    return {
      tier,
      hypeGainMultiplier: 1.35,
      xpMultiplier: 1.25,
      attendanceSurgePct: 0.25,
      isShowdownActive: true,
    };
  }
  if (tier === 'heated') {
    return {
      tier,
      hypeGainMultiplier: 1.25,
      xpMultiplier: 1.15,
      attendanceSurgePct: 0.15,
      isShowdownActive: true,
    };
  }
  if (tier === 'simmering') {
    return {
      tier,
      hypeGainMultiplier: 1.1,
      xpMultiplier: 1.05,
      attendanceSurgePct: 0.08,
      isShowdownActive: false,
    };
  }
  return {
    tier,
    hypeGainMultiplier: 1.0,
    xpMultiplier: 1.0,
    attendanceSurgePct: 0,
    isShowdownActive: false,
  };
}

/** Updates Traveling Rivalry Cup ownership whenever a rivalry series concludes. */
export function updateTravelingRivalryCup(
  records: readonly DynamicRivalryRecord[],
  clubIdA: string,
  clubIdB: string,
  winnerClubId: string,
): DynamicRivalryRecord[] {
  return records.map((rec) =>
    matchesPair(rec, clubIdA, clubIdB)
      ? { ...rec, cupHolderClubId: winnerClubId }
      : rec,
  );
}

/** Generates the 90s Comic "VS" splash banner payload for Game Day Rivalry Showdowns. */
export function buildRivalryShowdownPreview(
  homeClub: Club,
  awayClub: Club,
  record: DynamicRivalryRecord,
): RivalryShowdownPreview {
  const modifiers = evaluateRivalryShowdownModifiers(record.heat);
  const tierBanner =
    modifiers.tier === 'blood_feud'
      ? '90s BLOOD FEUD SHOWDOWN!'
      : modifiers.tier === 'fierce'
        ? 'FIERCE RIVALRY CLASH!'
        : 'RIVALRY SHOWDOWN!';
  const holderName =
    record.cupHolderClubId === homeClub.id
      ? `${homeClub.city} ${homeClub.name}`
      : record.cupHolderClubId === awayClub.id
        ? `${awayClub.city} ${awayClub.name}`
        : 'Vacant — Up for Grabs!';

  return {
    vsBannerTitle: `${tierBanner} ${awayClub.name} VS ${homeClub.name}`,
    heat: record.heat,
    tier: modifiers.tier,
    cupName: record.cupName,
    cupHolderName: holderName,
    latestSparkHeadline: record.recentSparks[0]?.headline ?? 'Rivalry pride is on the line!',
    modifiers,
  };
}
