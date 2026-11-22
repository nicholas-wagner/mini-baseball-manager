import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
} from '../models/club';

export interface ParodySponsor {
  id: string;
  name: string;
  tagline: string;
  billboardColor: string;
  minTier: LeagueTierId;
  seriesPayout: number;
  milestoneBonus: number;
  milestoneDescription: string;
}

export interface TvContractOffer {
  id: string;
  networkName: string;
  minTier: LeagueTierId;
  seriesPayout: number;
  fanExposureBonus: number;
}

export const MAX_ACTIVE_SPONSORS = 3;

/** 90s Parody Outfield Wall Sponsors with live series payouts & milestone bonuses. */
export const PARODY_SPONSORS_CATALOG: readonly ParodySponsor[] = [
  {
    id: 'turbo_fizz',
    name: 'TURBO FIZZ SODA',
    tagline: 'Extreme 1994 Citrus Blast!',
    billboardColor: '#00E5FF',
    minTier: 'rookie',
    seriesPayout: 450,
    milestoneBonus: 300,
    milestoneDescription: 'Bonus when club hits 3+ HRs in a series',
  },
  {
    id: 'pixel_pizza',
    name: 'PIXEL PIZZA PALACE',
    tagline: '8-Bit Slices, 16-Bit Cheese!',
    billboardColor: '#FF595E',
    minTier: 'rookie',
    seriesPayout: 400,
    milestoneBonus: 250,
    milestoneDescription: 'Bonus for every home win',
  },
  {
    id: 'rad_shades',
    name: 'RAD WRAP SHADES',
    tagline: 'Too Cool for Day Games',
    billboardColor: '#9B5DE5',
    minTier: 'low_a',
    seriesPayout: 750,
    milestoneBonus: 450,
    milestoneDescription: 'Bonus for recording 20+ Ks in a series',
  },
  {
    id: 'crunch_os',
    name: "CRUNCH-O's CEREAL",
    tagline: 'Part of a Grand-Slam Breakfast!',
    billboardColor: '#FFC300',
    minTier: 'high_a',
    seriesPayout: 1_200,
    milestoneBonus: 700,
    milestoneDescription: 'Bonus for any series sweep',
  },
  {
    id: 'hyper_v_vhs',
    name: 'HYPER-V VHS RENTAL',
    tagline: 'Be Kind, Rewind the Walk-Off!',
    billboardColor: '#2563EB',
    minTier: 'aa',
    seriesPayout: 2_100,
    milestoneBonus: 1_100,
    milestoneDescription: 'Bonus for winning a Rivalry Showdown',
  },
  {
    id: 'mega_chrome_cards',
    name: 'MEGA CHROME TRADING CARDS',
    tagline: 'Pull the Holo Foil Legend!',
    billboardColor: '#10B981',
    minTier: 'aaa',
    seriesPayout: 3_600,
    milestoneBonus: 1_800,
    milestoneDescription: 'Bonus when an All-Star wins Game MVP',
  },
];

export const TV_CONTRACTS_CATALOG: readonly TvContractOffer[] = [
  {
    id: 'tv_public_access',
    networkName: 'Channel 54 Sandlot Public Access',
    minTier: 'rookie',
    seriesPayout: 350,
    fanExposureBonus: 15,
  },
  {
    id: 'tv_local_cable',
    networkName: 'Metro-90 Local Cable Sports',
    minTier: 'low_a',
    seriesPayout: 950,
    fanExposureBonus: 45,
  },
  {
    id: 'tv_regional_sports',
    networkName: 'Tri-State Regional Sports Net',
    minTier: 'aa',
    seriesPayout: 2_800,
    fanExposureBonus: 120,
  },
  {
    id: 'tv_national_primetime',
    networkName: 'Mini-Majors National Primetime Network',
    minTier: 'majors',
    seriesPayout: 8_500,
    fanExposureBonus: 360,
  },
];

function meetsTier(current: LeagueTierId, required: LeagueTierId): boolean {
  return LEAGUE_TIER_ORDER.indexOf(current) >= LEAGUE_TIER_ORDER.indexOf(required);
}

export function getAvailableSponsors(tier: LeagueTierId): readonly ParodySponsor[] {
  return PARODY_SPONSORS_CATALOG.filter((s) => meetsTier(tier, s.minTier));
}

export function getAvailableTvContracts(tier: LeagueTierId): readonly TvContractOffer[] {
  return TV_CONTRACTS_CATALOG.filter((t) => meetsTier(tier, t.minTier));
}

export function signParodySponsor(
  club: Club,
  sponsorId: string,
): { signed: boolean; reason?: string; club: Club } {
  const sponsor = PARODY_SPONSORS_CATALOG.find((s) => s.id === sponsorId);
  if (!sponsor) return { signed: false, reason: 'Sponsor not found.', club };
  if (!meetsTier(club.leagueTier, sponsor.minTier)) {
    return { signed: false, reason: `${sponsor.name} requires ${sponsor.minTier.toUpperCase()} tier.`, club };
  }
  const active = club.economy.activeSponsorIds ?? [];
  if (active.includes(sponsor.id)) {
    return { signed: false, reason: `${sponsor.name} is already on your outfield wall.`, club };
  }
  if (active.length >= MAX_ACTIVE_SPONSORS) {
    return { signed: false, reason: `Outfield wall full (max ${MAX_ACTIVE_SPONSORS} active sponsors).`, club };
  }
  return {
    signed: true,
    club: {
      ...club,
      economy: {
        ...club.economy,
        activeSponsorIds: [...active, sponsor.id],
      },
    },
  };
}

export function signTvContract(
  club: Club,
  tvContractId: string,
): { signed: boolean; reason?: string; club: Club } {
  const deal = TV_CONTRACTS_CATALOG.find((t) => t.id === tvContractId);
  if (!deal) return { signed: false, reason: 'TV deal not found.', club };
  if (!meetsTier(club.leagueTier, deal.minTier)) {
    return { signed: false, reason: `${deal.networkName} unlocks at ${deal.minTier.toUpperCase()} tier.`, club };
  }
  return {
    signed: true,
    club: {
      ...club,
      economy: {
        ...club.economy,
        tvContractId: deal.id,
      },
    },
  };
}
