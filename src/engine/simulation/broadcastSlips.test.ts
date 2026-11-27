import { describe, expect, it } from 'vitest';
import { createClub } from '../gm/rosterFactory';
import type { PlayEvent } from '../models/playEvent';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession } from './baseballEngine';
import { buildBroadcastStatSlip } from './broadcastSlips';
import { getCurrentBatter, getCurrentPitcher } from './gameState';

function makeFixture(options?: { awayIsBoss?: boolean }) {
  const awayClub = createClub(createSeededRng(5101), {
    id: 'away-club',
    isHuman: false,
    city: options?.awayIsBoss ? 'Ironwood' : 'Maple',
    name: options?.awayIsBoss ? 'Knights' : 'Lumberjacks',
    mascot: 'Hawk',
    colors: { primary: '#5A4AE3', secondary: '#181B2C', accent: '#00E5FF', monogram: 'IK' },
    leagueTier: 'rookie',
  });
  const homeClub = createClub(createSeededRng(5102), {
    id: 'home-club',
    isHuman: true,
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket Dog',
    colors: { primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', monogram: 'SC' },
    leagueTier: 'rookie',
  });
  const session = createGameSession(awayClub, homeClub, 5103, 'regular', 5);
  return { awayClub, homeClub, session };
}

function makeEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 12,
    type: 'ball_in_play',
    inning: 1,
    half: 'TOP',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    isClutchMoment: false,
    commentary: 'Play result',
    ...overrides,
  };
}

describe('90s TV Broadcast Lower-Third Stat Slips (TASK-120)', () => {
  it('builds a new at-bat batter lower-third on 0-0 count with AVG/OPS, build identity, and Boss badge', () => {
    const { awayClub, homeClub, session } = makeFixture({ awayIsBoss: true });
    const batter = getCurrentBatter(session);

    // Give batter season stats & spent SP build identity
    const boostedBatter = {
      ...batter,
      formState: 'hot' as const,
      unlockedSkillIds: ['b_pwr_1', 'b_pwr_2', 'cap_moonshot_bomb'],
      seasonStats: {
        ...batter.seasonStats,
        atBats: 40,
        hits: 14,
        doubles: 3,
        homeRuns: 4,
        walks: 6,
        plateAppearances: 46,
      },
    };
    const nextAwayPlayers = { ...session.away.playersById, [batter.id]: boostedBatter };
    const nextSession = {
      ...session,
      balls: 0,
      strikes: 0,
      away: { ...session.away, playersById: nextAwayPlayers },
      boxScore: {
        ...session.boxScore,
        awayBatters: {
          ...session.boxScore.awayBatters,
          [batter.id]: {
            ...session.boxScore.awayBatters[batter.id],
            plateAppearances: 3,
            atBats: 3,
            hits: 2,
            homeRuns: 1,
            rbis: 2,
          },
        },
      },
    };

    const slip = buildBroadcastStatSlip({
      session: nextSession,
      lastEvent: null,
      awayClub,
      homeClub,
    });

    expect(slip).not.toBeNull();
    expect(slip?.kind).toBe('batter_card');
    expect(slip?.kicker).toBe('BOSS SHOWDOWN');
    expect(slip?.badgeText).toBe('👑 BOSS');
    expect(slip?.title).toContain(`#${batter.jerseyNumber} ${batter.name}`);
    expect(slip?.statLine).toContain('2-3, HR, 2 RBI');
    expect(slip?.statLine).toContain('.350 AVG');
    expect(slip?.statLine).toContain('OPS');
    expect(slip?.statLine).toContain('Power Specialist');

    // Non-boss hot batter shows AT THE PLATE and 🔥 HOT badge + First AB when 0 PA
    const normalFixture = makeFixture({ awayIsBoss: false });
    const leadBatter = getCurrentBatter(normalFixture.session);
    const hotSession = {
      ...normalFixture.session,
      away: {
        ...normalFixture.session.away,
        playersById: {
          ...normalFixture.session.away.playersById,
          [leadBatter.id]: { ...leadBatter, formState: 'blazing' as const },
        },
      },
    };
    const debutSlip = buildBroadcastStatSlip({
      session: hotSession,
      lastEvent: null,
      awayClub: normalFixture.awayClub,
      homeClub: normalFixture.homeClub,
    });
    expect(debutSlip?.kicker).toBe('AT THE PLATE');
    expect(debutSlip?.badgeText).toBe('🔥 HOT');
    expect(debutSlip?.statLine).toContain('0-0 · First AB');
  });

  it('returns null mid-count on routine pitches and after game completion without a milestone', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const midCount = { ...session, balls: 1, strikes: 2 };
    const routineEvent = makeEvent({ type: 'pitch_thrown', outcome: 'called_strike', balls: 1, strikes: 2 });
    expect(
      buildBroadcastStatSlip({ session: midCount, lastEvent: routineEvent, awayClub, homeClub }),
    ).toBeNull();

    const completed = { ...session, status: 'completed' as const, balls: 0, strikes: 0 };
    expect(
      buildBroadcastStatSlip({ session: completed, lastEvent: null, awayClub, homeClub }),
    ).toBeNull();
  });

  it('prioritizes MOONSHOT! and MULTI-HR GAME! milestone flashes on home runs', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const batter = getCurrentBatter(session);

    const oneHrSession = {
      ...session,
      boxScore: {
        ...session.boxScore,
        awayBatters: {
          ...session.boxScore.awayBatters,
          [batter.id]: {
            ...session.boxScore.awayBatters[batter.id],
            plateAppearances: 2,
            atBats: 2,
            hits: 1,
            homeRuns: 1,
            rbis: 2,
          },
        },
      },
    };
    const hrEvent = makeEvent({
      seq: 31,
      outcome: 'home_run',
      batterId: batter.id,
      half: 'TOP',
    });
    const oneHrSlip = buildBroadcastStatSlip({
      session: oneHrSession,
      lastEvent: hrEvent,
      awayClub,
      homeClub,
    });
    expect(oneHrSlip?.kind).toBe('milestone');
    expect(oneHrSlip?.kicker).toBe('MOONSHOT!');
    expect(oneHrSlip?.title).toContain(batter.name);
    expect(oneHrSlip?.statLine).toContain('1-2, HR, 2 RBI');

    const multiHrSession = {
      ...oneHrSession,
      boxScore: {
        ...oneHrSession.boxScore,
        awayBatters: {
          ...oneHrSession.boxScore.awayBatters,
          [batter.id]: {
            ...oneHrSession.boxScore.awayBatters[batter.id],
            plateAppearances: 3,
            atBats: 3,
            hits: 2,
            homeRuns: 2,
            rbis: 4,
          },
        },
      },
    };
    const multiHrSlip = buildBroadcastStatSlip({
      session: multiHrSession,
      lastEvent: { ...hrEvent, seq: 44 },
      awayClub,
      homeClub,
    });
    expect(multiHrSlip?.kicker).toBe('MULTI-HR GAME!');
    expect(multiHrSlip?.statLine).toContain('2-3, 2 HR, 4 RBI');
  });

  it('triggers HR ROBBED AT THE WALL!, WEB GEM!, and PICKED OFF! highlight slips', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const cfSlot = session.home.lineup.find((s) => s.defensivePosition === 'CF') ?? session.home.lineup[0];
    const fielder = session.home.playersById[cfSlot.playerId];
    const pitcher = getCurrentPitcher(session);

    const robberySlip = buildBroadcastStatSlip({
      session,
      lastEvent: makeEvent({
        seq: 51,
        outcome: 'fly_out',
        half: 'TOP',
        fieldingHighlight: {
          fielderId: fielder.id,
          fielderPos: 'CF',
          anim: 'field_high_jump',
          robbedHomeRun: true,
          webGem: true,
        },
      }),
      awayClub,
      homeClub,
    });
    expect(robberySlip?.kind).toBe('milestone');
    expect(robberySlip?.kicker).toBe('HR ROBBED AT THE WALL!');
    expect(robberySlip?.title).toContain(fielder.name);
    expect(robberySlip?.title).toContain('CF');

    const webGemSlip = buildBroadcastStatSlip({
      session,
      lastEvent: makeEvent({
        seq: 52,
        outcome: 'line_out',
        half: 'TOP',
        fieldingHighlight: {
          fielderId: fielder.id,
          fielderPos: 'SS',
          anim: 'field_dive',
          webGem: true,
        },
      }),
      awayClub,
      homeClub,
    });
    expect(webGemSlip?.kind).toBe('milestone');
    expect(webGemSlip?.kicker).toBe('WEB GEM!');
    expect(webGemSlip?.title).toContain(fielder.name);
    expect(webGemSlip?.title).toContain('SS');

    const pickoffSlip = buildBroadcastStatSlip({
      session,
      lastEvent: makeEvent({
        seq: 53,
        type: 'pickoff',
        outcome: 'pickoff_out',
        pickoffBase: 1,
        pitcherId: pitcher.id,
        half: 'TOP',
      }),
      awayClub,
      homeClub,
    });
    expect(pickoffSlip?.kind).toBe('milestone');
    expect(pickoffSlip?.kicker).toBe('PICKED OFF!');
    expect(pickoffSlip?.title).toContain(pitcher.name);
  });

  it('triggers PITCHING GEM strikeout milestones at 5, 7, and 10 Ks and career hit milestones at 1, 10, 25, 50, 100', () => {
    const { awayClub, homeClub, session } = makeFixture();
    const pitcher = getCurrentPitcher(session);
    const batter = getCurrentBatter(session);

    for (const ks of [5, 7, 10]) {
      const kSession = {
        ...session,
        boxScore: {
          ...session.boxScore,
          homePitchers: {
            ...session.boxScore.homePitchers,
            [pitcher.id]: {
              ...session.boxScore.homePitchers[pitcher.id],
              outsRecorded: ks * 2,
              strikeouts: ks,
              pitchesThrown: ks * 9,
            },
          },
        },
      };
      const kSlip = buildBroadcastStatSlip({
        session: kSession,
        lastEvent: makeEvent({
          seq: 60 + ks,
          type: 'pitch_thrown',
          outcome: 'strikeout',
          pitcherId: pitcher.id,
          half: 'TOP',
        }),
        awayClub,
        homeClub,
      });
      expect(kSlip?.kind).toBe('pitcher_spotlight');
      expect(kSlip?.kicker).toBe(`PITCHING GEM: ${ks} Ks TODAY!`);
      expect(kSlip?.title).toContain(pitcher.name);
    }

    // 6 Ks does not fire strikeout milestone
    const sixKSession = {
      ...session,
      balls: 1,
      strikes: 0,
      boxScore: {
        ...session.boxScore,
        homePitchers: {
          ...session.boxScore.homePitchers,
          [pitcher.id]: { ...session.boxScore.homePitchers[pitcher.id], strikeouts: 6 },
        },
      },
    };
    expect(
      buildBroadcastStatSlip({
        session: sixKSession,
        lastEvent: makeEvent({ seq: 71, outcome: 'strikeout', pitcherId: pitcher.id, half: 'TOP' }),
        awayClub,
        homeClub,
      }),
    ).toBeNull();

    // First career hit (0 prior + 1 today = 1) and 10th career hit (9 prior + 1 today = 10)
    for (const priorHits of [0, 9, 24, 49, 99]) {
      const totalHits = priorHits + 1;
      const hitSession = {
        ...session,
        balls: 1,
        strikes: 0,
        away: {
          ...session.away,
          playersById: {
            ...session.away.playersById,
            [batter.id]: {
              ...batter,
              careerStats: { ...batter.careerStats, hits: priorHits },
            },
          },
        },
        boxScore: {
          ...session.boxScore,
          awayBatters: {
            ...session.boxScore.awayBatters,
            [batter.id]: {
              ...session.boxScore.awayBatters[batter.id],
              plateAppearances: 1,
              atBats: 1,
              hits: 1,
            },
          },
        },
      };
      const hitSlip = buildBroadcastStatSlip({
        session: hitSession,
        lastEvent: makeEvent({
          seq: 80 + totalHits,
          outcome: 'single',
          batterId: batter.id,
          half: 'TOP',
        }),
        awayClub,
        homeClub,
      });
      expect(hitSlip?.kind).toBe('milestone');
      expect(hitSlip?.badgeText).toContain(totalHits === 1 ? '1ST HIT' : `${totalHits}TH HIT`);
    }
  });
});
