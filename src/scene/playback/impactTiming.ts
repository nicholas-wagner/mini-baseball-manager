import { isBaseHit, type DiamondPlay } from './diamondPlay';

/** Pause at the collision, then catch up by the next ball arrival so the UI verdict stays in sync. */
export function barrelReplayTime(play: DiamondPlay, time: number, rate: number) {
  const [pitch, flight] = play.legs;
  if (pitch.to !== 'BAT' || !flight || time <= pitch.end || time >= flight.end) return time;
  const span = flight.end - pitch.end;
  const hold = Math.min(.060 * rate, span * .8);
  return pitch.end + Math.max(0, time - pitch.end - hold) * span / (span - hold);
}

export function crowdReaction(play: DiamondPlay) {
  if (play.outfield?.robbedHomeRun) return { at: play.pickupAt, level: 1, stand: true };
  const stand = isBaseHit(play);
  if (play.ending?.kind === 'walkoff') return { at: play.ending.start, level: 1, stand };
  if (stand) return { at: play.outfield ? play.legs[1].end : play.finish, level: play.kind === 'home_run' ? .94 : .72, stand };
  if (['called_third', 'swinging_third', 'steal_safe'].includes(play.kind)) return { at: play.finish, level: .66, stand };
}

export function decayExcitement(level: number, elapsed: number) {
  return .2 + (level - .2) * Math.exp(-elapsed * .74);
}

export function clutchSlowMoWindow(play: DiamondPlay) {
  const plate = play.legs[0].end;
  if (play.ending?.kind === 'walkoff' && isBaseHit(play)) return { start: plate - .175, end: plate + .175, scale: .38 };
  if (play.outfield?.robbedHomeRun) return { start: play.pickupAt - .14, end: play.pickupAt + .21, scale: .38 };
  const strikeout = play.kind === 'called_third' || play.kind === 'swinging_third';
  if (play.reliefStrikeout || (strikeout && play.ending?.kind === 'third_out')) {
    return { start: plate - .10, end: plate + .25, scale: .42 };
  }
  return null;
}

const clutchEase = .06;
function smoothstep(value: number) {
  const u = Math.max(0, Math.min(1, value));
  return u * u * (3 - 2 * u);
}

export function clutchSlowMoScale(play: DiamondPlay, time: number, reducedMotion: boolean) {
  if (reducedMotion) return 1;
  const window = clutchSlowMoWindow(play);
  if (!window || time <= window.start || time >= window.end) return 1;
  const edge = Math.min(time - window.start, window.end - time);
  return 1 - (1 - window.scale) * smoothstep(edge / clutchEase);
}

/** Sample an absolute clock so seeks and skipped frames get the same ball, sound and verdict. */
export function clutchReplayTime(play: DiamondPlay, time: number, reducedMotion: boolean) {
  if (reducedMotion) return time;
  const window = clutchSlowMoWindow(play);
  if (!window) return time;
  const impact = play.outfield?.robbedHomeRun ? play.pickupAt : play.legs[0].end;
  const offset = time - impact;
  const distance = Math.abs(offset);
  const span = offset < 0 ? impact - window.start : window.end - impact;
  if (distance >= span + .42) return time;
  if (distance <= span - clutchEase) return impact + offset * window.scale;

  // Integrate the smoothstep speed ramp. Borrow the lost time from the approach
  // and follow-through, leaving the contact, scoreboard call and replay end on time.
  const edge = Math.max(0, (span - distance) / clutchEase);
  const rampArea = clutchEase * edge ** 3 * (1 - edge / 2);
  const lag = (1 - window.scale) * (span - clutchEase / 2 - rampArea);
  const recovery = smoothstep((distance - span) / .42);
  return time - Math.sign(offset) * lag * (1 - recovery);
}
