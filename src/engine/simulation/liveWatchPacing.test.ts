import { describe, expect, it } from 'vitest';
import { generateSixTierWorld } from '../league/seasonEngine';
import type { PlayEvent } from '../models/playEvent';
import { createGameSession } from './baseballEngine';
import { computeLiveActionCue } from './liveActionAdvisor';
import { buildComicPopArtBanner, shouldSmartAutoPause } from './liveWatchPacing';

function makeSession() {
  const world = generateSixTierWorld(1994, {
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
  });
  return createGameSession(world.leagues.rookie[1], world.leagues.rookie[0], 1994, 'regular', 5);
}

function makeEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 1,
    type: 'pitch_thrown',
    inning: 1,
    half: 'TOP',
    outsBefore: 0,
    outsAfter: 0,
    balls: 1,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    leverageIndex: 1.0,
    commentary: 'Ball outside.',
    ...overrides,
  };
}

describe('Smart 3D Watch Pacing & 90s Comic Pop-Art Callouts', () => {
  it('keeps flowing on routine balls/strikes and auto-pauses on big plays, Coach Pops alerts, late 2-strike clutch, or final out', () => {
    const session = makeSession();
    const calmCue = computeLiveActionCue({
      session,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });

    // Routine 1-0 ball -> keep cruising!
    const routine = shouldSmartAutoPause(session, makeEvent({ outcome: 'ball' }), calmCue);
    expect(routine.pause).toBe(false);

    // Home run -> pause to savor the moment!
    const hr = shouldSmartAutoPause(session, makeEvent({ outcome: 'home_run' }), calmCue);
    expect(hr.pause).toBe(true);
    expect(hr.reason).toMatch(/home run/i);

    // Strikeout & stolen base attempt -> pause!
    const k = shouldSmartAutoPause(session, makeEvent({ outcome: 'strikeout' }), calmCue);
    expect(k.pause).toBe(true);
    expect(
      shouldSmartAutoPause(session, makeEvent({ type: 'stolen_base_attempt' }), calmCue).pause,
    ).toBe(true);

    // Special Power triggered -> pause!
    const pwr = shouldSmartAutoPause(
      session,
      makeEvent({
        outcome: 'double',
        specialPowerTriggered: {
          actor: 'batter',
          powerId: 'moonshot',
          calloutText: 'BOOM!',
          vfxColor: '#FFC300',
        },
      }),
      calmCue,
    );
    expect(pwr.pause).toBe(true);

    // Tired pitcher Coach Pops cue -> pause so manager can call bullpen!
    const tiredSession = { ...session, home: { ...session.home, pitcherFatigue: 75 } };
    const tiredCue = computeLiveActionCue({
      session: tiredSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(shouldSmartAutoPause(tiredSession, null, tiredCue).pause).toBe(true);

    // Late 2-strike clutch pitch -> pause for drama!
    const lateClutch = {
      ...session,
      inning: 5,
      half: 'BOT' as const,
      strikes: 2,
      outs: 2,
      bases: [null, session.home.lineup[1].playerId, null] as [string | null, string | null, string | null],
      away: { ...session.away, score: 3 },
      home: { ...session.home, score: 2 },
    };
    const lateCue = computeLiveActionCue({
      session: lateClutch,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(shouldSmartAutoPause(lateClutch, makeEvent({ outcome: 'foul' }), lateCue).pause).toBe(true);

    // Completed game -> pause!
    expect(shouldSmartAutoPause({ ...session, status: 'completed' }, null, calmCue).pause).toBe(true);
  });

  it('builds juicy 90s comic pop-art banners with Coach Pops quips and confetti triggers for homers, walk-offs, steals & strikeouts', () => {
    const session = makeSession();

    const hr = buildComicPopArtBanner(makeEvent({ outcome: 'home_run', commentary: 'Crushed!' }), session);
    expect(hr?.title).toMatch(/ka-pow|moonshot/i);
    expect(hr?.confetti).toBe(true);
    expect(hr?.coachQuip.length).toBeGreaterThan(5);

    const walkoff = buildComicPopArtBanner(
      makeEvent({ outcome: 'single', half: 'BOT', inning: 5, homeScore: 4, awayScore: 3 }),
      { ...session, status: 'completed', half: 'BOT', inning: 5, home: { ...session.home, score: 4 }, away: { ...session.away, score: 3 } },
    );
    expect(walkoff?.title).toMatch(/walk-off/i);
    expect(walkoff?.confetti).toBe(true);

    expect(buildComicPopArtBanner(makeEvent({ outcome: 'triple' }), session)?.title).toMatch(/triple/i);
    expect(buildComicPopArtBanner(makeEvent({ outcome: 'double_play' }), session)?.title).toMatch(/double play/i);
    expect(buildComicPopArtBanner(makeEvent({ outcome: 'strikeout' }), session)?.title).toMatch(/strike three/i);
    expect(
      buildComicPopArtBanner(makeEvent({ type: 'stolen_base_attempt', outsBefore: 0, outsAfter: 0 }), session)?.title,
    ).toMatch(/safe/i);
    expect(
      buildComicPopArtBanner(makeEvent({ type: 'stolen_base_attempt', outsBefore: 0, outsAfter: 1 }), session)?.title,
    ).toMatch(/caught|nabbed/i);
    expect(
      buildComicPopArtBanner(
        makeEvent({
          specialPowerTriggered: {
            actor: 'pitcher',
            powerId: 'nova',
            calloutText: 'SUPERNOVA!',
            vfxColor: '#00E5FF',
          },
        }),
        session,
      )?.confetti,
    ).toBe(true);
    expect(buildComicPopArtBanner(makeEvent({ outcome: 'ball' }), session)).toBeNull();
    expect(buildComicPopArtBanner(null, session)).toBeNull();
  });

  it('celebrates in-game milestones (Multi-HR Monster, 3-Hit Hot Streak, 5-K Strikeout Gem) with confetti banners', () => {
    const session = makeSession();
    const batterId = session.away.lineup[0].playerId;
    const pitcherId = session.home.activePitcherId;

    // 2nd HR of the game -> Multi-HR Monster!
    const multiHrSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        awayBatters: {
          ...session.boxScore.awayBatters,
          [batterId]: { ...session.boxScore.awayBatters[batterId], hits: 2, homeRuns: 2 },
        },
      },
    };
    const multiHr = buildComicPopArtBanner(
      makeEvent({ outcome: 'home_run', batterId, pitcherId, half: 'TOP' }),
      multiHrSession,
    );
    expect(multiHr?.title).toMatch(/2-hr|multi-hr/i);
    expect(multiHr?.confetti).toBe(true);

    // 3rd hit of the day -> 3-Hit Hot Streak!
    const threeHitSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        awayBatters: {
          ...session.boxScore.awayBatters,
          [batterId]: { ...session.boxScore.awayBatters[batterId], hits: 3, homeRuns: 0 },
        },
      },
    };
    const threeHit = buildComicPopArtBanner(
      makeEvent({ outcome: 'single', batterId, pitcherId, half: 'TOP' }),
      threeHitSession,
    );
    expect(threeHit?.title).toMatch(/3-hit/i);
    expect(threeHit?.confetti).toBe(true);

    // 5th strikeout by pitcher -> 5-K Gem!
    const fiveKSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        homePitchers: {
          ...session.boxScore.homePitchers,
          [pitcherId]: { ...session.boxScore.homePitchers[pitcherId], strikeouts: 5 },
        },
      },
    };
    const fiveK = buildComicPopArtBanner(
      makeEvent({ outcome: 'strikeout', batterId, pitcherId, half: 'TOP' }),
      fiveKSession,
    );
    expect(fiveK?.title).toMatch(/5-k/i);
    expect(fiveK?.confetti).toBe(true);

    // BOT-half 8-K gem, routine 1-hit non-milestone, and unknown-ID safe fallback
    const awayPitcherId = session.away.activePitcherId;
    const homeBatterId = session.home.lineup[0].playerId;
    const botSession = {
      ...session,
      half: 'BOT' as const,
      boxScore: {
        ...session.boxScore,
        homeBatters: {
          ...session.boxScore.homeBatters,
          [homeBatterId]: { ...session.boxScore.homeBatters[homeBatterId], hits: 1, homeRuns: 0 },
        },
        awayPitchers: {
          ...session.boxScore.awayPitchers,
          [awayPitcherId]: { ...session.boxScore.awayPitchers[awayPitcherId], strikeouts: 8 },
        },
      },
    };
    expect(
      buildComicPopArtBanner(
        makeEvent({ outcome: 'strikeout', batterId: homeBatterId, pitcherId: awayPitcherId, half: 'BOT' }),
        botSession,
      )?.title,
    ).toMatch(/8-k/i);
    expect(
      buildComicPopArtBanner(
        makeEvent({ outcome: 'single', batterId: homeBatterId, pitcherId: awayPitcherId, half: 'BOT' }),
        botSession,
      ),
    ).toBeNull();
    expect(
      buildComicPopArtBanner(
        makeEvent({ outcome: 'single', batterId: 'unknown-id', pitcherId: 'unknown-p', half: 'BOT' }),
        botSession,
      ),
    ).toBeNull();
    expect(
      buildComicPopArtBanner(
        makeEvent({ outcome: 'strikeout', batterId: 'unknown-id', pitcherId: 'unknown-p', half: 'TOP' }),
        botSession,
      )?.title,
    ).toMatch(/strike three/i);
  });
});
