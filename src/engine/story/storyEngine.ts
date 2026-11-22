import type { Club, LeagueTierId } from '../models/club';
import type { SeededRng } from '../rng/seededRng';
import { getManagerBackstory, type ManagerBackstoryId } from './backstories';

export type StoryCharacterId = 'coach_pops' | 'penny_press' | 'rex_vance' | 'commish_bea';

export interface ManagerAlignment {
  heartVsBusiness: number; // +Heart (loyalist) / -Business (shark)
  showtimeVsOldSchool: number; // +Showtime / -Old-School
  analyticsVsGut: number; // +Analytics / -Gut Instinct
  charmVsVillain: number; // +Underdog Charm / -Heel Villain
}

export interface StoryScrapbookEntry {
  chapterId: string;
  chapterTitle: string;
  seasonNumber: number;
  choiceLabel: string;
  outcomeSummary: string;
  gazetteHeadline: string;
}

export interface CareerStoryState {
  backstoryId: ManagerBackstoryId;
  completedChapterIds: string[];
  storyFlags: string[];
  alignment: ManagerAlignment;
  relationships: Record<StoryCharacterId, number>;
  scrapbook: StoryScrapbookEntry[];
}

export interface StoryChoiceOption {
  id: string;
  label: string;
  toneTag: string;
  cashDelta: number;
  hypeDelta: number;
  fanBaseDelta: number;
  bonusSp: number;
  setsFlag: string;
  alignmentDelta: Partial<ManagerAlignment>;
  relationshipDelta: Partial<Record<StoryCharacterId, number>>;
  outcomeText: string;
  gazetteHeadline: string;
}

export interface StoryChapter {
  id: string;
  backstoryId: ManagerBackstoryId;
  act: 1 | 2 | 3;
  speakerId: StoryCharacterId;
  speakerName: string;
  speakerRole: string;
  title: string;
  triggerHint: string;
  minGamesPlayed: number;
  minSeasonNumber: number;
  narrative: string;
  flagReactiveNote?: { flag: string; extraLine: string };
  choices: readonly [StoryChoiceOption, StoryChoiceOption, StoryChoiceOption];
}

export interface ManagerEpithet {
  title: string;
  flavor: string;
  hypeBonus: number;
  clutchBonus: number;
}

export const STORY_CHARACTERS: Readonly<Record<StoryCharacterId, { name: string; role: string; emoji: string }>> = {
  coach_pops: { name: 'Coach Pops', role: 'Sandlot Mentor & Hall of Famer', emoji: '🧢' },
  penny_press: { name: 'Penny Press', role: 'Star Reporter, The Sandlot Gazette', emoji: '🗞️' },
  rex_vance: { name: 'Rex "Condo King" Vance', role: 'Flashy Rival Mogul', emoji: '🕶️' },
  commish_bea: { name: 'Commissioner Sterling', role: 'League Office & Estate Arbiter', emoji: '🏛️' },
};

function clampAxis(val: number): number {
  return Math.max(-100, Math.min(100, val));
}

function clampRel(val: number): number {
  return Math.max(-10, Math.min(10, val));
}

export function createInitialStoryState(backstoryId: ManagerBackstoryId): CareerStoryState {
  return {
    backstoryId,
    completedChapterIds: [],
    storyFlags: [`origin:${backstoryId}`],
    alignment: {
      heartVsBusiness: 0,
      showtimeVsOldSchool: 0,
      analyticsVsGut: 0,
      charmVsVillain: 0,
    },
    relationships: {
      coach_pops: 3,
      penny_press: 1,
      rex_vance: -2,
      commish_bea: 1,
    },
    scrapbook: [],
  };
}

/** Derives a living Skipper Title & subtle gameplay aura from your Choose-Your-Own-Adventure choices. */
export function resolveManagerEpithet(alignment: ManagerAlignment): ManagerEpithet {
  if (alignment.charmVsVillain <= -25) {
    return { title: 'The Sandlot Heel', flavor: 'Opposing crowds boo—and your squad feeds on the chaos!', hypeBonus: 4, clutchBonus: 2 };
  }
  if (alignment.showtimeVsOldSchool >= 25) {
    return { title: 'Neon Showstopper', flavor: 'Fireworks, organ riffs & electric primetime energy!', hypeBonus: 5, clutchBonus: 1 };
  }
  if (alignment.analyticsVsGut >= 25) {
    return { title: 'Floppy-Disk Genius', flavor: 'Every platoon split & steal jump calculated to the decimal.', hypeBonus: 2, clutchBonus: 2 };
  }
  if (alignment.heartVsBusiness >= 25) {
    return { title: "The People's Skipper", flavor: 'The entire neighborhood wears your colors on game day.', hypeBonus: 4, clutchBonus: 1 };
  }
  if (alignment.showtimeVsOldSchool <= -25) {
    return { title: 'Old-School Ironman', flavor: 'Crisp bunts, clean gloves, zero shortcuts.', hypeBonus: 2, clutchBonus: 3 };
  }
  return { title: 'Rising Sandlot Skipper', flavor: 'Writing your own chapter one pitch at a time.', hypeBonus: 2, clutchBonus: 1 };
}

interface ArcSeed {
  backstoryId: ManagerBackstoryId;
  act1Title: string;
  act1Text: string;
  act2Title: string;
  act2Text: string;
  act3Title: string;
  act3Text: string;
  rivalHook: string;
}

const ARC_SEEDS: readonly ArcSeed[] = [
  {
    backstoryId: 'sandlot_hero',
    act1Title: 'Act I: Bulldozers at the Gate',
    act1Text: 'Rex Vance rolls up in a gold limo waving a demolition permit for your sandlot! Coach Pops whispers: "Show this town why baseball belongs here."',
    act2Title: 'Act II: The Hometown Petition',
    act2Text: 'Penny Press says your club is the talk of the county! Local bakeries want to sponsor the outfield fence, while Rex offers $4,000 cash if you rename the stadium after his condo tower.',
    act3Title: 'Act III: Forever Our Field',
    act3Text: 'City Council votes tonight on protecting your ballpark as a permanent landmark—and the whole neighborhood packed the bleachers to see what kind of champion you became!',
    rivalHook: 'Rex Vance',
  },
  {
    backstoryId: 'ex_pro_comeback',
    act1Title: 'Act I: Back in the Spotlight',
    act1Text: 'TV cameras crowd your tiny Rookie dugout. Your old rival laughs on sports radio: "Washed-up sluggers never survive managing!" How do you answer?',
    act2Title: 'Act II: Ghosts of Game Seven',
    act2Text: 'Your star rookie is struggling under pressure—just like you did a decade ago. Coach Pops asks whether to give a fiery locker-room speech or quiet one-on-one cage mentorship.',
    act3Title: 'Act III: Redemption Under the Lights',
    act3Text: 'Your old nemesis arrives for a marquee showdown! Win or lose, tonight rewrites the final chapter of your baseball legacy.',
    rivalHook: 'your old nemesis',
  },
  {
    backstoryId: 'spreadsheet_prodigy',
    act1Title: 'Act I: Floppy Disks vs. Fungo Bats',
    act1Text: 'Your clubhouse groans when you print out a 14-page dot-matrix OBP packet. Penny Press snaps a photo titled "Professor Baseball." How do you win the dugout?',
    act2Title: 'Act II: The Skeptic Scout Challenge',
    act2Text: 'An old-school rival GM mocks your lineup math on live radio and challenges you to a public roster wager!',
    act3Title: 'Act III: The Moneyball Revolution',
    act3Text: 'Clubs across all 6 tiers are suddenly copying your steal-odds and platoon charts! How do you cement your dynasty philosophy?',
    rivalHook: 'old-school skeptics',
  },
  {
    backstoryId: 'showbiz_promoter',
    act1Title: 'Act I: Opening Night Extravaganza',
    act1Text: 'You booked a neon laser-show truck and 500 foam fingers for Opening Day—then the breaker trips 10 minutes before first pitch!',
    act2Title: 'Act II: Prime-Time Cable Deal',
    act2Text: 'A flashy 90s cable network wants to film a behind-the-scenes reality special inside your clubhouse all week!',
    act3Title: 'Act III: The Greatest Show on Turf',
    act3Text: 'Your stadium is officially the hottest ticket in baseball. Now the league asks if you’re just a party—or a true championship powerhouse!',
    rivalHook: 'stuffy league critics',
  },
  {
    backstoryId: 'world_ball_scout',
    act1Title: 'Act I: Passport & Pine Tar',
    act1Text: 'Your multilingual dugout is buzzing with chants from Tokyo, Santo Domingo, and Melbourne, but local fans don’t know the cheers yet!',
    act2Title: 'Act II: International Showcase Invite',
    act2Text: 'An overseas sister club invites your roster to a televised cultural exhibition and skills clinic.',
    act3Title: 'Act III: Global Dynasty Awakening',
    act3Text: 'Scouts from 11 nations are watching your ballpark! Your players’ Cultural Heritage powers are inspiring kids worldwide.',
    rivalHook: 'global rivals',
  },
  {
    backstoryId: 'surprise_inheritor',
    act1Title: "Act I: Aunt Bea's Locked Trunk",
    act1Text: 'Hidden behind the concession stand is Aunt Bea’s brass trunk—containing an 1988 Championship pennant and her first hilarious Estate Dare!',
    act2Title: 'Act II: The Eccentric Family Audit',
    act2Text: 'Commissioner Sterling arrives with Aunt Bea’s lawyers to check whether you’re honoring her joyful spirit—or selling out for quick cash.',
    act3Title: 'Act III: The Secret of the Attic',
    act3Text: 'You crack the final lock on Aunt Bea’s legacy! Her hidden endowment awaits—how will you dedicate it to your franchise’s future?',
    rivalHook: 'rival heirs',
  },
  {
    backstoryId: 'former_umpire',
    act1Title: 'Act I: Crossing the Foul Line',
    act1Text: 'Your own catcher jokes: "Wait—you’re the ump who rung me up in Low-A!" Time to earn your dugout’s trust on Day 1.',
    act2Title: 'Act II: The Replay Controversy',
    act2Text: 'A blown call costs your club a tense rally, and cameras zoom straight onto the former umpire in the dugout!',
    act3Title: 'Act III: Master of the Rulebook',
    act3Text: 'Your pitch-framing and timing mastery have turned your staff into surgical artists. The league asks you to lead the Championship showcase!',
    rivalHook: 'chirping managers',
  },
  {
    backstoryId: 'ragtag_movie_coach',
    act1Title: 'Act I: Duct-Taped Bats & Big Dreams',
    act1Text: 'Half your squad showed up in mismatched socks, but their eyes shine like Saturday-morning cartoons! Coach Pops grins: "Give ’em a motto!"',
    act2Title: 'Act II: The Training Montage',
    act2Text: 'A downpour floods the batting cages right before a big rivalry series—prime time for an unforgettable 90s sports-movie training montage!',
    act3Title: 'Act III: Freeze-Frame Championship',
    act3Text: 'A Hollywood screenwriter is in the stands taking notes on your miracle run! How do you inspire the squad for the climax?',
    rivalHook: 'rich mega-clubs',
  },
];

function buildChaptersForArc(seed: ArcSeed): StoryChapter[] {
  const b = seed.backstoryId;
  return [
    {
      id: `${b}_act_1`,
      backstoryId: b,
      act: 1,
      speakerId: 'coach_pops',
      speakerName: STORY_CHARACTERS.coach_pops.name,
      speakerRole: STORY_CHARACTERS.coach_pops.role,
      title: seed.act1Title,
      triggerHint: 'Opening Day Story Beat',
      minGamesPlayed: 0,
      minSeasonNumber: 1,
      narrative: seed.act1Text,
      choices: [
        {
          id: `${b}_a1_heart`,
          label: 'Rally the Fans & Clubhouse Heart',
          toneTag: '❤️ Heart + Fans',
          cashDelta: -200,
          hypeDelta: 10,
          fanBaseDelta: 180,
          bonusSp: 1,
          setsFlag: `${b}_chose_heart`,
          alignmentDelta: { heartVsBusiness: 18, charmVsVillain: 14 },
          relationshipDelta: { coach_pops: 2, penny_press: 1 },
          outcomeText: 'Your heartfelt speech brings the entire neighborhood to its feet!',
          gazetteHeadline: `FANS FALL IN LOVE WITH SKIPPER’S OPENING DAY SPEECH!`,
        },
        {
          id: `${b}_a1_showtime`,
          label: 'Go Full 90s Showtime Spectacle!',
          toneTag: '🎪 Showtime + Cash',
          cashDelta: 1_100,
          hypeDelta: 12,
          fanBaseDelta: 120,
          bonusSp: 0,
          setsFlag: `${b}_chose_showtime`,
          alignmentDelta: { showtimeVsOldSchool: 20, charmVsVillain: 6 },
          relationshipDelta: { penny_press: 2, rex_vance: -1 },
          outcomeText: 'Neon fireworks, loud organ riffs & packed concession lines steal the headlines!',
          gazetteHeadline: `SHOWTIME AT THE SANDLOT: BALLPARK BUZZ HITS FEVER PITCH!`,
        },
        {
          id: `${b}_a1_craft`,
          label: 'Lock In Sharp Fundamentals & Film Study',
          toneTag: '🧠 Craft + 2 SP',
          cashDelta: 300,
          hypeDelta: 3,
          fanBaseDelta: 40,
          bonusSp: 2,
          setsFlag: `${b}_chose_craft`,
          alignmentDelta: { analyticsVsGut: 18, showtimeVsOldSchool: -14 },
          relationshipDelta: { coach_pops: 1, commish_bea: 2 },
          outcomeText: 'Your dugout sharpens its mechanics and unlocks bonus skill points immediately!',
          gazetteHeadline: `RAZOR-SHARP PREPARATION POWERS OPENING DAY DEBUT!`,
        },
      ],
    },
    {
      id: `${b}_act_2`,
      backstoryId: b,
      act: 2,
      speakerId: 'penny_press',
      speakerName: STORY_CHARACTERS.penny_press.name,
      speakerRole: STORY_CHARACTERS.penny_press.role,
      title: seed.act2Title,
      triggerHint: 'Unlocks after 3 games played',
      minGamesPlayed: 3,
      minSeasonNumber: 1,
      narrative: seed.act2Text,
      flagReactiveNote: {
        flag: `${b}_chose_heart`,
        extraLine: 'Penny smiles: "Everyone still talks about how you stood up for the fans on Opening Day!"',
      },
      choices: [
        {
          id: `${b}_a2_bold`,
          label: `Call Out ${seed.rivalHook} Boldly on the Air!`,
          toneTag: '⚡ Heel Swagger + Hype',
          cashDelta: 800,
          hypeDelta: 14,
          fanBaseDelta: 160,
          bonusSp: 1,
          setsFlag: `${b}_rival_feud_lit`,
          alignmentDelta: { charmVsVillain: -20, showtimeVsOldSchool: 14 },
          relationshipDelta: { rex_vance: -3, penny_press: 2 },
          outcomeText: 'Talk radio melts down—rivalry tickets vanish in ten minutes!',
          gazetteHeadline: `SKIPPER DROPS MIC ON RIVALS — SELLOUT CROWD GUARANTEED!`,
        },
        {
          id: `${b}_a2_community`,
          label: 'Host a Grassroots Fan & Youth Appreciation Night',
          toneTag: '❤️ Community + Fanbase',
          cashDelta: -300,
          hypeDelta: 9,
          fanBaseDelta: 280,
          bonusSp: 1,
          setsFlag: `${b}_community_icon`,
          alignmentDelta: { heartVsBusiness: 22, charmVsVillain: 16 },
          relationshipDelta: { coach_pops: 3, commish_bea: 1 },
          outcomeText: 'Families flood the concourse and your fanbase surges permanently!',
          gazetteHeadline: `PACKED BLEACHERS CHEER HOMETOWN HEROES ON COMMUNITY NIGHT!`,
        },
        {
          id: `${b}_a2_deal`,
          label: 'Negotiate a Clever Win-Win Sponsorship Package',
          toneTag: '💰 Business + $2,400',
          cashDelta: 2_400,
          hypeDelta: 4,
          fanBaseDelta: 75,
          bonusSp: 1,
          setsFlag: `${b}_shrewd_mogul`,
          alignmentDelta: { heartVsBusiness: -18, analyticsVsGut: 16 },
          relationshipDelta: { rex_vance: 2, commish_bea: 2 },
          outcomeText: 'Your front-office savvy lands a crisp $2,400 windfall without losing your soul!',
          gazetteHeadline: `FRONT-OFFICE MASTERCLASS FUNDS CLUB’S PENNANT PUSH!`,
        },
      ],
    },
    {
      id: `${b}_act_3`,
      backstoryId: b,
      act: 3,
      speakerId: 'commish_bea',
      speakerName: STORY_CHARACTERS.commish_bea.name,
      speakerRole: STORY_CHARACTERS.commish_bea.role,
      title: seed.act3Title,
      triggerHint: 'Unlocks after 8 games or Season 2+',
      minGamesPlayed: 8,
      minSeasonNumber: 1,
      narrative: seed.act3Text,
      flagReactiveNote: {
        flag: `${b}_community_icon`,
        extraLine: 'Coach Pops wipes a happy tear: "From sandlot chain-link to legend—look what your heart built!"',
      },
      choices: [
        {
          id: `${b}_a3_legend`,
          label: 'Dedicate the Dynasty to the Fans & Players Forever',
          toneTag: '🏆 Legend + Fans & SP',
          cashDelta: 1_500,
          hypeDelta: 16,
          fanBaseDelta: 350,
          bonusSp: 2,
          setsFlag: `${b}_dynasty_heart_ending`,
          alignmentDelta: { heartVsBusiness: 20, charmVsVillain: 15 },
          relationshipDelta: { coach_pops: 3, penny_press: 2 },
          outcomeText: 'Your club etches itself into baseball folklore forever!',
          gazetteHeadline: `A DYNASTY FOR THE AGES: CITY CELEBRATES UNFORGETTABLE ERA!`,
        },
        {
          id: `${b}_a3_empire`,
          label: 'Build an Unstoppable Championship Empire',
          toneTag: '👑 Empire + $4,000',
          cashDelta: 4_000,
          hypeDelta: 12,
          fanBaseDelta: 200,
          bonusSp: 2,
          setsFlag: `${b}_dynasty_empire_ending`,
          alignmentDelta: { heartVsBusiness: -16, showtimeVsOldSchool: 14 },
          relationshipDelta: { rex_vance: 2, commish_bea: 3 },
          outcomeText: 'Cash, swagger & championship rings—everyone knows who runs this league!',
          gazetteHeadline: `DYNASTY EMPIRE RISES: LEAGUE BOWS TO NEW POWERHOUSE!`,
        },
        {
          id: `${b}_a3_innovate`,
          label: 'Found a Future-Proof Youth & Analytics Academy',
          toneTag: '🧠 Legacy + 3 SP',
          cashDelta: 1_200,
          hypeDelta: 10,
          fanBaseDelta: 180,
          bonusSp: 3,
          setsFlag: `${b}_dynasty_academy_ending`,
          alignmentDelta: { analyticsVsGut: 22, showtimeVsOldSchool: -10 },
          relationshipDelta: { coach_pops: 2, commish_bea: 2 },
          outcomeText: 'Generations of future All-Stars will train in your signature system!',
          gazetteHeadline: `SKIPPER’S INNOVATION BLUEPRINT RESHAPES BASEBALL FOREVER!`,
        },
      ],
    },
  ];
}

/** All 24 multi-stage Choose-Your-Own-Adventure story chapters across all 8 Manager Backstories. */
export const STORY_CHAPTERS_CATALOG: readonly StoryChapter[] = ARC_SEEDS.flatMap(buildChaptersForArc);

export function getStoryChaptersForBackstory(backstoryId: ManagerBackstoryId): StoryChapter[] {
  return STORY_CHAPTERS_CATALOG.filter((c) => c.backstoryId === backstoryId);
}

/** Returns the next unlocked Choose-Your-Own-Adventure story chapter ready for the player. */
export function getNextAvailableStoryChapter(
  storyState: CareerStoryState,
  progress: { gamesPlayed: number; seasonNumber: number },
): StoryChapter | null {
  const arcChapters = getStoryChaptersForBackstory(storyState.backstoryId);
  for (const ch of arcChapters) {
    if (storyState.completedChapterIds.includes(ch.id)) continue;
    const metGames = progress.gamesPlayed >= ch.minGamesPlayed || progress.seasonNumber >= 2;
    const metSeason = progress.seasonNumber >= ch.minSeasonNumber;
    if (metGames && metSeason) return ch;
    return null;
  }
  return null;
}

function mergeAlignment(
  base: ManagerAlignment,
  delta: Partial<ManagerAlignment>,
): ManagerAlignment {
  return {
    heartVsBusiness: clampAxis(base.heartVsBusiness + (delta.heartVsBusiness ?? 0)),
    showtimeVsOldSchool: clampAxis(base.showtimeVsOldSchool + (delta.showtimeVsOldSchool ?? 0)),
    analyticsVsGut: clampAxis(base.analyticsVsGut + (delta.analyticsVsGut ?? 0)),
    charmVsVillain: clampAxis(base.charmVsVillain + (delta.charmVsVillain ?? 0)),
  };
}

function mergeRelationships(
  base: Record<StoryCharacterId, number>,
  delta: Partial<Record<StoryCharacterId, number>>,
): Record<StoryCharacterId, number> {
  return {
    coach_pops: clampRel(base.coach_pops + (delta.coach_pops ?? 0)),
    penny_press: clampRel(base.penny_press + (delta.penny_press ?? 0)),
    rex_vance: clampRel(base.rex_vance + (delta.rex_vance ?? 0)),
    commish_bea: clampRel(base.commish_bea + (delta.commish_bea ?? 0)),
  };
}

function appendUnique(list: readonly string[], item: string): string[] {
  return list.includes(item) ? [...list] : [...list, item];
}

function grantStoryBonusSp(
  rng: SeededRng,
  roster: Club['roster'],
  bonusSp: number,
): { roster: Club['roster']; boostedPlayerName?: string } {
  if (bonusSp <= 0 || roster.length === 0) return { roster };
  const hero = rng.pick(roster);
  return {
    boostedPlayerName: hero.name,
    roster: roster.map((p) =>
      p.id === hero.id ? { ...p, skillPoints: p.skillPoints + bonusSp } : p,
    ),
  };
}

/** Resolves a player's story choice, updating club economy, player SP, alignment, relationships & scrapbook. */
export function resolveStoryChapterChoice(
  rng: SeededRng,
  storyState: CareerStoryState,
  club: Club,
  chapterId: string,
  choiceId: string,
  seasonNumber: number,
): {
  resolved: boolean;
  storyState: CareerStoryState;
  club: Club;
  choice: StoryChoiceOption | null;
  boostedPlayerName?: string;
} {
  const chapter = STORY_CHAPTERS_CATALOG.find((c) => c.id === chapterId);
  const choice = chapter?.choices.find((o) => o.id === choiceId) ?? null;
  if (!chapter || !choice) {
    return { resolved: false, storyState, club, choice: null };
  }

  const spGrant = grantStoryBonusSp(rng, club.roster, choice.bonusSp);
  const nextStory: CareerStoryState = {
    ...storyState,
    completedChapterIds: appendUnique(storyState.completedChapterIds, chapter.id),
    storyFlags: appendUnique(storyState.storyFlags, choice.setsFlag),
    alignment: mergeAlignment(storyState.alignment, choice.alignmentDelta),
    relationships: mergeRelationships(storyState.relationships, choice.relationshipDelta),
    scrapbook: [
      {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        seasonNumber,
        choiceLabel: choice.label,
        outcomeSummary: choice.outcomeText,
        gazetteHeadline: choice.gazetteHeadline,
      },
      ...storyState.scrapbook,
    ],
  };

  const nextClub: Club = {
    ...club,
    roster: spGrant.roster,
    economy: {
      ...club.economy,
      cash: Math.max(0, club.economy.cash + choice.cashDelta),
      teamHype: Math.max(0, Math.min(100, club.economy.teamHype + choice.hypeDelta)),
      fanBase: Math.max(200, club.economy.fanBase + choice.fanBaseDelta),
    },
  };

  return {
    resolved: true,
    storyState: nextStory,
    club: nextClub,
    choice,
    boostedPlayerName: spGrant.boostedPlayerName,
  };
}

/** Generates a personalized Dynasty Epilogue summary celebrating your chosen backstory, title & trophies. */
export function buildDynastyEpilogue(
  storyState: CareerStoryState,
  club: Pick<Club, 'city' | 'name' | 'leagueTier' | 'wins' | 'losses' | 'stadium'>,
): { headline: string; epithet: string; summary: string } {
  const backstory = getManagerBackstory(storyState.backstoryId);
  const epithet = resolveManagerEpithet(storyState.alignment);
  const tierLabels: Record<LeagueTierId, string> = {
    rookie: 'Rookie Sandlot',
    low_a: 'Low-A',
    high_a: 'High-A',
    aa: 'Double-A',
    aaa: 'Triple-A',
    majors: 'Mini Major League',
  };
  return {
    headline: `${backstory.badgeIcon} ${club.city} ${club.name}: ${backstory.arcTitle}`,
    epithet: epithet.title,
    summary: `Known across baseball as "${epithet.title}", you guided the ${club.city} ${club.name} (${club.wins}-${club.losses}) to ${tierLabels[club.leagueTier]} glory with ${club.stadium.championshipPennants.length} pennants and ${storyState.completedChapterIds.length} story chapters etched in franchise lore!`,
  };
}
