import type { Club } from '../models/club';
import type { ManagerProfile } from '../models/manager';

export type ManagerBackstoryId =
  | 'sandlot_hero'
  | 'ex_pro_comeback'
  | 'spreadsheet_prodigy'
  | 'showbiz_promoter'
  | 'world_ball_scout'
  | 'surprise_inheritor'
  | 'former_umpire'
  | 'ragtag_movie_coach';

export interface BackstoryStartingModifiers {
  cashDelta: number;
  fanBaseMultiplier: number;
  hypeDelta: number;
  bonusManagerSp: number;
  startingManagerLevel: number;
  initialRivalryHeat: number;
  starterRelicId: string | null;
  scoutingBudgetDelta: number;
}

export interface BackstoryOngoingPassives {
  rookieXpMultiplier: number;
  veteranFaDiscountPct: number;
  winterBallDiscountPct: number;
  heritageChargeBonusPct: number;
  promoRevenueMultiplier: number;
  clutchBonus: number;
  luckAura: number;
  stealJumpBonus: number;
  tradeEfficiencyBonusPct: number;
}

export interface ManagerBackstory {
  id: ManagerBackstoryId;
  title: string;
  tagline: string;
  arcTitle: string;
  badgeIcon: string;
  accentColor: string;
  openingNarration: string;
  perks: readonly string[];
  tradeOffs: readonly string[];
  startingModifiers: BackstoryStartingModifiers;
  ongoingPassives: BackstoryOngoingPassives;
}

/** 8 replayable 90s Choose-Your-Own-Adventure Manager Backstories with balanced perks & trade-offs. */
export const MANAGER_BACKSTORIES: readonly ManagerBackstory[] = [
  {
    id: 'sandlot_hero',
    title: 'Hometown Sandlot Hero',
    tagline: 'Save the neighborhood diamond from bulldozers and take local kids to the Majors!',
    arcTitle: 'Save the Sandlot',
    badgeIcon: '🧢',
    accentColor: '#2FB356',
    openingNarration:
      'You grew up shagging fly balls behind the rusty chain-link fence. When condo mogul Rex Vance tried to pave over the field, you emptied your piggy bank, rallied the whole block, and swore you would carry this sandlot all the way to the Mini Major League!',
    perks: [
      '+25% starting Fanbase & +15 Opening Day Team Hype',
      'Hometown Rookies earn +12% XP and extra clubhouse warmth',
      'Huge community support during hometown Promo Nights',
    ],
    tradeOffs: [
      'Shoestring starting bankroll (-$2,500 cash)',
      'Slower corporate sponsor leverage in Year 1',
      'Fans feel extra heartbreak if you trade away homegrown favorites',
    ],
    startingModifiers: {
      cashDelta: -2_500,
      fanBaseMultiplier: 1.25,
      hypeDelta: 15,
      bonusManagerSp: 0,
      startingManagerLevel: 1,
      initialRivalryHeat: 15,
      starterRelicId: null,
      scoutingBudgetDelta: 0,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.12,
      veteranFaDiscountPct: 0,
      winterBallDiscountPct: 0,
      heritageChargeBonusPct: 5,
      promoRevenueMultiplier: 1.12,
      clutchBonus: 1,
      luckAura: 2,
      stealJumpBonus: 1,
      tradeEfficiencyBonusPct: 0,
    },
  },
  {
    id: 'ex_pro_comeback',
    title: 'Washed-Up 90s Ex-Pro',
    tagline: 'One swing short of glory as a player — back in the dugout with unfinished business!',
    arcTitle: 'Unfinished Business',
    badgeIcon: '📺',
    accentColor: '#E63946',
    openingNarration:
      'Ten years ago you were on every cereal box before a blown knee ended your playing career in Game 7. Your old nemesis still runs a powerhouse up the ladder — time to dust off your cleats, flash the dugout signs, and finish what you started!',
    perks: [
      'Start at Manager Lv. 2 with +2 bonus Manager SP immediately',
      'Veterans take a 10% loyalty discount to play for your dugout',
      '+3 Clutch aura during high-leverage & playoff innings',
    ],
    tradeOffs: [
      'Instant +35 Rivalry Heat with your bitter crosstown nemesis',
      'Intense tabloid scrutiny in The Sandlot Gazette during slumps',
      'Veterans expect heavy playing time',
    ],
    startingModifiers: {
      cashDelta: 0,
      fanBaseMultiplier: 1.1,
      hypeDelta: 8,
      bonusManagerSp: 2,
      startingManagerLevel: 2,
      initialRivalryHeat: 35,
      starterRelicId: null,
      scoutingBudgetDelta: 0,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.0,
      veteranFaDiscountPct: 10,
      winterBallDiscountPct: 0,
      heritageChargeBonusPct: 0,
      promoRevenueMultiplier: 1.05,
      clutchBonus: 3,
      luckAura: 0,
      stealJumpBonus: 0,
      tradeEfficiencyBonusPct: 5,
    },
  },
  {
    id: 'spreadsheet_prodigy',
    title: '1994 Spreadsheet Prodigy',
    tagline: 'Armed with a beige 486 PC, floppy disks, and an OBP revolution nobody saw coming!',
    arcTitle: 'Prove the Doubters Wrong',
    badgeIcon: '📊',
    accentColor: '#0096C7',
    openingNarration:
      'Old-school scouts laughed when you hauled a humming CRT monitor and three binders of OBP/WHIP printouts into Rookie Ball. Let them laugh—your formulas spot undervalued gems, lethal platoon splits, and sneaky steals before anyone else!',
    perks: [
      '+$1,500 starting Scouting Budget for early Fog-of-War draft reveals',
      '+15% Trade Machine negotiation efficiency on swaps',
      'Sharper young-player plate discipline & steal-odds optimization',
    ],
    tradeOffs: [
      'Starts with -12 Team Hype (fans think math is boring until you win!)',
      'Slower initial merch hype until your first winning streak',
      'Old-school sportswriters love nitpicking every bold move',
    ],
    startingModifiers: {
      cashDelta: 500,
      fanBaseMultiplier: 0.92,
      hypeDelta: -12,
      bonusManagerSp: 1,
      startingManagerLevel: 1,
      initialRivalryHeat: 10,
      starterRelicId: null,
      scoutingBudgetDelta: 1_500,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.08,
      veteranFaDiscountPct: 5,
      winterBallDiscountPct: 5,
      heritageChargeBonusPct: 0,
      promoRevenueMultiplier: 0.95,
      clutchBonus: 0,
      luckAura: 1,
      stealJumpBonus: 2,
      tradeEfficiencyBonusPct: 15,
    },
  },
  {
    id: 'showbiz_promoter',
    title: 'Showbiz Bleacher Promoter',
    tagline: 'Fireworks, neon shades & loaded nachos — turning every homestand into a carnival!',
    arcTitle: 'The Greatest Show on Turf',
    badgeIcon: '🎪',
    accentColor: '#9B5DE5',
    openingNarration:
      'You promoted roller rinks, arcade lock-ins, and halftime monster-truck rallies before buying a baseball franchise. Critics call it a circus, but when 2,000 screaming fans catch t-shirts from your mascot cannon, cash flows straight into championship talent!',
    perks: [
      '+$3,500 starting cash war chest for rapid upgrades & staff',
      '+22% Promo Night & ballpark concession revenue surge',
      '+12 Opening Day Team Hype out of the gate',
    ],
    tradeOffs: [
      'Slightly wilder clubhouse focus until you hire disciplined coaches',
      'Fans expect nonstop spectacle — quiet stretches cool hype faster',
      'Higher press expectation for flashy wins',
    ],
    startingModifiers: {
      cashDelta: 3_500,
      fanBaseMultiplier: 1.15,
      hypeDelta: 12,
      bonusManagerSp: 0,
      startingManagerLevel: 1,
      initialRivalryHeat: 20,
      starterRelicId: null,
      scoutingBudgetDelta: 0,
    },
    ongoingPassives: {
      rookieXpMultiplier: 0.98,
      veteranFaDiscountPct: 0,
      winterBallDiscountPct: 0,
      heritageChargeBonusPct: 10,
      promoRevenueMultiplier: 1.22,
      clutchBonus: 1,
      luckAura: 2,
      stealJumpBonus: 1,
      tradeEfficiencyBonusPct: 4,
    },
  },
  {
    id: 'world_ball_scout',
    title: 'Wandering World-Ball Scout',
    tagline: 'Veteran of Osaka, Santo Domingo, Mazatlán & Sydney chasing Global Chibi Cup glory!',
    arcTitle: 'World Without Borders',
    badgeIcon: '🌏',
    accentColor: '#0EA5E9',
    openingNarration:
      'Your passport is stamped with winter-league chalk dust from four continents. You speak the universal language of curveballs, glove flips, and Cultural Heritage powers—ready to unite global stars under one roaring clubhouse roof!',
    perks: [
      '-30% Offseason Winter Ball travel stipends all career long',
      'Cultural Heritage Myth/Animal Powers charge +15% faster',
      '+$1,000 Scouting Budget to unearth international sleepers',
    ],
    tradeOffs: [
      'Smaller initial local Fanbase (-12%) until the city falls in love with your style',
      'Modest Year-1 hometown media buzz',
    ],
    startingModifiers: {
      cashDelta: 0,
      fanBaseMultiplier: 0.88,
      hypeDelta: 2,
      bonusManagerSp: 1,
      startingManagerLevel: 1,
      initialRivalryHeat: 10,
      starterRelicId: null,
      scoutingBudgetDelta: 1_000,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.06,
      veteranFaDiscountPct: 5,
      winterBallDiscountPct: 30,
      heritageChargeBonusPct: 15,
      promoRevenueMultiplier: 1.02,
      clutchBonus: 1,
      luckAura: 1,
      stealJumpBonus: 2,
      tradeEfficiencyBonusPct: 8,
    },
  },
  {
    id: 'surprise_inheritor',
    title: 'Surprise Family Inheritor',
    tagline: 'Great-Aunt Bea left you a creaky sandlot franchise, an attic trunk & wild dares!',
    arcTitle: "Aunt Bea's Championship Clause",
    badgeIcon: '🏛️',
    accentColor: '#F59E0B',
    openingNarration:
      'You thought you were inheriting Great-Aunt Bea’s teacup collection—instead her lawyer handed you the deed to a quirky Rookie Sandlot baseball club, a gleaming vintage 90s Relic from 1988, and a sealed envelope of outrageous franchise dares!',
    perks: [
      'Start Day 1 with a rare vintage 90s Relic equipped on your captain',
      'Heirloom Stadium Charm grants +5 universal Luck aura across the roster',
      '+$1,800 estate maintenance stipend',
    ],
    tradeOffs: [
      'Quirky estate board expects bold, risky story choices each season',
      'Higher expectations when climbing out of Rookie Ball',
    ],
    startingModifiers: {
      cashDelta: 1_800,
      fanBaseMultiplier: 1.05,
      hypeDelta: 6,
      bonusManagerSp: 0,
      startingManagerLevel: 1,
      initialRivalryHeat: 15,
      starterRelicId: 'golden_ash_bat',
      scoutingBudgetDelta: 0,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.04,
      veteranFaDiscountPct: 0,
      winterBallDiscountPct: 10,
      heritageChargeBonusPct: 8,
      promoRevenueMultiplier: 1.08,
      clutchBonus: 1,
      luckAura: 5,
      stealJumpBonus: 1,
      tradeEfficiencyBonusPct: 5,
    },
  },
  {
    id: 'former_umpire',
    title: 'Strike-Zone Whisperer (Ex-Ump)',
    tagline: 'Twelve dusty summers behind home plate taught you every framing & dugout mind game!',
    arcTitle: 'Calling Your Own Shot',
    badgeIcon: '⚡',
    accentColor: '#1D3557',
    openingNarration:
      'After calling 100,000 pitches behind the mask, you traded your whisk broom for a lineup card. Nobody reads a strike zone, times a pitcher’s delivery for a steal, or rattles an opposing skipper like an ex-umpire!',
    perks: [
      '+3 Base-Stealing jump & pitch-timing read for your runners',
      '+2 Clutch composure during tight late-inning counts',
      '+1 bonus Manager SP to jumpstart your Skipper tree',
    ],
    tradeOffs: [
      'Opposing managers chirp louder (+22 starting Rivalry Heat)',
      'Starts with slightly cooler fan buzz (-5 Hype) until your smarts shine',
    ],
    startingModifiers: {
      cashDelta: 400,
      fanBaseMultiplier: 0.96,
      hypeDelta: -5,
      bonusManagerSp: 1,
      startingManagerLevel: 1,
      initialRivalryHeat: 22,
      starterRelicId: null,
      scoutingBudgetDelta: 500,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.05,
      veteranFaDiscountPct: 6,
      winterBallDiscountPct: 0,
      heritageChargeBonusPct: 0,
      promoRevenueMultiplier: 1.0,
      clutchBonus: 2,
      luckAura: 3,
      stealJumpBonus: 3,
      tradeEfficiencyBonusPct: 6,
    },
  },
  {
    id: 'ragtag_movie_coach',
    title: '90s Kids-Movie Miracle Coach',
    tagline: 'Answered a newspaper classified ad to coach lovable misfits into a Hollywood montage!',
    arcTitle: 'Saturday Morning Miracle',
    badgeIcon: '🎬',
    accentColor: '#FF4D6D',
    openingNarration:
      'You answered a tiny ad in The Sandlot Gazette thinking it was for Little League snack duty—now you’re leading a chaotic, big-hearted squad of underdogs with duct-taped bats and unstoppable comeback magic!',
    perks: [
      'Unbelievable Underdog Magic: +16% Rookie XP growth & +3 Clutch',
      'Instant clubhouse harmony & electric late-inning comeback energy',
      '+10 Opening Day Team Hype as word spreads',
    ],
    tradeOffs: [
      'Lean startup funds (-$1,500 cash) — you earn every penny on the field',
      'Skeptical opposing GMs drive slightly tougher early trade bargains',
    ],
    startingModifiers: {
      cashDelta: -1_500,
      fanBaseMultiplier: 1.12,
      hypeDelta: 10,
      bonusManagerSp: 1,
      startingManagerLevel: 1,
      initialRivalryHeat: 12,
      starterRelicId: null,
      scoutingBudgetDelta: 0,
    },
    ongoingPassives: {
      rookieXpMultiplier: 1.16,
      veteranFaDiscountPct: 4,
      winterBallDiscountPct: 10,
      heritageChargeBonusPct: 12,
      promoRevenueMultiplier: 1.1,
      clutchBonus: 3,
      luckAura: 3,
      stealJumpBonus: 2,
      tradeEfficiencyBonusPct: -4,
    },
  },
];

export function getManagerBackstory(id?: ManagerBackstoryId): ManagerBackstory {
  return MANAGER_BACKSTORIES.find((b) => b.id === id) ?? MANAGER_BACKSTORIES[0];
}

/** Applies a chosen Manager Backstory's Opening Day starting perks & trade-offs cleanly to Club + Manager. */
export function applyBackstoryStartingModifiers(
  club: Club,
  manager: ManagerProfile,
  backstoryId: ManagerBackstoryId,
): { club: Club; manager: ManagerProfile; backstory: ManagerBackstory } {
  const backstory = getManagerBackstory(backstoryId);
  const mod = backstory.startingModifiers;

  const nextRoster =
    mod.starterRelicId && club.roster.length > 0
      ? club.roster.map((p, idx) =>
          idx === 0 && !p.equippedRelicIds.includes(mod.starterRelicId!)
            ? { ...p, equippedRelicIds: [...p.equippedRelicIds, mod.starterRelicId!] }
            : p,
        )
      : club.roster;

  const updatedClub: Club = {
    ...club,
    roster: nextRoster,
    economy: {
      ...club.economy,
      cash: Math.max(2_000, club.economy.cash + mod.cashDelta),
      fanBase: Math.max(350, Math.round(club.economy.fanBase * mod.fanBaseMultiplier)),
      teamHype: Math.max(10, Math.min(100, club.economy.teamHype + mod.hypeDelta)),
      scoutingBudget: Math.max(500, club.economy.scoutingBudget + mod.scoutingBudgetDelta),
    },
  };

  const updatedManager: ManagerProfile = {
    ...manager,
    level: Math.max(manager.level, mod.startingManagerLevel),
    skillPoints: manager.skillPoints + mod.bonusManagerSp,
  };

  return { club: updatedClub, manager: updatedManager, backstory };
}
