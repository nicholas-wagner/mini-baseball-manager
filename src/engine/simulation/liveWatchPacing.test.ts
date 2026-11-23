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
});
