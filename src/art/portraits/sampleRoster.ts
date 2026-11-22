import { rollBatsHand, rollThrowsHand } from '../../engine/handedness/handedness';
import type { FieldPosition } from '../../engine/handedness/types';
import { generatePlayerIdentity } from '../../engine/nationalities/pickNationality';
import type { NationalityId } from '../../engine/nationalities/types';
import { createSeededRng } from '../../engine/rng/seededRng';
import type { BaseballCardPlayer } from '../../ui/components/FlipBaseballCard';
import { createPortraitTraits } from './generatePortrait';
import type { CardRarity } from './types';
export { ILLUSTRATED_PLAYER_POOL as INITIAL_SHOWCASE_ROSTER } from './illustratedPlayerPool';

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

const POSITIONS: readonly FieldPosition[] = [
  'SP',
  'RP',
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF',
  'RF',
] as const;

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

export function generateRandomCardPlayer(
  seed: number,
  forcedNationalityId?: NationalityId,
): BaseballCardPlayer {
  const rng = createSeededRng(seed);
  const look = createSeededRng(seed ^ 0x4c4f4f4b).chance(.25) ? 'female' : 'male';
  const identity = generatePlayerIdentity(rng, forcedNationalityId);
  const position = rng.pick(POSITIONS);
  const bats = rollBatsHand(rng);
  const throws = rollThrowsHand(rng, position);
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
    bats,
    throws,
    jerseyNumber: rng.int(1, 99),
    nationalityId: identity.nationality.id,
    hometown: identity.hometown,
    overall,
    rarity,
    level: rng.int(1, 10),
    popularity: rng.int(45, 98),
    traits: createPortraitTraits(seed, look),
    specialPowers: rarity === 'rookie' ? [powerOne] : [powerOne, powerTwo],
    stats: { contact, power, speed, pitching, fielding },
    bio: rng.pick(BIOS),
  };
}
