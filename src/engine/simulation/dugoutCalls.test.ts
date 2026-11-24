import { expect, it } from 'vitest';
import {
  generateSixTierWorld,
  featuredLeagueGame,
  settleLeagueWire,
  simulateSeriesRound,
} from '../league/seasonEngine';
import { createGameSession, stepPitch } from './baseballEngine';
import {
  catcherSign,
  gazetteCaption,
  personalWatchStop,
  recentContact,
} from './dugoutCalls';
import { getCurrentBatter, getCurrentPitcher, getDefenderAtPosition } from './gameState';

const clubs = generateSixTierWorld(1994, {
  city: 'Sandlot',
  clubName: 'Comets',
  mascot: 'Rocket',
  monogram: 'SC',
  primaryColor: '#112233',
  secondaryColor: '#334455',
  accentColor: '#667788',
}).leagues.rookie;
const fresh = () => createGameSession(clubs[1], clubs[0], 1994, 'regular', 5);
it('scores a sent runner once, holds them at third, and credits a failed send to the defense', () => {
  const results = new Set();
  for (let seed = 1; seed < 2500 && results.size < 2; seed++) {
    const s = fresh();
    s.rngSeed = seed;
    s.outs = 2;
    s.bases[1] = s.away.lineup[8].playerId;
    const hold = stepPitch(s, 'contact', { thirdBaseCall: 'hold' });
    const hit = hold.events.find((e) => e.thirdBase);
    if (!hit) continue;
    expect(hit.basesAfter[2]).toBe(s.bases[1]);
    const sent = stepPitch(s, 'contact', { thirdBaseCall: 'send' });
    const play = sent.events.find((e) => e.thirdBase)!;
    expect(play.outcome).toBe('single');
    expect(play.basesAfter[2]).toBeNull();
    const safe = play.thirdBase!.result === 'safe';
    results.add(safe);
    expect(play.awayScore).toBe(safe ? 1 : 0);
    expect(sent.nextSession.boxScore.awayBatters[hit.batterId!].rbis).toBe(
      safe ? 1 : 0,
    );
    expect(
      sent.nextSession.boxScore.homePitchers[hit.pitcherId!].outsRecorded,
    ).toBe(safe ? 0 : 1);
    expect(sent.nextSession.half).toBe(safe ? 'TOP' : 'BOT');
    const lines = sent.nextSession.boxScore.homeBatters;
    expect(lines[getDefenderAtPosition(s.home,'C').id].putouts).toBe(safe ? 0 : 1);
    expect(lines[getDefenderAtPosition(s.home,play.thirdBase!.position).id].assists).toBe(safe ? 0 : 1);
    const relay = play.thirdBase!.position === 'RF' ? '2B' : 'SS';
    expect(lines[getDefenderAtPosition(s.home,relay).id].assists).toBe(safe ? 0 : 1);
    expect(s.away.score).toBe(0);
  }
  expect(results.size).toBe(2);
});
it('reads the current pitcher’s actual sequence and offers a different pitch they own', () => {
  const s = fresh(),
    p = getCurrentPitcher(s);
  const pitch = p.pitchArsenal!.favoritePitch;
  expect(catcherSign(s)).toBeNull();
  s.atBatPitchHistory = [pitch, pitch];
  const sign = catcherSign(s)!;
  expect(sign.pitch).not.toBe(pitch);
  expect(
    p.pitchArsenal!.repertoire.some((slot) => slot.pitchType === sign.pitch),
  ).toBe(true);
  expect(sign.text).toContain('2');
});
it('personal watch stops follow the selected hitter, tying runner or tiring starter', () => {
  const s = fresh();
  s.home.isHuman = true;
  s.away.isHuman = false;
  expect(personalWatchStop(s, 'starter')).toBeNull();
  s.home.pitcherFatigue = 90;
  expect(personalWatchStop(s, 'starter')).toBeTruthy();
  s.half = 'BOT';
  const id = getCurrentBatter(s).id;
  expect(personalWatchStop(s, id)).toContain(getCurrentBatter(s).name);
  s.away.score = 2;
  s.bases = [s.home.lineup[1].playerId, null, null];
  expect(personalWatchStop(s, 'tying')).toBeNull();
  s.bases[1] = s.home.lineup[2].playerId;
  expect(personalWatchStop(s, 'tying')).toBeTruthy();
});
it('records only the last six fair locations for the named player and grounds Gazette copy in their history', () => {
  const s = fresh(),
    batter = getCurrentBatter(s);
  const basic = stepPitch(s).events[0];
  const events = Array.from({ length: 8 }, (_, i) => ({
    ...basic,
    type: 'ball_in_play' as const,
    batterId: batter.id,
    ballFlight: {
      style: 'line_drive' as const,
      landingX: i,
      landingZ: -20,
      apexY: 2,
      durationSec: 1,
    },
  }));
  expect(
    recentContact(batter, [...events, { ...events[0], batterId: 'other' }]).map(
      (p) => p.x,
    ),
  ).toEqual([2, 3, 4, 5, 6, 7]);
  expect(
    gazetteCaption({ ...batter, formerClubIds: [s.home.clubId] }, s.home),
  ).toContain(s.home.name);
});
it('selects an actual scheduled neutral game, without altering either club', () => {
  const game = featuredLeagueGame(clubs, 0, 123, 5, 0)!;
  expect(game.away.isHuman || game.home.isHuman).toBe(false);
  expect(game.result.winnerClubId).toBeTruthy();
  expect(clubs.every((c) => c.wins + c.losses === 0)).toBe(true);
});

it('credits a wire final once across a resumed game, then completes the other fixtures', () => {
  const round = 0,
    seed = 123;
  const pure = simulateSeriesRound(clubs, round, seed, 5);
  let live = settleLeagueWire(clubs, round, seed, 5, 0);
  expect(settleLeagueWire(live, round, seed, 9, 0)).toBe(live);
  const final = live.find((c) => c.isHuman)?.leagueWireFinal;
  expect(final?.winnerWins).toBe(1);
  live = settleLeagueWire(live, round, seed, 5, 1);
  const finished = simulateSeriesRound(live, round, seed, 5);
  expect(finished.gamesSimulated).toBe(pure.gamesSimulated - 2);
  expect(finished.clubs.map((c) => [c.id, c.wins, c.losses])).toEqual(
    pure.clubs.map((c) => [c.id, c.wins, c.losses]),
  );
});

it('changes speed after consecutive fastballs and avoids a chase sign on three balls', () => {
  const s = fresh();
  const starter = getCurrentPitcher(s);
  const pitcher = {
    ...starter,
    pitchArsenal: {
      ...starter.pitchArsenal!,
      repertoire: [
        { pitchType: 'four_seam' as const, mastery: 98 },
        { pitchType: 'cutter' as const, mastery: 92 },
        { pitchType: 'changeup' as const, mastery: 72 },
      ],
    },
  };
  s.home.playersById = { ...s.home.playersById, [pitcher.id]: pitcher };
  s.atBatPitchHistory = ['four_seam', 'cutter'];
  s.strikes = 2;
  expect(catcherSign(s)).toMatchObject({
    pitch: 'changeup',
    target: 'bury_offspeed',
  });
  s.balls = 3;
  expect(catcherSign(s)?.target).toBe('paint_corners');
});
