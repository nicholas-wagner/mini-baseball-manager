import type { Club } from '../models/club';
import type { CareerStoryState } from './storyEngine';

export interface DugoutGuideChapter {
  id: string;
  chapterNumber: number;
  emoji: string;
  title: string;
  subtitle: string;
  coachPopsQuote: string;
  highlights: readonly string[];
  popsProTip: string;
  jumpTabId: 'lab' | 'gameday' | 'roster' | 'league' | 'skills' | 'economy';
  jumpLabel: string;
}

/** Upbeat, fun-to-read 90s illustrated "Skipper's Dugout Handbook" narrated by Coach Pops! */
export const DUGOUT_GUIDE_CHAPTERS: readonly DugoutGuideChapter[] = [
  {
    id: 'welcome_sandlot',
    chapterNumber: 1,
    emoji: '⚾',
    title: 'Welcome to Sandlot Ball!',
    subtitle: 'Your 6-League Climb from Backyard Chain-Link to Major League Cathedrals',
    coachPopsQuote:
      '"Grab your cap, Skip! Every legend starts right here on the Rookie Sandlot with wooden benches, big dreams, and 1,200 hometown fans cheering your name."',
    highlights: [
      'Climb 6 leagues (Rookie Sandlot → Low-A → High-A → AA → AAA → Mini Major League) across 48 unique clubs.',
      'As you earn promotions, your stadium grows from a 500-seat neighborhood sandlot up to a 45,000-seat Pro Major League Cathedral!',
      'Play 2-minute 5-Inning Blitzes, 7-Inning Quickies, or full 9-Inning Classics — your pace, every time.',
    ],
    popsProTip: 'Try 1x/2x/4x Live 3D or tap "Clutch Sim" to zoom right into dramatic late-inning showdowns!',
    jumpTabId: 'gameday',
    jumpLabel: 'Head to Play Ball',
  },
  {
    id: 'choose_your_story',
    chapterNumber: 2,
    emoji: '📖',
    title: 'Pick Your Backstory & Write Your Legend',
    subtitle: '8 Replayable 90s Origins + Choose-Your-Own-Adventure Chapters',
    coachPopsQuote:
      '"Are you the hometown sandlot kid, a washed-up 90s ex-pro, a floppy-disk math whiz, or Aunt Bea’s surprise heir? Your origin shapes your budget, perks, AND your story!"',
    highlights: [
      'Every Manager Backstory gives real Day-1 & ongoing advantages AND fun trade-offs for huge replayability.',
      'Unlock multi-chapter Choose-Your-Own-Adventure decisions across your career — your choices shift your Manager Title & recurring character relationships!',
      'Run up to 4 totally different careers simultaneously across our 4 Auto-Save Slots.',
    ],
    popsProTip: 'Check the "📜 Story" button in the top bar anytime a new chapter glows gold!',
    jumpTabId: 'economy',
    jumpLabel: 'Open Club HQ',
  },
  {
    id: 'gameday_chess',
    chapterNumber: 3,
    emoji: '⚡',
    title: 'Game Day Chess & Stealing Bases',
    subtitle: 'Platoons, Pitch Arsenals, Speed Steals, Shifts & Bullpen Warmups',
    coachPopsQuote:
      '"Baseball is high-speed chess! Watch handedness matchups, warm up your closer early on the Bullpen Phone, and turn your 90-Speed burners loose on the basepaths!"',
    highlights: [
      'Base Stealing: When a runner reaches base, check the live Steal 2B / Steal 3B / Double Steal / Steal Home odds — Speed vs. Catcher Arm & LHP hold!',
      'Pitch Calling: Starters pack 4–5 pitches, Relievers pack 2–3. Aim for the batter’s Weak Pitch 🎯 and watch Pitcher Endurance drop mph when tired!',
      'Defense & Shifts: Call Infield In, No Doubles, Bunt Defense, Hold Runner, or Pitchout right from the Broadcast HUD.',
    ],
    popsProTip: 'Don’t bring a Cold reliever straight into a tie game — ring the Bullpen Phone to warm them to HOT first!',
    jumpTabId: 'gameday',
    jumpLabel: 'Call Pitches Live',
  },
  {
    id: 'squad_and_staff',
    chapterNumber: 4,
    emoji: '🧤',
    title: 'Roster Craft, Co-Ed Synergies & Dugout Staff',
    subtitle: '20-Man Roster Cap, Specialists, Coaches, Doctors & Career Arcs',
    coachPopsQuote:
      '"A great skipper balances fiery rookies, steady veterans, co-ed clubhouse synergies, and the right coaches under your staff slot cap!"',
    highlights: [
      'Play stars at their ★ Favorite Position for live defense & clutch boosts — or Cross-Train flexible utility players.',
      'Co-Ed Strategy: Male power/velo sluggers & Female contact/eye/spin/speed stars unlock live Clubhouse Synergy combos!',
      'Hire Pitching, Hitting, Bench, Fielding, Bullpen (catchers + pitchers) Coaches, an Equipment Manager, and specialty Team Doctors & Trainers.',
    ],
    popsProTip: 'Players really age over seasons (Rookie growth → Prime → Veteran savvy → Retirement) — stash prospects in your Farm Academy!',
    jumpTabId: 'roster',
    jumpLabel: 'Manage Roster',
  },
  {
    id: 'ballpark_tycoon',
    chapterNumber: 5,
    emoji: '🏟️',
    title: 'Ballpark Tycoon & 10 Retro Stadiums',
    subtitle: 'Sim-City District, Parody Sponsors, Park Factors & 3D Upgrades',
    coachPopsQuote:
      '"Build Nacho Cantinas, sign Turbo Fizz for your outfield wall, and upgrade from wooden bleachers to Jumbotrons and Mascot Cannons!"',
    highlights: [
      'Every stadium has real dimensions & Park Factors (short RF porches for lefties, Mile-High HR carry, Indoor Domes with Fast Turf).',
      'Upgrade Seating Decks, Night Floodlights, Jumbotron & Mascot Cannon — then watch them appear live in your 3D stadium!',
      'Equip quirky 90s Relics (Golden Ash Bat, Lucky Neon Stirrups) boosted even further by your Equipment Manager.',
    ],
    popsProTip: 'Retire a club legend’s jersey number to mount a gleaming gold plaque permanently on your 3D outfield wall!',
    jumpTabId: 'economy',
    jumpLabel: 'Upgrade Ballpark',
  },
  {
    id: 'world_spectacles',
    chapterNumber: 6,
    emoji: '🏆',
    title: 'World Spectacles, Auto-Save & Sharing',
    subtitle: 'HR Derby, Global Chibi Cup, 4 Auto-Save Slots & Offline Club Codes',
    coachPopsQuote:
      '"Everything saves automatically right on your device — no internet needed! Battle in Home Run Derbies, Global Cups, and trade Club Codes with friends."',
    highlights: [
      '4 Career Save Slots auto-save after every move and resume automatically next time you open the app — plus safe 2-step Delete to start over.',
      'Compete in All-Star Home Run Derbies, the Global Chibi Cup every 3 seasons, Winter Ball & 52 wacky 90s Surprise Events!',
      'Generate a serverless MBM1 Club Export Code or PNG Baseball Card anytime to brag about your dynasty offline.',
    ],
    popsProTip: 'Check the Design Lab anytime to spin 3D chibi rigs, browse the 3,000-player catalog, and jam on all 28 Ballpark Soundboard SFX!',
    jumpTabId: 'lab',
    jumpLabel: 'Explore Design Lab',
  },
];

export interface RoadToMajorsStep {
  id: string;
  label: string;
  completed: boolean;
}

function hasUpgradedStadium(club: Club | null): boolean {
  if (!club) return false;
  return (
    club.stadium.seatingTier > 1 ||
    club.stadium.hasNightLights ||
    club.stadium.hasJumbotron
  );
}

/** Evaluates a fun, upbeat "Road to the Majors" progress checklist for the player's current career. */
export function evaluateRoadToMajorsChecklist(
  club: Club | null,
  storyState: CareerStoryState | null,
): RoadToMajorsStep[] {
  const gamesPlayed = club ? club.wins + club.losses : 0;
  const activeStaff = club?.coaches.activeStaff?.length ?? 0;
  const storyDone = (storyState?.completedChapterIds.length ?? 0) >= 1;

  return [
    { id: 'found_club', label: 'Found your Rookie Sandlot franchise', completed: Boolean(club) },
    { id: 'story_chapter', label: 'Complete your first Choose-Your-Own-Adventure story chapter', completed: storyDone },
    { id: 'play_game', label: 'Play or sim your first game on the diamond', completed: gamesPlayed >= 1 },
    { id: 'hire_staff', label: 'Hire a dugout Coach or Equipment Manager', completed: activeStaff >= 1 },
    { id: 'upgrade_park', label: 'Upgrade your stadium seats, lights, or Jumbotron', completed: hasUpgradedStadium(club) },
    { id: 'earn_promotion', label: 'Earn promotion out of Rookie Sandlot toward the Majors!', completed: Boolean(club && club.leagueTier !== 'rookie') },
  ];
}
