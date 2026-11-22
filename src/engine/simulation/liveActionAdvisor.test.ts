import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession } from './baseballEngine';
import { computeLiveActionCue } from './liveActionAdvisor';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

describe('Live Action Advisor — Contextual First-Experience Coaching Cues', () => {
  const makeSession = () => {
    const rng = createSeededRng(1994);
    const away = createClub(rng, {
      id: 'away',
      city: 'Rival',
      name: 'Foxes',
      mascot: 'Fox',
      colors: COLORS,
      leagueTier: 'rookie',
      isHuman: false,
    });
    const home = createClub(rng, {
      id: 'home',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket',
      colors: COLORS,
      leagueTier: 'rookie',
      isHuman: true,
    });
    return createGameSession(away, home, 1994);
  };

  it('gives a calm default cue telling new players to press Throw Pitch when pitching and Next Pitch when batting', () => {
    const session = makeSession();

    // TOP 1: human is pitching
    const pitchCue = computeLiveActionCue({
      session,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(pitchCue.kind).toBe('default_pitching');
    expect(pitchCue.turnLabel).toMatch(/your turn to pitch/i);
    expect(pitchCue.primaryButtonLabel).toMatch(/throw pitch/i);
    expect(pitchCue.suggestedAction).toBeNull();

    // BOT 1: human is batting
    const batSession = { ...session, half: 'BOT' as const };
    const batCue = computeLiveActionCue({
      session: batSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(batCue.kind).toBe('default_batting');
    expect(batCue.turnLabel).toMatch(/your turn to bat/i);
    expect(batCue.primaryButtonLabel).toMatch(/next pitch/i);
  });

  it('surfaces an urgent bullpen / mound visit cue when the human pitcher is gassed', () => {
    const session = makeSession();
    const tiredSession = {
      ...session,
      home: { ...session.home, pitcherFatigue: 72 }, // 28% endurance
    };

    const cue = computeLiveActionCue({
      session: tiredSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(cue.kind).toBe('pitcher_gassed');
    expect(cue.urgency).toBe('high');
    expect(cue.headline).toMatch(/tired|gassed/i);
    expect(cue.suggestedAction?.type).toBe('mound_visit');

    // If mound visit is already used, suggests bringing in a fresh reliever
    const cueAfterVisit = computeLiveActionCue({
      session: tiredSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: true,
    });
    expect(cueAfterVisit.kind).toBe('pitcher_gassed');
    expect(cueAfterVisit.suggestedAction?.type).toBe('bullpen_swap');
  });

  it('highlights a ready special power when Hype is charged and no power is armed yet', () => {
    const session = makeSession();
    const charged = {
      ...session,
      home: { ...session.home, hypeGauge: 100 },
    };

    const cue = computeLiveActionCue({
      session: charged,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(cue.kind).toBe('power_ready');
    expect(cue.suggestedAction?.type).toBe('arm_power');
    expect(cue.suggestedAction?.powerId).toBeTruthy();

    // Once armed, confirms the power is locked and loaded!
    const armedCue = computeLiveActionCue({
      session: charged,
      tacticalCall: 'normal',
      armedPowerId: cue.suggestedAction?.powerId ?? 'power',
      moundVisitUsed: false,
    });
    expect(armedCue.kind).toBe('power_armed');
    expect(armedCue.headline).toMatch(/armed/i);
  });

  it('surfaces a one-tap Steal window when a speedy runner is on 1B with open 2B while batting', () => {
    const session = makeSession();
    const runnerId = session.home.lineup[0].playerId;
    const fastRunner = {
      ...session.home.playersById[runnerId],
      ratings: { ...session.home.playersById[runnerId].ratings, speed: 94 },
    };
    const stealSession = {
      ...session,
      half: 'BOT' as const,
      bases: [runnerId, null, null] as [string | null, string | null, string | null],
      home: {
        ...session.home,
        playersById: { ...session.home.playersById, [runnerId]: fastRunner },
      },
    };

    const cue = computeLiveActionCue({
      session: stealSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(cue.kind).toBe('steal_opportunity');
    expect(cue.suggestedAction?.type).toBe('steal');
    expect(cue.suggestedAction?.tacticalCall).toBe('steal');
  });

  it('surfaces a Clutch Moment cue in late close innings and a Game Over cue when finished', () => {
    const session = makeSession();
    const clutchSession = {
      ...session,
      inning: 9,
      regulationInnings: 9 as const,
      half: 'BOT' as const,
      outs: 2,
      bases: [null, session.home.lineup[1].playerId, null] as [string | null, string | null, string | null],
      away: { ...session.away, score: 3 },
      home: { ...session.home, score: 2 },
    };
    const clutchCue = computeLiveActionCue({
      session: clutchSession,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(clutchCue.kind).toBe('clutch_moment');
    expect(clutchCue.urgency).toBe('high');

    const overCue = computeLiveActionCue({
      session: { ...session, status: 'completed' },
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: false,
    });
    expect(overCue.kind).toBe('game_over');
  });
});
