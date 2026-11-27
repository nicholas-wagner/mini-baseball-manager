import type { PlayEvent, PlaySoundCue as SoundCue } from '../../engine/models/playEvent';
import { PICKOFF_DIVE_AT } from './plateAndSteals';
import type { DiamondPlay } from './diamondPlay';

export interface ScheduledAudioCue {
  at: number;
  cue: SoundCue;
}

export interface PlayAudioFrame {
  schedule: readonly ScheduledAudioCue[];
  previousTime: number;
  onCue: (cue: SoundCue) => void;
}

const SUPER_PITCH_CUES = ['comet_pitch', 'tornado_whoosh', 'knuckle_warble'] as const;
type SuperPitchCue = (typeof SUPER_PITCH_CUES)[number];

function superPitchCue(cue: SoundCue | null | undefined): SuperPitchCue | undefined {
  return SUPER_PITCH_CUES.find((item) => item === cue);
}

function add(out: ScheduledAudioCue[], at: number, cue: SoundCue) {
  out.push({ at, cue });
}

function isCaughtOut(kind: string) {
  return kind === 'fly_out' || kind === 'line_out' || kind === 'pop_up' || kind === 'infield_liner' || kind === 'sac_fly';
}

function isForceOut(kind: string) {
  return kind === 'ground_out' || kind === 'bunt_out' || kind === 'cover_first';
}

function contactCue(play: DiamondPlay, event: PlayEvent | null | undefined, fallback?: SoundCue | null): SoundCue | null {
  if (play.kind === 'home_run') return 'bomb_crack';
  if (play.kind === 'bunt_single' || play.kind === 'bunt_out') return 'bunt_tap';
  if (play.kind === 'foul_back') return 'foul_clank';
  if (fallback === 'broken_bat' || event?.soundCue === 'broken_bat') return 'broken_bat';
  if (play.close) return null;
  return 'bat_crack';
}

function addRelease(
  out: ScheduledAudioCue[],
  pitch: DiamondPlay['legs'][number],
  play: DiamondPlay,
  event: PlayEvent | null | undefined,
  fallback?: SoundCue | null,
) {
  const special = superPitchCue(event?.soundCue) ?? superPitchCue(fallback);
  const pitcherPower = event?.specialPowerTriggered?.actor === 'pitcher' || play.power?.actor === 'pitcher';
  if (special) {
    add(out, pitch.start, special);
    return;
  }
  if (pitcherPower) add(out, pitch.start, 'heritage_power_surge');
  add(out, pitch.start, 'pitch_whoosh');
}

function addPlate(
  out: ScheduledAudioCue[],
  pitch: DiamondPlay['legs'][number],
  play: DiamondPlay,
  event: PlayEvent | null | undefined,
  fallback?: SoundCue | null,
) {
  if (pitch.to === 'C') add(out, pitch.end, 'glove_pop');
  else {
    const crack = contactCue(play, event, fallback);
    const batterPower = event?.specialPowerTriggered?.actor === 'batter' || play.power?.actor === 'batter';
    if (batterPower && crack) add(out, Math.max(pitch.start, pitch.end - 0.06), 'heritage_power_surge');
    if (crack) add(out, pitch.end, crack);
  }
  if (play.kind === 'called_third') add(out, pitch.end + 0.3, 'ump_strike_call');
  if (play.kind === 'swinging_third') add(out, pitch.end + 0.3, 'strikeout_punch');
  if (play.kind === 'ball_four') add(out, pitch.end + 0.34, 'walk_ball_four');
}

function addReturn(out: ScheduledAudioCue[], play: DiamondPlay) {
  const back = play.legs.find((leg) => leg.from === 'C' && leg.to === 'P' && leg.kind === 'throw');
  if (back) add(out, back.end, 'glove_pop');
}

function addFielding(out: ScheduledAudioCue[], play: DiamondPlay) {
  if (play.close) return;
  const bounce = play.legs.find((leg) => leg.kind === 'bounce');
  if (play.outfield?.wall && bounce) add(out, bounce.start, 'wall_thud');
  if (play.kind === 'fielding_error') {
    add(out, bounce?.start ?? play.pickupAt, 'error_bonk');
    return;
  }
  if (play.kind === 'double_play') {
    add(out, play.finish, 'double_play_snap');
    return;
  }
  if (play.webGem) add(out, play.pickupAt, 'dirt_slide');
  if (play.outfield?.robbedHomeRun) add(out, play.pickupAt + .14, 'crowd_cheer');
  if (isCaughtOut(play.kind) || play.webGem) add(out, play.pickupAt, 'glove_pop');
  if (isForceOut(play.kind)) {
    const force = [...play.legs].reverse().find((leg) => leg.kind === 'throw');
    if (force || !play.webGem) add(out, force?.end ?? play.pickupAt, 'glove_pop');
  }
}

function addSteal(
  out: ScheduledAudioCue[],
  play: DiamondPlay,
  pitch: DiamondPlay['legs'][number],
  event: PlayEvent | null | undefined,
) {
  if (play.kind !== 'steal_safe' && play.kind !== 'steal_out') return;
  add(out, pitch.start + 0.08, 'steal_burst');
  add(out, Math.max(pitch.end, play.finish - 0.14), 'dirt_slide');
  if (play.kind === 'steal_out') {
    add(out, play.finish, 'glove_pop');
    return;
  }
  const stealOfHome = play.close?.fromBase === 3 || event?.soundCue === 'stadium_airhorn';
  add(out, play.finish, stealOfHome ? 'stadium_airhorn' : 'ump_safe_call');
}

function addCelebration(
  out: ScheduledAudioCue[],
  play: DiamondPlay,
  pitch: DiamondPlay['legs'][number],
  event: PlayEvent | null | undefined,
) {
  if (play.kind === 'home_run') {
    const clear = Math.min(play.finish, pitch.end + 1.05);
    add(out, clear, 'organ_homerun');
    add(out, clear, 'crowd_cheer');
    if (play.ending?.kind === 'walkoff' || event?.soundCue === 'fireworks_boom' || play.mascotCannon) {
      add(out, clear, 'fireworks_boom');
    }
  }
  const scoringHit = play.kind === 'single' || play.kind === 'double' || play.kind === 'triple';
  if (scoringHit && (play.scorerBase || play.ending?.kind === 'walkoff')) add(out, play.finish, 'crowd_cheer');
}

/** Playback-clock cues for one diamond play. Times are play seconds, matching the 3D clock. */
export function buildPlayAudioSchedule(
  play: DiamondPlay,
  event?: PlayEvent | null,
  fallbackCue?: SoundCue | null,
): ScheduledAudioCue[] {
  if (play.close?.pickoff) return [
    { at: play.legs[0].start, cue: 'pitch_whoosh' },
    { at: PICKOFF_DIVE_AT, cue: 'dirt_slide' },
    { at: play.receiveAt, cue: 'glove_pop' },
    { at: play.finish, cue: 'double_play_snap' },
    { at: play.finish + .10, cue: play.kind === 'pickoff_safe' ? 'ump_safe_call' : 'crowd_cheer' },
  ];
  const pitch = play.legs.find((leg) => leg.kind === 'pitch');
  if (!pitch) return [];
  const out: ScheduledAudioCue[] = [];
  addRelease(out, pitch, play, event, fallbackCue);
  addPlate(out, pitch, play, event, fallbackCue);
  addReturn(out, play);
  addFielding(out, play);
  addSteal(out, play, pitch, event);
  addCelebration(out, play, pitch, event);
  out.sort((left, right) => left.at - right.at);
  return out;
}

/** Cues whose play-time falls in (previousTime, currentTime]. A negative cursor includes t = 0. */
export function collectPlayAudioCues(
  schedule: readonly ScheduledAudioCue[],
  previousTime: number,
  currentTime: number,
): SoundCue[] {
  if (currentTime < previousTime) return [];
  const cues: SoundCue[] = [];
  for (const item of schedule) {
    if (previousTime < item.at && item.at <= currentTime) cues.push(item.cue);
  }
  return cues;
}

/** -1 replays from the first frame. A positive resume time keeps earlier cues from firing again. */
export function initialAudioCursor(startAt?: number): number {
  return startAt !== undefined && startAt > 0 ? startAt : -1;
}
