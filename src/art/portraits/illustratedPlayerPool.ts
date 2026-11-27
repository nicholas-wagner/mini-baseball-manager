import { PLAYER_CATALOG_BY_ID } from '../../engine/catalog/playerCatalog';
import type { BaseballCardPlayer } from '../../ui/components/FlipBaseballCard';
import type { AthleteAppearance } from './athleteAppearance';
import rico from './illustrations/rico.webp';
import kiko from './illustrations/kiko.webp';
import manny from './illustrations/manny.webp';
import finn from './illustrations/finn.webp';
import ana from './illustrations/ana.webp';
import isaiah from './illustrations/isaiah.webp';
import jae from './illustrations/jae.webp';
import luca from './illustrations/luca.webp';
import mara from './illustrations/mara.webp';
import wade from './illustrations/wade.webp';
import felix from './illustrations/felix.webp';
import bento from './illustrations/bento.webp';
import yuTing from './illustrations/yu-ting.webp';

type IllustratedPlayer = BaseballCardPlayer & { illustration: string; traits: AthleteAppearance };

function showcaseIdentity(id: string) {
  const identity = PLAYER_CATALOG_BY_ID.get(id);
  if (!identity) throw new Error('Showcase references missing catalog player ' + id);
  return identity;
}

// Club, number and current ratings belong to the card frame. The illustration
// and the likeness used by the field rig follow the athlete's persistent ID.
export const ILLUSTRATED_PLAYER_POOL: readonly IllustratedPlayer[] = [
  {
    ...showcaseIdentity('showcase-rico'),
    nickname: "The Rocket Kid", jerseyNumber: 24,
    overall: 92, rarity: "mvp", level: 8, popularity: 92,
    illustration: rico,
    specialPowers: ["Blazing Comet", "Ice Veins"],
    stats: { contact: 60, power: 68, speed: 74, pitching: 95, fielding: 81 },
    bio: "Throws a blazing comet fastball so hot it roasts peanuts behind home plate.",
  },
  {
    ...showcaseIdentity('showcase-kiko'),
    nickname: "Ghost Ball", jerseyNumber: 51,
    overall: 88, rarity: "allstar", level: 6, popularity: 86,
    illustration: kiko,
    specialPowers: ["Ghost Knuckle", "Tornado Slider"],
    stats: { contact: 58, power: 52, speed: 76, pitching: 93, fielding: 86 },
    bio: "Her southpaw knuckleball dances like a kitsune illusion across the strike zone.",
  },
  {
    ...showcaseIdentity('showcase-manny'),
    nickname: "Storm Bat", jerseyNumber: 27,
    overall: 90, rarity: "mvp", level: 7, popularity: 94,
    illustration: manny,
    specialPowers: ["Bomb-Swing", "Sky-High Leap"],
    stats: { contact: 86, power: 95, speed: 88, pitching: 42, fielding: 90 },
    bio: "Switch-hitting phenom who launches moonshots from either batter’s box.",
  },
  {
    ...showcaseIdentity('showcase-finn'),
    nickname: "Lucky Clover", jerseyNumber: 7,
    overall: 80, rarity: "rookie", level: 4, popularity: 79,
    illustration: finn,
    specialPowers: ["Ninja Bunt", "Cannon Arm"],
    stats: { contact: 84, power: 62, speed: 94, pitching: 48, fielding: 88 },
    bio: "Lefty-hitting shortstop who drops fair-line bunts guided by pure shamrock luck.",
  },
  {
    ...showcaseIdentity('showcase-ana'),
    nickname: "El Faro", jerseyNumber: 16,
    overall: 85, rarity: "allstar", level: 6, popularity: 83,
    illustration: ana,
    specialPowers: ["Cannon Arm", "Rally Spark"],
    stats: { contact: 81, power: 78, speed: 63, pitching: 38, fielding: 94 },
    bio: "Her mitt gives a rookie pitcher a target they can spot from the outfield seats.",
  },
  {
    ...showcaseIdentity('catalog-isaiah'),
    nickname: "Big Scoop", jerseyNumber: 33,
    overall: 86, rarity: "allstar", level: 6, popularity: 83,
    illustration: isaiah,
    specialPowers: ["Soft Hands", "Line Drive"],
    stats: { contact: 80, power: 88, speed: 56, pitching: 41, fielding: 92 },
    bio: "Taps the corner of first base with his heel before every pitch. His infielders swear his reach adds a foot to the bag.",
  },
  {
    ...showcaseIdentity('catalog-jae'),
    nickname: "Two-Step", jerseyNumber: 4,
    overall: 78, rarity: "rookie", level: 6, popularity: 83,
    illustration: jae,
    specialPowers: ["Pivot Step"],
    stats: { contact: 85, power: 51, speed: 93, pitching: 39, fielding: 89 },
    bio: "Practices his double-play pivot on a chalk square drawn just outside the dugout.",
  },
  {
    ...showcaseIdentity('catalog-luca'),
    nickname: "High Wire", jerseyNumber: 38,
    overall: 83, rarity: "allstar", level: 6, popularity: 83,
    illustration: luca,
    specialPowers: ["Sky-High Leap", "Cannon Arm"],
    stats: { contact: 76, power: 71, speed: 91, pitching: 35, fielding: 94 },
    bio: "Counts his strides from the warning track to the wall during warmups. He knows exactly when to jump.",
  },
  {
    ...showcaseIdentity('catalog-mara'),
    nickname: "Mirage", jerseyNumber: 32,
    overall: 87, rarity: "allstar", level: 7, popularity: 90,
    illustration: mara,
    specialPowers: ["Mirage Change", "Ice Veins"],
    stats: { contact: 62, power: 54, speed: 78, pitching: 92, fielding: 81 },
    bio: "Mara learned her low release on a windy coastal field. Hitters still swear the changeup rises on its way past them.",
  },
  {
    ...showcaseIdentity('catalog-wade'),
    nickname: "Return to Sender", jerseyNumber: 14,
    overall: 82, rarity: "allstar", level: 8, popularity: 77,
    illustration: wade,
    specialPowers: ["Snap Throw", "Cannon Arm"],
    stats: { contact: 77, power: 73, speed: 55, pitching: 46, fielding: 93 },
    bio: "His catcher's mitt is broken in on the right hand. Runners who forget about his left arm rarely make it to second.",
  },
  {
    ...showcaseIdentity('catalog-felix'),
    nickname: "Gap Year", jerseyNumber: 19,
    overall: 84, rarity: "allstar", level: 6, popularity: 84,
    illustration: felix,
    specialPowers: ["Gap Shot", "Quick Hands"],
    stats: { contact: 90, power: 86, speed: 68, pitching: 37, fielding: 84 },
    bio: "Félix polishes his lenses before every at-bat. From either box he can pick the strip of grass between two outfielders.",
  },
  {
    ...showcaseIdentity('catalog-bento'),
    nickname: "Chalk Thief", jerseyNumber: 12,
    overall: 77, rarity: "rookie", level: 4, popularity: 80,
    illustration: bento,
    specialPowers: ["Foul-Line Slide"],
    stats: { contact: 72, power: 52, speed: 96, pitching: 39, fielding: 88 },
    bio: "Bento leaves the dugout in clean whites and comes back with a stripe of chalk from shoulder to ankle.",
  },
  {
    ...showcaseIdentity('catalog-yu-ting'),
    nickname: "Pink Slip", jerseyNumber: 18,
    overall: 83, rarity: "allstar", level: 6, popularity: 81,
    illustration: yuTing,
    specialPowers: ["Four-Seam Finish", "Ice Veins"],
    stats: { contact: 54, power: 44, speed: 82, pitching: 92, fielding: 76 },
    bio: "Lin flashes her catcher the same grin whether she likes the sign or plans to shake it off. Only her catcher can tell the difference.",
  },
];

const illustrationsByPlayer = new Map(ILLUSTRATED_PLAYER_POOL.map(player => [player.id, player.illustration]));

const catalogPrints = import.meta.glob<string>('./illustrations/batch-*/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});
for (const [path, url] of Object.entries(catalogPrints)) {
  const id = path.slice(path.lastIndexOf('/') + 1, -5);
  illustrationsByPlayer.set(id, url);
}

export function playerIllustration(playerId: string): string | undefined {
  return illustrationsByPlayer.get(playerId);
}
