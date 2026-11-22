import type { BaseballCardPlayer } from '../../ui/components/FlipBaseballCard';
import type { AthleteAppearance } from './athleteAppearance';
import rico from './illustrations/rico.png';
import kiko from './illustrations/kiko.png';
import manny from './illustrations/manny.png';
import finn from './illustrations/finn.png';
import ana from './illustrations/ana.png';
import isaiah from './illustrations/isaiah.png';
import jae from './illustrations/jae.png';
import luca from './illustrations/luca.png';
import mara from './illustrations/mara.png';
import wade from './illustrations/wade.png';
import felix from './illustrations/felix.png';
import bento from './illustrations/bento.png';
import yuTing from './illustrations/yu-ting.png';

type IllustratedPlayer = BaseballCardPlayer & { illustration: string; traits: AthleteAppearance };

// Club, number and current ratings belong to the card frame. The illustration
// and the likeness used by the field rig follow the athlete's persistent ID.
export const ILLUSTRATED_PLAYER_POOL: readonly IllustratedPlayer[] = [
  {
    id: "showcase-rico", name: "Rico Comet", nickname: "The Rocket Kid",
    position: "SP", bats: "R", throws: "R", jerseyNumber: 24,
    nationalityId: "USA", hometown: "Sandlot, OH",
    overall: 92, rarity: "mvp", level: 8, popularity: 92,
    illustration: rico,
    traits: {
      seed: 1994, playerLook: "male", stature: "medium", build: "balanced", headShape: "square",
      skinTone: "#B87648", skinShadow: "#874D27", skinHighlight: "#D69669", irisColor: "#8C5822",
      hairStyle: "spiky90s", hairColor: "#4E5B6E", hairHighlight: "#8FA2BD", facialHair: "none",
      capStyle: "visor", hairAccessory: "none", glasses: "none", accessory: "starEarrings",
      eyeStyle: "determined", mouthStyle: "bubblegum", backdropStyle: "halftone", pitchingMotion: "sidearm",
      bottoms: "pants", skirtLiner: "briefs", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Blazing Comet", "Ice Veins"],
    stats: { contact: 60, power: 68, speed: 74, pitching: 95, fielding: 81 },
    bio: "Throws a blazing comet fastball so hot it roasts peanuts behind home plate.",
  },
  {
    id: "showcase-kiko", name: "Kiko Tanaka", nickname: "Ghost Ball",
    position: "RP", bats: "L", throws: "L", jerseyNumber: 51,
    nationalityId: "JPN", hometown: "Osaka",
    overall: 88, rarity: "allstar", level: 6, popularity: 86,
    illustration: kiko,
    traits: {
      seed: 5519, playerLook: "female", stature: "medium", build: "balanced", headShape: "heart",
      skinTone: "#6A3E25", skinShadow: "#422210", skinHighlight: "#8C593B", irisColor: "#293242",
      hairStyle: "ponytail", hairColor: "#4A2B18", hairHighlight: "#825235", facialHair: "none",
      capStyle: "none", hairAccessory: "scrunchie", glasses: "none", accessory: "eyeBlack",
      eyeStyle: "bright", mouthStyle: "openLaugh", backdropStyle: "starburst", pitchingMotion: "underhand",
      bottoms: "skirt", skirtLiner: "shorts", jerseyFit: "D", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Ghost Knuckle", "Tornado Slider"],
    stats: { contact: 58, power: 52, speed: 76, pitching: 93, fielding: 86 },
    bio: "Her southpaw knuckleball dances like a kitsune illusion across the strike zone.",
  },
  {
    id: "showcase-manny", name: "Manny Guerrero", nickname: "Storm Bat",
    position: "CF", bats: "S", throws: "R", jerseyNumber: 27,
    nationalityId: "DOM", hometown: "San Pedro de Macorís",
    overall: 90, rarity: "mvp", level: 7, popularity: 94,
    illustration: manny,
    traits: {
      seed: 2042, playerLook: "male", stature: "medium", build: "power", headShape: "square",
      skinTone: "#F0B888", skinShadow: "#C28252", skinHighlight: "#FFD6B0", irisColor: "#1D63B8",
      hairStyle: "curlyTop", hairColor: "#4A2B18", hairHighlight: "#825235", facialHair: "shortBeard",
      capStyle: "forward", hairAccessory: "none", glasses: "none", accessory: "eyeBlack",
      eyeStyle: "bright", mouthStyle: "smirk", backdropStyle: "starburst", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "shorts", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Bomb-Swing", "Sky-High Leap"],
    stats: { contact: 86, power: 95, speed: 88, pitching: 42, fielding: 90 },
    bio: "Switch-hitting phenom who launches moonshots from either batter’s box.",
  },
  {
    id: "showcase-finn", name: "Finn O’Malley", nickname: "Lucky Clover",
    position: "SS", bats: "L", throws: "R", jerseyNumber: 7,
    nationalityId: "IRL", hometown: "Dublin",
    overall: 80, rarity: "rookie", level: 4, popularity: 79,
    illustration: finn,
    traits: {
      seed: 8133, playerLook: "male", stature: "tall", build: "lean", headShape: "round",
      skinTone: "#6A3E25", skinShadow: "#422210", skinHighlight: "#8C593B", irisColor: "#8C5822",
      hairStyle: "sideSweep", hairColor: "#C93022", hairHighlight: "#FF6B57", facialHair: "goatee",
      capStyle: "forward", hairAccessory: "none", glasses: "none", accessory: "cheekBandage",
      eyeStyle: "determined", mouthStyle: "smirk", backdropStyle: "stripes", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "shorts", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Ninja Bunt", "Cannon Arm"],
    stats: { contact: 84, power: 62, speed: 94, pitching: 48, fielding: 88 },
    bio: "Lefty-hitting shortstop who drops fair-line bunts guided by pure shamrock luck.",
  },
  {
    id: "showcase-ana", name: "Ana Reyes", nickname: "El Faro",
    position: "C", bats: "R", throws: "R", jerseyNumber: 16,
    nationalityId: "MEX", hometown: "Hermosillo",
    overall: 85, rarity: "allstar", level: 6, popularity: 83,
    illustration: ana,
    traits: {
      seed: 2011, playerLook: "female", stature: "short", build: "balanced", headShape: "square",
      skinTone: "#F0B888", skinShadow: "#C28252", skinHighlight: "#FFD6B0", irisColor: "#8C5822",
      hairStyle: "braid", hairColor: "#1E1B28", hairHighlight: "#4C4666", facialHair: "none",
      capStyle: "backwards", hairAccessory: "tie", glasses: "round", accessory: "starEarrings",
      eyeStyle: "wide", mouthStyle: "openLaugh", backdropStyle: "starburst", pitchingMotion: "overhand",
      bottoms: "shorts", skirtLiner: "shorts", jerseyFit: "DD", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Cannon Arm", "Rally Spark"],
    stats: { contact: 81, power: 78, speed: 63, pitching: 38, fielding: 94 },
    bio: "Her mitt gives a rookie pitcher a target they can spot from the outfield seats.",
  },
  {
    id: "catalog-isaiah", name: "Isaiah Bell", nickname: "Big Scoop",
    position: "1B", bats: "L", throws: "L", jerseyNumber: 33,
    nationalityId: "USA", hometown: "Birmingham, AL",
    overall: 86, rarity: "allstar", level: 6, popularity: 83,
    illustration: isaiah,
    traits: {
      seed: 8601, playerLook: "male", stature: "medium", build: "power", headShape: "square",
      skinTone: "#6A3E25", skinShadow: "#422210", skinHighlight: "#8C593B", irisColor: "#8C5822",
      hairStyle: "flattop", hairColor: "#1E1B28", hairHighlight: "#4C4666", facialHair: "chevron",
      capStyle: "forward", hairAccessory: "none", glasses: "none", accessory: "none",
      eyeStyle: "bright", mouthStyle: "smirk", backdropStyle: "halftone", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "briefs", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Soft Hands", "Line Drive"],
    stats: { contact: 80, power: 88, speed: 56, pitching: 41, fielding: 92 },
    bio: "Taps the corner of first base with his heel before every pitch. His infielders swear his reach adds a foot to the bag.",
  },
  {
    id: "catalog-jae", name: "Jae Park", nickname: "Two-Step",
    position: "2B", bats: "R", throws: "R", jerseyNumber: 4,
    nationalityId: "KOR", hometown: "Busan",
    overall: 78, rarity: "rookie", level: 6, popularity: 83,
    illustration: jae,
    traits: {
      seed: 8602, playerLook: "male", stature: "short", build: "lean", headShape: "oval",
      skinTone: "#F0B888", skinShadow: "#C28252", skinHighlight: "#FFD6B0", irisColor: "#3B2314",
      hairStyle: "sideSweep", hairColor: "#1E1B28", hairHighlight: "#4C4666", facialHair: "none",
      capStyle: "forward", hairAccessory: "none", glasses: "none", accessory: "none",
      eyeStyle: "bright", mouthStyle: "bigGrin", backdropStyle: "halftone", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "briefs", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Pivot Step"],
    stats: { contact: 85, power: 51, speed: 93, pitching: 39, fielding: 89 },
    bio: "Practices his double-play pivot on a chalk square drawn just outside the dugout.",
  },
  {
    id: "catalog-luca", name: "Luca Moretti", nickname: "High Wire",
    position: "RF", bats: "R", throws: "L", jerseyNumber: 38,
    nationalityId: "ARG", hometown: "Rosario",
    overall: 83, rarity: "allstar", level: 6, popularity: 83,
    illustration: luca,
    traits: {
      seed: 8603, playerLook: "male", stature: "tall", build: "lean", headShape: "oval",
      skinTone: "#FAD0A8", skinShadow: "#CF9568", skinHighlight: "#FFE8D1", irisColor: "#8C5822",
      hairStyle: "mullet", hairColor: "#8C461E", hairHighlight: "#C9723E", facialHair: "longBeard",
      capStyle: "forward", hairAccessory: "none", glasses: "none", accessory: "freckles",
      eyeStyle: "bright", mouthStyle: "smirk", backdropStyle: "halftone", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "briefs", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Sky-High Leap", "Cannon Arm"],
    stats: { contact: 76, power: 71, speed: 91, pitching: 35, fielding: 94 },
    bio: "Counts his strides from the warning track to the wall during warmups. He knows exactly when to jump.",
  },
  {
    id: "catalog-mara", name: "Mara Vélez", nickname: "Mirage",
    position: "SP", bats: "L", throws: "R", jerseyNumber: 32,
    nationalityId: "PRI", hometown: "Ponce",
    overall: 87, rarity: "allstar", level: 7, popularity: 90,
    illustration: mara,
    traits: {
      seed: 8604, playerLook: "female", stature: "tall", build: "balanced", headShape: "oval",
      skinTone: "#B87648", skinShadow: "#874D27", skinHighlight: "#D69669", irisColor: "#6F4D30",
      hairStyle: "ponytail", hairColor: "#C1BFCA", hairHighlight: "#FAEBDD", facialHair: "none",
      capStyle: "none", hairAccessory: "scrunchie", glasses: "none", accessory: "shades90s",
      eyeStyle: "chill", mouthStyle: "smirk", backdropStyle: "stadium", pitchingMotion: "underhand",
      bottoms: "skirt", skirtLiner: "shorts", jerseyFit: "D", croppedJersey: true, openCollar: true,
    },
    specialPowers: ["Mirage Change", "Ice Veins"],
    stats: { contact: 62, power: 54, speed: 78, pitching: 92, fielding: 81 },
    bio: "Mara learned her low release on a windy coastal field. Hitters still swear the changeup rises on its way past them.",
  },
  {
    id: "catalog-wade", name: "Wade Mercer", nickname: "Return to Sender",
    position: "C", bats: "L", throws: "L", jerseyNumber: 14,
    nationalityId: "USA", hometown: "Tucson, AZ",
    overall: 82, rarity: "allstar", level: 8, popularity: 77,
    illustration: wade,
    traits: {
      seed: 8605, playerLook: "male", stature: "tall", build: "lean", headShape: "square",
      skinTone: "#DEA77D", skinShadow: "#B47959", skinHighlight: "#F9D4A5", irisColor: "#617A7F",
      hairStyle: "sideSweep", hairColor: "#96979F", hairHighlight: "#F1E3C9", facialHair: "handlebar",
      capStyle: "backwards", hairAccessory: "none", glasses: "none", accessory: "freckles",
      eyeStyle: "determined", mouthStyle: "focused", backdropStyle: "halftone", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "shorts", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Snap Throw", "Cannon Arm"],
    stats: { contact: 77, power: 73, speed: 55, pitching: 46, fielding: 93 },
    bio: "His catcher's mitt is broken in on the right hand. Runners who forget about his left arm rarely make it to second.",
  },
  {
    id: "catalog-felix", name: "Félix Tremblay", nickname: "Gap Year",
    position: "3B", bats: "S", throws: "R", jerseyNumber: 19,
    nationalityId: "CAN", hometown: "Québec City",
    overall: 84, rarity: "allstar", level: 6, popularity: 84,
    illustration: felix,
    traits: {
      seed: 8606, playerLook: "male", stature: "short", build: "power", headShape: "square",
      skinTone: "#B87648", skinShadow: "#874D27", skinHighlight: "#D69669", irisColor: "#50341F",
      hairStyle: "curlyTop", hairColor: "#241D23", hairHighlight: "#544040", facialHair: "goatee",
      capStyle: "forward", hairAccessory: "none", glasses: "square", accessory: "none",
      eyeStyle: "bright", mouthStyle: "bigGrin", backdropStyle: "starburst", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "shorts", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Gap Shot", "Quick Hands"],
    stats: { contact: 90, power: 86, speed: 68, pitching: 37, fielding: 84 },
    bio: "Félix polishes his lenses before every at-bat. From either box he can pick the strip of grass between two outfielders.",
  },
  {
    id: "catalog-bento", name: "Bento Nunes", nickname: "Chalk Thief",
    position: "LF", bats: "R", throws: "L", jerseyNumber: 12,
    nationalityId: "BRA", hometown: "São Paulo",
    overall: 77, rarity: "rookie", level: 4, popularity: 80,
    illustration: bento,
    traits: {
      seed: 8607, playerLook: "male", stature: "medium", build: "lean", headShape: "oval",
      skinTone: "#8F5734", skinShadow: "#613419", skinHighlight: "#B0754F", irisColor: "#563723",
      hairStyle: "afro", hairColor: "#28212A", hairHighlight: "#625048", facialHair: "none",
      capStyle: "none", hairAccessory: "headband", glasses: "none", accessory: "none",
      eyeStyle: "wide", mouthStyle: "openLaugh", backdropStyle: "stadium", pitchingMotion: "overhand",
      bottoms: "pants", skirtLiner: "shorts", jerseyFit: "standard", croppedJersey: false, openCollar: false,
    },
    specialPowers: ["Foul-Line Slide"],
    stats: { contact: 72, power: 52, speed: 96, pitching: 39, fielding: 88 },
    bio: "Bento leaves the dugout in clean whites and comes back with a stripe of chalk from shoulder to ankle.",
  },
  {
    id: "catalog-yu-ting", name: "Yu-ting Lin", nickname: "Pink Slip",
    position: "RP", bats: "R", throws: "R", jerseyNumber: 18,
    nationalityId: "TPE", hometown: "Taipei",
    overall: 83, rarity: "allstar", level: 6, popularity: 81,
    illustration: yuTing,
    traits: {
      seed: 8608, playerLook: "female", stature: "short", build: "lean", headShape: "oval",
      skinTone: "#DB9A68", skinShadow: "#A76748", skinHighlight: "#F6BB86", irisColor: "#613B33",
      hairStyle: "ponytail", hairColor: "#352325", hairHighlight: "#945A4F", facialHair: "none",
      capStyle: "none", hairAccessory: "scrunchie", glasses: "none", accessory: "pinkShades",
      eyeStyle: "bright", mouthStyle: "bigGrin", backdropStyle: "stadium", pitchingMotion: "overhand",
      bottoms: "skirt", skirtLiner: "briefs", jerseyFit: "A", croppedJersey: true, openCollar: true,
    },
    specialPowers: ["Four-Seam Finish", "Ice Veins"],
    stats: { contact: 54, power: 44, speed: 82, pitching: 92, fielding: 76 },
    bio: "Lin flashes her catcher the same grin whether she likes the sign or plans to shake it off. Only her catcher can tell the difference.",
  },
];

const illustrationsByPlayer = new Map(ILLUSTRATED_PLAYER_POOL.map(player => [player.id, player.illustration]));

export function playerIllustration(playerId: string): string | undefined {
  return illustrationsByPlayer.get(playerId);
}
