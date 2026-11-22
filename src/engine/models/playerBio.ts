import type { FieldPosition } from '../handedness/types';
import { createSeededRng } from '../rng/seededRng';
import {
  isPitcherPosition,
  PITCH_TYPE_SHORT_LABELS,
  type Player,
} from './player';

const LEGACY_GENERIC_BIOS: ReadonlySet<string> = new Set([
  'Always arrives early with a pocket full of sunflower seeds and extra pine tar.',
  'Famous across the circuit for towering pre-game batting practice launches.',
  'Never steps on a chalk line and tips their cap toward the bullpen every inning.',
  'Built a backyard radar tunnel out of milk crates and a porch screen.',
]);

const POSITION_NAMES: Readonly<Record<FieldPosition, string>> = {
  SP: 'the starting mound',
  RP: 'the late-inning bullpen',
  C: 'behind the dish',
  '1B': 'first base',
  '2B': 'second base',
  '3B': 'the hot corner',
  SS: 'shortstop',
  LF: 'left field',
  CF: 'center field',
  RF: 'right field',
};

interface BioTokens {
  hometown: string;
  favPitch: string;
  posName: string;
  handLabel: string;
}

const PITCHER_HOOKS: readonly string[] = [
  'Dialed in a wicked {favPitch} throwing at a chalked brick wall back in {hometown}.',
  'Out of {hometown}, this {handLabel} keeps hitters frozen with a biting {favPitch}.',
  'Bullpen catchers in {hometown} still talk about the loud leather pop on that {favPitch}.',
  'Learned to paint the outer corner on a dusty sandlot diamond in {hometown}.',
  'Broke two porch floodlights in {hometown} perfecting late dive on the {favPitch}.',
  'Commands {posName} with poise learned pitching doubleheaders across {hometown}.',
  'Packs a lucky rosin bag from {hometown} and attacks counts with a heavy {favPitch}.',
  'Turned heads at {hometown} summer showcases by tunneling a nasty {favPitch} off the black.',
  'Honed an ice-cold mound tempo growing up in {hometown}, leaning on the {favPitch} in big spots.',
  'Scouts first spotted this {handLabel} mowing down {hometown} hitters with a sharp {favPitch}.',
  'Brings a fearless {hometown} bulldog mentality every time the skipper hands over the baseball.',
  'Built arm strength tossing long-toss across windy neighborhood parks in {hometown}.',
];

const HITTER_HOOKS: readonly string[] = [
  'Grew up lacing line drives off garage doors in {hometown} and hunts {favPitch}s early.',
  'A {hometown} standout who turns {favPitch} pitches into laser shots into both alleys.',
  'Patrols {posName} with quick feet sharpened on bumpy neighborhood diamonds in {hometown}.',
  'Known back in {hometown} for marathon tee-work sessions and ambushing the {favPitch}.',
  'Earned a cult following around {hometown} by legging out routine grounders and hustling for extra bases.',
  'Cut their teeth in {hometown} sandlot tournaments and locks onto every {favPitch} in the zone.',
  'Guards {posName} like a gold-glove vacuum after countless twilight fungos back in {hometown}.',
  'Out of {hometown}, this {handLabel} brings a smooth swing tailor-made for crushing {favPitch}s.',
  'Fans in {hometown} still replay the walk-off rally this sparkplug ignited with two outs.',
  'Stays calm in tough counts, using a patient {hometown} approach before unleashing on a {favPitch}.',
  'Broke in a trusty glove on rain-soaked {hometown} ballfields and thrives at {posName}.',
  'Rattles opposing defenses with relentless {hometown} grit and crisp barrel control vs {favPitch}s.',
];

function formatBioTemplate(template: string, tokens: BioTokens): string {
  return template
    .replaceAll('{hometown}', tokens.hometown)
    .replaceAll('{favPitch}', tokens.favPitch)
    .replaceAll('{posName}', tokens.posName)
    .replaceAll('{handLabel}', tokens.handLabel);
}

const PERSONALITY_QUIRKS: Readonly<Record<Player['personality'], readonly string[]>> = {
  prankster: [
    'Hides bubble-gum wrappers inside teammates’ batting helmets on road trips.',
    'Keeps the dugout loose with spot-on impressions of the home-plate umpire.',
    'Leads a clubhouse paper-airplane contest during every rain delay.',
  ],
  clutch_captain: [
    'Writes every opposing pitcher’s tendencies into a dog-eared spiral notebook.',
    'Always the first player on the top step cheering when the tying run steps up.',
    'Calls quick infield huddles whenever a rally threatens in the late innings.',
  ],
  quiet_assassin: [
    'Rarely says two words during warmups, letting crisp fundamentals do the talking.',
    'Tunes out 30,000 roaring fans with a single slow breath before stepping in.',
    'Cleans and oils their game glove in complete silence after every night game.',
  ],
  showboat: [
    'Rocks neon 90s wraparound shades even on overcast afternoon starts.',
    'Practices signature high-five handshakes with every batboy on the circuit.',
    'Wears high-cuffed throwback stirrups so fans in the upper deck never miss a play.',
  ],
  gym_rat: [
    'Arrives two hours before gates open for extra footwork ladders and band work.',
    'Still finishes every practice with fifty extra swings off a battered wooden tee.',
    'Tracks sleep, hydration, and sprint splits in a color-coded 1994 binder.',
  ],
  rival_hunter: [
    'Circles every crosstown rivalry series in thick red marker on Opening Day.',
    'Feeds off hostile road-crowd boos and grins wider when the bleachers get loud.',
    'Saves their loudest dugout fist-pumps for division showdowns under the lights.',
  ],
  superstitious: [
    'Taps home plate exactly three times and hops over every white foul line.',
    'Refuses to wash their lucky road undershirt whenever a hitting streak hits five games.',
    'Eats the exact same peanut-butter sandwich two hours before every first pitch.',
  ],
};

const GENERAL_QUIRKS: readonly string[] = [
  'Collects vintage holographic baseball cards on long team bus rides.',
  'Swears by grape bubblegum and double-knotted cleats before first pitch.',
  'Hands out signed baseballs to kids behind the dugout before every homestand.',
  'Never steps on the first-base chalk line jogging off the diamond.',
  'Still uses a favorite bat-grip wrap pattern learned from an older sibling.',
  'Listens to classic 16-bit arcade soundtracks on a portable cassette player.',
  'Tips their cap toward the outfield bleachers after every clean inning.',
  'Keeps an extra pouch of ranch sunflower seeds tucked in the back pocket.',
];

function hashPlayerBioSeed(
  player: Pick<Player, 'id' | 'jerseyNumber' | 'name' | 'hometown'>,
): number {
  let hash = Math.imul(player.jerseyNumber + 11, 2654435761) >>> 0;
  const key = `${player.id}:${player.name}:${player.hometown}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (Math.imul(hash, 31) + key.charCodeAt(i)) >>> 0;
  }
  return hash || 1994;
}

/** Returns true when a bio is blank or one of the 4 repetitive legacy placeholder bios. */
export function isLegacyGenericBio(bio: string | undefined): boolean {
  if (!bio || bio.trim().length === 0) return true;
  return LEGACY_GENERIC_BIOS.has(bio.trim());
}

/** Deterministically builds a unique, role-authentic 90s baseball card bio for any player. */
export function buildPlayerCardBio(player: Player): string {
  const rng = createSeededRng(hashPlayerBioSeed(player));
  const pitcher = isPitcherPosition(player.position);
  const favPitchType = pitcher
    ? (player.pitchArsenal?.favoritePitch ?? 'four_seam')
    : player.batterPitchProfile.favoritePitch;
  const handLabel = pitcher
    ? player.throws === 'L'
      ? 'southpaw'
      : 'right-hander'
    : player.bats === 'S'
      ? 'switch-hitter'
      : player.bats === 'L'
        ? 'lefty bat'
        : 'righty bat';

  const tokens: BioTokens = {
    hometown: player.hometown,
    favPitch: PITCH_TYPE_SHORT_LABELS[favPitchType],
    posName: POSITION_NAMES[player.position],
    handLabel,
  };

  const hookTemplate = pitcher ? rng.pick(PITCHER_HOOKS) : rng.pick(HITTER_HOOKS);
  const hook = formatBioTemplate(hookTemplate, tokens);
  const quirkPool = rng.chance(0.55)
    ? PERSONALITY_QUIRKS[player.personality]
    : GENERAL_QUIRKS;
  const quirk = rng.pick(quirkPool);
  return `${hook} ${quirk}`;
}

/** Preserves custom hand-crafted bios while automatically upgrading repetitive legacy bios. */
export function resolvePlayerCardBio(player: Player): string {
  return isLegacyGenericBio(player.bio) ? buildPlayerCardBio(player) : player.bio;
}
