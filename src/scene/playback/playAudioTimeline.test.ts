import { describe, expect, it } from 'vitest';
import type { PlayEvent, PlaySoundCue } from '../../engine/models/playEvent';
import { diamondPlay, type DiamondPlay } from './diamondPlay';
import {
  buildPlayAudioSchedule,
  collectPlayAudioCues,
  initialAudioCursor,
  type ScheduledAudioCue,
} from './playAudioTimeline';

function event(partial: Partial<PlayEvent> = {}): PlayEvent {
  return {
    seq: 1,
    type: 'ball_in_play',
    inning: 1,
    half: 'BOT',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: '',
    ...partial,
  };
}

function pitchOf(play: DiamondPlay) {
  const pitch = play.legs.find((leg) => leg.kind === 'pitch');
  if (!pitch) throw new Error(`expected a pitch leg on ${play.kind}`);
  return pitch;
}

function times(schedule: readonly ScheduledAudioCue[], cue: PlaySoundCue) {
  return schedule.filter((item) => item.cue === cue);
}

function one(schedule: readonly ScheduledAudioCue[], cue: PlaySoundCue) {
  const found = times(schedule, cue);
  expect(found, cue).toHaveLength(1);
  return found[0];
}

describe('buildPlayAudioSchedule', () => {
  it.each(['called_pitch', 'missed_pitch', 'ball_pitch'] as const)(
    '%s whooshes at release, pops the mitt, then pops the return throw',
    (kind) => {
      const play = diamondPlay(kind);
      const schedule = buildPlayAudioSchedule(play);
      const pitch = pitchOf(play);
      const back = play.legs.find((leg) => leg.from === 'C' && leg.to === 'P');
      expect(back).toBeDefined();
      expect(one(schedule, 'pitch_whoosh').at).toBeCloseTo(pitch.start);
      const pops = times(schedule, 'glove_pop');
      expect(pops.map((item) => item.at)).toEqual([pitch.end, back!.end]);
      expect(schedule.some((item) => item.cue === 'bat_crack' || item.cue === 'strikeout_punch' || item.cue === 'ump_strike_call')).toBe(false);
    },
  );

  it('clanks a foul at the barrel and pops only on the fresh-ball return to the mound', () => {
    const play = diamondPlay('foul_back');
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    const back = play.legs.find((leg) => leg.from === 'C' && leg.to === 'P');
    expect(back).toBeDefined();
    expect(one(schedule, 'foul_clank').at).toBeCloseTo(pitch.end);
    expect(schedule.some((item) => item.cue === 'foul_clank' && item.at > pitch.end)).toBe(false);
    expect(schedule.some((item) => item.cue === 'bat_crack')).toBe(false);
    expect(times(schedule, 'glove_pop').map((item) => item.at)).toEqual([back!.end]);
  });

  it('calls strike three only after the mitt pop, never at or before the plate', () => {
    const play = diamondPlay('called_third');
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    const pop = one(schedule, 'glove_pop');
    const call = one(schedule, 'ump_strike_call');
    expect(pop.at).toBeCloseTo(pitch.end);
    expect(call.at).toBeCloseTo(pitch.end + 0.3);
    expect(call.at).toBeGreaterThan(pitch.end);
    expect(call.at).toBeGreaterThanOrEqual(pitch.end + 0.28);
    expect(call.at).toBeGreaterThan(pop.at);
    expect(collectPlayAudioCues(schedule, -1, pitch.end)).not.toContain('ump_strike_call');
    expect(collectPlayAudioCues(schedule, pitch.end, pitch.end + 0.3)).toContain('ump_strike_call');
    expect(schedule.some((item) => item.cue === 'strikeout_punch')).toBe(false);
  });

  it('punches out a swinging strikeout only after the mitt pop', () => {
    const play = diamondPlay('swinging_third');
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    const pop = one(schedule, 'glove_pop');
    const punch = one(schedule, 'strikeout_punch');
    expect(pop.at).toBeCloseTo(pitch.end);
    expect(punch.at).toBeCloseTo(pitch.end + 0.3);
    expect(punch.at).toBeGreaterThan(pitch.end);
    expect(punch.at).toBeGreaterThanOrEqual(pitch.end + 0.28);
    expect(punch.at).toBeGreaterThan(pop.at);
    expect(collectPlayAudioCues(schedule, -1, pitch.end)).not.toContain('strikeout_punch');
    expect(schedule.some((item) => item.cue === 'ump_strike_call' || item.cue === 'bat_crack')).toBe(false);
  });

  it('sends the batter on ball four after the mitt pop', () => {
    const play = diamondPlay('ball_four');
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    expect(one(schedule, 'glove_pop').at).toBeCloseTo(pitch.end);
    const walk = one(schedule, 'walk_ball_four');
    expect(walk.at).toBeCloseTo(pitch.end + 0.34);
    expect(walk.at).toBeGreaterThan(pitch.end);
  });

  it.each(['single', 'double', 'triple', 'ground_out', 'fly_out', 'line_out', 'sac_fly', 'pop_up', 'infield_liner'] as const)(
    'cracks the bat at contact for a %s, not when the play finishes',
    (kind) => {
      const play = diamondPlay(kind);
      const schedule = buildPlayAudioSchedule(play);
      const pitch = pitchOf(play);
      const crack = one(schedule, 'bat_crack');
      expect(crack.at).toBeCloseTo(pitch.end);
      expect(crack.at).not.toBeCloseTo(play.finish);
      expect(collectPlayAudioCues(schedule, pitch.end, play.finish)).not.toContain('bat_crack');
    },
  );

  it('bombs a home run at contact and starts the organ when the ball clears', () => {
    const play = diamondPlay('home_run');
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    const clear = Math.min(play.finish, pitch.end + 1.05);
    expect(one(schedule, 'bomb_crack').at).toBeCloseTo(pitch.end);
    expect(one(schedule, 'bomb_crack').at).toBeLessThan(play.finish);
    expect(one(schedule, 'organ_homerun').at).toBeCloseTo(clear);
    expect(one(schedule, 'crowd_cheer').at).toBeCloseTo(clear);
    expect(schedule.some((item) => item.cue === 'bat_crack' || item.cue === 'fireworks_boom')).toBe(false);
    expect(collectPlayAudioCues(schedule, pitch.end, play.finish)).not.toContain('bomb_crack');
  });

  it('adds fireworks on a walk-off or mascot-cannon home run', () => {
    const walkoff = diamondPlay('home_run');
    walkoff.ending = { kind: 'walkoff', start: walkoff.leadArrival, scorer: 'BAT' };
    const pitch = pitchOf(walkoff);
    const clear = Math.min(walkoff.finish, pitch.end + 1.05);
    expect(one(buildPlayAudioSchedule(walkoff), 'fireworks_boom').at).toBeCloseTo(clear);

    const cannon = diamondPlay('home_run');
    cannon.mascotCannon = true;
    expect(times(buildPlayAudioSchedule(cannon), 'fireworks_boom')).toHaveLength(1);
    expect(times(buildPlayAudioSchedule(cannon, event({ soundCue: 'fireworks_boom' })), 'fireworks_boom')).toHaveLength(1);
  });

  it('taps a bunt at contact', () => {
    for (const kind of ['bunt_single', 'bunt_out'] as const) {
      const play = diamondPlay(kind);
      const schedule = buildPlayAudioSchedule(play);
      const tap = one(schedule, 'bunt_tap');
      expect(tap.at).toBeCloseTo(pitchOf(play).end);
      expect(tap.at).toBeLessThan(play.finish);
      expect(schedule.some((item) => item.cue === 'bat_crack')).toBe(false);
    }
  });

  it('snaps a double play at the finish and bonks an error when the ball gets loose', () => {
    const turn = diamondPlay('double_play');
    const turned = buildPlayAudioSchedule(turn);
    expect(one(turned, 'double_play_snap').at).toBeCloseTo(turn.finish);
    expect(one(turned, 'bat_crack').at).toBeCloseTo(pitchOf(turn).end);
    expect(turned.some((item) => item.cue === 'glove_pop')).toBe(false);

    const error = diamondPlay('fielding_error');
    const bobble = error.legs.find((leg) => leg.kind === 'bounce');
    const missed = buildPlayAudioSchedule(error);
    expect(bobble).toBeDefined();
    expect(one(missed, 'error_bonk').at).toBeCloseTo(bobble!.start);
    expect(one(missed, 'bat_crack').at).toBeCloseTo(pitchOf(error).end);
    expect(missed.some((item) => item.cue === 'glove_pop')).toBe(false);
  });

  it('pops the glove when the out arrives, including an unassisted grounder', () => {
    const assisted = diamondPlay('ground_out');
    const force = assisted.legs.find((leg) => leg.kind === 'throw');
    expect(one(buildPlayAudioSchedule(assisted), 'glove_pop').at).toBeCloseTo(force!.end);

    const unassisted = diamondPlay('ground_out', '1B');
    expect(one(buildPlayAudioSchedule(unassisted), 'glove_pop').at).toBeCloseTo(unassisted.pickupAt);

    const fly = diamondPlay('fly_out');
    expect(one(buildPlayAudioSchedule(fly), 'glove_pop').at).toBeCloseTo(fly.pickupAt);
    const bunt = diamondPlay('bunt_out');
    const buntForce = bunt.legs.find((leg) => leg.kind === 'throw');
    expect(one(buildPlayAudioSchedule(bunt), 'glove_pop').at).toBeCloseTo(buntForce!.end);
    expect(buildPlayAudioSchedule(diamondPlay('bunt_single')).some((item) => item.cue === 'glove_pop')).toBe(false);
  });

  it('thuds the wall on the bounce, not at the end of a triple or a wall double', () => {
    const triple = diamondPlay('triple');
    const tripleBounce = triple.legs.find((leg) => leg.kind === 'bounce');
    expect(triple.outfield?.wall).toBe(true);
    const thud = one(buildPlayAudioSchedule(triple), 'wall_thud');
    expect(thud.at).toBeCloseTo(tripleBounce!.start);
    expect(thud.at).toBeLessThan(triple.finish);

    const wallDouble = diamondPlay('double', undefined, event({ soundCue: 'wall_thud' }));
    const bounce = wallDouble.legs.find((leg) => leg.kind === 'bounce');
    expect(wallDouble.outfield?.wall).toBe(true);
    expect(one(buildPlayAudioSchedule(wallDouble), 'wall_thud').at).toBeCloseTo(bounce!.start);
    expect(buildPlayAudioSchedule(diamondPlay('single')).some((item) => item.cue === 'wall_thud')).toBe(false);
  });

  it('breaks the bat at contact when that is the fallback cue', () => {
    const play = diamondPlay('single');
    const schedule = buildPlayAudioSchedule(play, null, 'broken_bat');
    expect(one(schedule, 'broken_bat').at).toBeCloseTo(pitchOf(play).end);
    expect(schedule.some((item) => item.cue === 'bat_crack')).toBe(false);
    const fromEvent = buildPlayAudioSchedule(play, event({ soundCue: 'broken_bat', outcome: 'single' }));
    expect(one(fromEvent, 'broken_bat').at).toBeCloseTo(pitchOf(play).end);
  });

  it('cheers a scoring hit near the run crossing', () => {
    const play = diamondPlay('single');
    play.scorerBase = 1;
    expect(one(buildPlayAudioSchedule(play), 'crowd_cheer').at).toBeCloseTo(play.finish);
    expect(buildPlayAudioSchedule(diamondPlay('double')).some((item) => item.cue === 'crowd_cheer')).toBe(false);
  });

  it.each([1, 2] as const)('bursts, slides, and calls a steal of bag %i safe', (base) => {
    const play = diamondPlay('steal_safe', undefined, undefined, base);
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    expect(one(schedule, 'steal_burst').at).toBeCloseTo(pitch.start + 0.08);
    expect(one(schedule, 'glove_pop').at).toBeCloseTo(pitch.end);
    expect(one(schedule, 'dirt_slide').at).toBeCloseTo(play.finish - 0.14);
    expect(one(schedule, 'ump_safe_call').at).toBeCloseTo(play.finish);
    expect(schedule.some((item) => item.cue === 'stadium_airhorn')).toBe(false);
  });

  it('airs the horn for a steal of home and tags a caught stealing', () => {
    const home = diamondPlay('steal_safe', undefined, undefined, 3);
    const safe = buildPlayAudioSchedule(home);
    expect(one(safe, 'stadium_airhorn').at).toBeCloseTo(home.finish);
    expect(safe.some((item) => item.cue === 'ump_safe_call')).toBe(false);

    const caught = diamondPlay('steal_out', undefined, undefined, 1);
    const out = buildPlayAudioSchedule(caught);
    const pitch = pitchOf(caught);
    const pops = times(out, 'glove_pop');
    expect(pops.map((item) => item.at)).toEqual([pitch.end, caught.finish]);
    expect(one(out, 'dirt_slide').at).toBeCloseTo(caught.finish - 0.14);
    expect(one(out, 'steal_burst').at).toBeCloseTo(pitch.start + 0.08);
    expect(out.some((item) => item.cue === 'ump_safe_call')).toBe(false);
  });

  it('plays a super pitch at release, and heritage plus whoosh for other pitcher powers', () => {
    const comet = diamondPlay('swinging_third');
    const superSchedule = buildPlayAudioSchedule(comet, event({
      type: 'pitch_thrown',
      outcome: 'strikeout',
      soundCue: 'comet_pitch',
      specialPowerTriggered: { actor: 'pitcher', powerId: 'blazing_comet', calloutText: 'COMET', vfxColor: '#f00' },
    }));
    const pitch = pitchOf(comet);
    expect(one(superSchedule, 'comet_pitch').at).toBeCloseTo(pitch.start);
    expect(superSchedule.some((item) => item.cue === 'pitch_whoosh' || item.cue === 'heritage_power_surge')).toBe(false);
    expect(one(superSchedule, 'strikeout_punch').at).toBeCloseTo(pitch.end + 0.3);

    const heritage = diamondPlay('called_pitch');
    heritage.power = { actor: 'pitcher', powerId: 'ice_veins', calloutText: 'ICE', vfxColor: '#4CC3FF' };
    const release = times(buildPlayAudioSchedule(heritage), 'pitch_whoosh');
    const surge = times(buildPlayAudioSchedule(heritage), 'heritage_power_surge');
    expect(release).toHaveLength(1);
    expect(surge).toHaveLength(1);
    expect(release[0].at).toBeCloseTo(pitchOf(heritage).start);
    expect(surge[0].at).toBeCloseTo(pitchOf(heritage).start);
  });

  it('surges a batter power just before the contact crack', () => {
    const play = diamondPlay('single');
    play.power = { actor: 'batter', powerId: 'moonshot_bomb', calloutText: 'BOMB', vfxColor: '#FFC300' };
    const schedule = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    expect(one(schedule, 'heritage_power_surge').at).toBeCloseTo(Math.max(pitch.start, pitch.end - 0.06));
    expect(one(schedule, 'bat_crack').at).toBeCloseTo(pitch.end);
    expect(one(schedule, 'heritage_power_surge').at).toBeLessThan(pitch.end);
  });

  it('returns cues in chronological order', () => {
    const play = diamondPlay('home_run');
    play.ending = { kind: 'walkoff', start: play.leadArrival, scorer: 'BAT' };
    const schedule = buildPlayAudioSchedule(play);
    const at = schedule.map((item) => item.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });
});

describe('collectPlayAudioCues', () => {
  const schedule: ScheduledAudioCue[] = [
    { at: 0, cue: 'pitch_whoosh' },
    { at: 0.3, cue: 'glove_pop' },
    { at: 0.6, cue: 'ump_strike_call' },
  ];

  it('includes a cue at 0 when the cursor starts before the play and never refires it', () => {
    expect(collectPlayAudioCues(schedule, -1, 0)).toEqual(['pitch_whoosh']);
    expect(collectPlayAudioCues(schedule, 0, 0)).toEqual([]);
    expect(collectPlayAudioCues(schedule, 0, 0.3)).toEqual(['glove_pop']);
    expect(collectPlayAudioCues(schedule, -1, -0.01)).toEqual([]);
  });

  it('does not double-fire across abutting frames or a hitstop hold', () => {
    const first = collectPlayAudioCues(schedule, -1, 0.3);
    const second = collectPlayAudioCues(schedule, 0.3, 0.6);
    expect(first).toEqual(['pitch_whoosh', 'glove_pop']);
    expect(second).toEqual(['ump_strike_call']);
    expect(collectPlayAudioCues(schedule, 0.3, 0.3)).toEqual([]);
    expect(collectPlayAudioCues(schedule, 0.6, 0.3)).toEqual([]);
  });

  it('holds cues at freezeAt and resumes without replaying earlier ones', () => {
    const play = diamondPlay('called_third');
    const built = buildPlayAudioSchedule(play);
    const pitch = pitchOf(play);
    const freezeAt = pitch.end;
    const during = collectPlayAudioCues(built, initialAudioCursor(undefined), freezeAt);
    expect(during).toContain('glove_pop');
    expect(during).not.toContain('ump_strike_call');
    expect(collectPlayAudioCues(built, freezeAt, freezeAt)).toEqual([]);
    const resumed = collectPlayAudioCues(built, initialAudioCursor(freezeAt), pitch.end + 0.3);
    expect(resumed).toEqual(['ump_strike_call']);
    expect(resumed).not.toContain('glove_pop');
    expect(initialAudioCursor(0)).toBe(-1);
    expect(initialAudioCursor(1.25)).toBe(1.25);
  });

  it('replays the same cues after the cursor resets for Watch again', () => {
    const play = diamondPlay('single');
    const built = buildPlayAudioSchedule(play);
    const frames = [0, pitchOf(play).end, play.finish];
    const hear = () => {
      const heard: PlaySoundCue[] = [];
      let cursor = initialAudioCursor(undefined);
      for (const frame of frames) {
        heard.push(...collectPlayAudioCues(built, cursor, frame));
        cursor = frame;
      }
      return heard;
    };
    expect(hear()).toEqual(hear());
    expect(hear()).toContain('pitch_whoosh');
    expect(hear()).toContain('bat_crack');
  });
});
