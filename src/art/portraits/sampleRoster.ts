import { generatePlayerIdentity } from '../../engine/nationalities/pickNationality';
import type { NationalityId } from '../../engine/nationalities/types';
import { createSeededRng } from '../../engine/rng/seededRng';
import type { BaseballCardPlayer } from '../../ui/components/FlipBaseballCard';
import { createPortraitTraits } from './generatePortrait';
import type { CardRarity } from './types';

const NICKNAMES = [
  'The Rocket Kid',
  'Bubblegum Bomber',
  'Sky-Hook',
  'Ghost Ball',
  'Turbo Cleats',
  'Sandlot Ace',
  'Bunt Ninja',
  'Captain Clutch',
  'Pop-Fly Robber',
  '90s Lightning',
] as const;

const POSITIONS = ['SP', 'RP', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'] as const;

const POWERS = [
  'Blazing Comet',
  'Ghost Knuckle',
  'Tornado Slider',
  'Bomb-Swing',
  'Ninja Bunt',
  'Sky-High Leap',
  'Cannon Arm',
  'Rally Spark',
  'Ice Veins',
] as const;

const BIOS = [
  'Chews three pieces of grape bubblegum per inning for extra exit velocity.',
  'Learned a wobbly knuckleball from a mysterious retired ballpark groundskeeper.',
  'Once leapt so high robbing a home run they high-fived the scoreboard.',
  'Refuses to step on the chalk line and always wears lucky neon stirrups.',
  'Draws extra fans every Friday night with signature post-game bat flips.',
  'Practiced bunting off a trampoline until the ball stops on a dime.',
] as const;

export const INITIAL_SHOWCASE_ROSTER: readonly BaseballCardPlayer[] = [
  {
    id: 'showcase-rico',
    name: 'Rico Comet',
    nickname: 'The Rocket Kid',
    position: 'SP',
    jerseyNumber: 24,
    nationalityId: 'USA',
    hometown: 'Sandlot, OH',
    overall: 92,
    rarity: 'mvp',
    level: 8,
    popularity: 92,
    traits: createPortraitTraits(1994),
    specialPowers: ['Blazing Comet', 'Ice Veins'],
    stats: { contact: 60, power: 68, speed: 74, pitching: 95, fielding: 81 },
    bio: 'Throws a blazing comet fastball so hot it roasts peanuts behind home plate.',
  },
  {
    id: 'showcase-kiko',
    name: 'Kiko Tanaka',
    nickname: 'Ghost Ball',
    position: 'RP',
    jerseyNumber: 51,
    nationalityId: 'JPN',
    hometown: 'Osaka',
    overall: 88,
    rarity: 'allstar',
    level: 6,
    popularity: 86,
    traits: createPortraitTraits(5519),
    specialPowers: ['Ghost Knuckle', 'Tornado Slider'],
    stats: { contact: 58, power: 52, speed: 76, pitching: 93, fielding: 86 },
    bio: 'Her floating knuckleball dances like a kitsune illusion across the strike zone.',
  },
  {
    id: 'showcase-manny',
    name: 'Manny Guerrero',
    nickname: 'Storm Bat',
    position: 'CF',
    jerseyNumber: 27,
    nationalityId: 'DOM',
    hometown: 'San Pedro de Macorís',
    overall: 90,
    rarity: 'mvp',
    level: 7,
    popularity: 94,
    traits: createPortraitTraits(2042),
    specialPowers: ['Bomb-Swing', 'Sky-High Leap'],
    stats: { contact: 86, power: 95, speed: 88, pitching: 42, fielding: 90 },
    bio: 'Launches tropical-storm moonshots with an iconic celebratory bat flip.',
  },
  {
    id: 'showcase-finn',
    name: 'Finn O’Malley',
    nickname: 'Lucky Clover',
    position: 'SS',
    jerseyNumber: 7,
    nationalityId: 'IRL',
    hometown: 'Dublin',
    overall: 80,
    rarity: 'rookie',
    level: 4,
    popularity: 79,
    traits: createPortraitTraits(8133),
    specialPowers: ['Ninja Bunt', 'Cannon Arm'],
    stats: { contact: 84, power: 62, speed: 94, pitching: 48, fielding: 88 },
    bio: 'Drops impossible fair-line bunts that seem guided by pure shamrock luck.',
  },
];

export function generateRandomCardPlayer(
  seed: number,
  forcedNationalityId?: NationalityId,
): BaseballCardPlayer {
  const rng = createSeededRng(seed);
  const identity = generatePlayerIdentity(rng, forcedNationalityId);
  const position = rng.pick(POSITIONS);
  const isPitcher = position === 'SP' || position === 'RP';

  const contact = rng.int(45, 95);
  const power = rng.int(40, 96);
  const speed = rng.int(45, 96);
  const pitching = isPitcher ? rng.int(68, 97) : rng.int(30, 62);
  const fielding = rng.int(50, 94);

  const overall = Math.round(
    isPitcher
      ? pitching * 0.65 + fielding * 0.2 + speed * 0.15
      : contact * 0.3 + power * 0.3 + speed * 0.2 + fielding * 0.2,
  );
  const rarity: CardRarity = overall >= 87 ? 'mvp' : overall >= 77 ? 'allstar' : 'rookie';

  const powerOne = rng.pick(POWERS);
  let powerTwo = rng.pick(POWERS);
  if (powerTwo === powerOne) powerTwo = 'Rally Spark';

  return {
    id: `gen-${seed}-${identity.nationality.id}`,
    name: identity.fullName,
    nickname: rng.pick(NICKNAMES),
    position,
    jerseyNumber: rng.int(1, 99),
    nationalityId: identity.nationality.id,
    hometown: identity.hometown,
    overall,
    rarity,
    level: rng.int(1, 10),
    popularity: rng.int(45, 98),
    traits: createPortraitTraits(seed),
    specialPowers: rarity === 'rookie' ? [powerOne] : [powerOne, powerTwo],
    stats: { contact, power, speed, pitching, fielding },
    bio: rng.pick(BIOS),
  };
}
