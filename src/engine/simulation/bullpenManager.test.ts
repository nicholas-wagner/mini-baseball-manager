import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import type { Club } from '../models/club';
import type { GameLengthInnings, PitcherRole, Player } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import { createGameSession, stepPitch } from './baseballEngine';
import {
  BULLPEN_MODE_OPTIONS,
  evaluateBullpenCall,
  hasAvailableFieldingReliever,
  rankBullpenCandidates,
} from './bullpenManager';
import type { GameSessionState } from './gameState';
import { computeLiveActionCue } from './liveActionAdvisor';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

function makeReliever(seed: number, id: string, name: string, role: PitcherRole, throws: 'L' | 'R'): Player {
  const base = createPlayer(createSeededRng(seed), { position: 'RP', tier: 'aa' });
  return {
    ...base,
    id,
    name,
    throws,
    pitcherRole: role,
    fatigue: 0,
  };
}

function makeControlledMatch(regulationInnings: GameLengthInnings = 5) {
  const rng = createSeededRng(2026093);
  const away = createClub(rng, {
    id: 'away-ai',
    city: 'Harbor',
    name: 'Foxes',
    mascot: 'Fox',
    colors: COLORS,
    leagueTier: 'aa',
    isHuman: false,
  });
  const baseHome = createClub(rng, {
    id: 'home-human',
    city: 'Sandlot',
    name: 'Comets',
    mascot: 'Rocket',
    colors: COLORS,
    leagueTier: 'aa',
    isHuman: true,
  });

  const closer = makeReliever(9101, 'rp-closer', 'Rico Vega', 'closer', 'R');
  const fireman = makeReliever(9102, 'rp-fireman', 'Maya Chen', 'fireman', 'R');
  const loogy = makeReliever(9103, 'rp-loogy', 'Sammy Cruz', 'loogy', 'L');
  const longArm = makeReliever(9104, 'rp-long', 'Bento Silva', 'long_reliever', 'R');

  const nonPen = baseHome.roster.filter((p) => !baseHome.bullpenIds.includes(p.id));
  const home: Club = {
    ...baseHome,
    roster: [...nonPen, longArm, loogy, fireman, closer],
    bullpenIds: [longArm.id, loogy.id, fireman.id, closer.id],
  };

  return { away, home, session: createGameSession(away, home, 1994, 'regular', regulationInnings) };
}

describe('3-Mode Bullpen Manager (Auto / Semi-Auto / Manual) — TASK-093', () => {
  it('exposes the 3 user-facing bullpen modes (auto, semi_auto, manual)', () => {
    expect(BULLPEN_MODE_OPTIONS.map((o) => o.id)).toEqual(['auto', 'semi_auto', 'manual']);
  });

  it('stays quiet for a fresh pitcher in normal spots and refuses to interrupt mid-count', () => {
    const { session } = makeControlledMatch(5);
    expect(evaluateBullpenCall(session, 'home')).toBeNull();

    // Even if tired, never interrupt mid-count (balls > 0 or strikes > 0)
    const midCount = {
      ...session,
      balls: 1,
      strikes: 2,
      home: { ...session.home, pitcherFatigue: 88 },
    };
    expect(evaluateBullpenCall(midCount, 'home')).toBeNull();

    // Completed game returns null
    expect(
      evaluateBullpenCall(
        { ...session, status: 'completed', home: { ...session.home, pitcherFatigue: 95 } },
        'home',
      ),
    ).toBeNull();

    // Not on defense (human is batting in BOT) returns null
    expect(
      evaluateBullpenCall(
        { ...session, half: 'BOT', home: { ...session.home, pitcherFatigue: 95 } },
        'home',
      ),
    ).toBeNull();
  });

  it('recommends a critical swap when pitcher is gassed, tiring in a jam, or getting shelled', () => {
    const { session } = makeControlledMatch(5);

    // Gassed (<= 20% endurance)
    const gassed = evaluateBullpenCall(
      { ...session, inning: 3, home: { ...session.home, pitcherFatigue: 84 } },
      'home',
    );
    expect(gassed?.shouldSwap).toBe(true);
    expect(gassed?.trigger).toBe('gassed');
    expect(gassed?.urgency).toBe('critical');
    expect(gassed?.headline).toMatch(/gassed|out of gas|empty/i);

    // Tiring in a jam (<= 38% endurance + runners on) -> prefers Fireman in jam
    const runnerId = session.away.lineup[0].playerId;
    const tiringJam = evaluateBullpenCall(
      {
        ...session,
        inning: 4,
        bases: [runnerId, runnerId, null],
        home: { ...session.home, score: 3, pitcherFatigue: 66 },
        away: { ...session.away, score: 2 },
      },
      'home',
    );
    expect(tiringJam?.shouldSwap).toBe(true);
    expect(tiringJam?.trigger).toBe('tiring_jam');
    expect(tiringJam?.urgency).toBe('critical');
    expect(tiringJam?.recommendedReliever.id).toBe('rp-fireman');

    // Shelled (3+ runs allowed in 5-inn game after >= 12 pitches with moderate fatigue)
    const starterId = session.home.activePitcherId;
    const shelledSession = {
      ...session,
      inning: 2,
      home: { ...session.home, pitcherFatigue: 46 },
      boxScore: {
        ...session.boxScore,
        homePitchers: {
          ...session.boxScore.homePitchers,
          [starterId]: {
            ...session.boxScore.homePitchers[starterId],
            pitchesThrown: 24,
            runsAllowed: 4,
          },
        },
      },
    };
    const shelled = evaluateBullpenCall(shelledSession, 'home');
    expect(shelled?.shouldSwap).toBe(true);
    expect(shelled?.trigger).toBe('shelled');
    expect(shelled?.shortTag).toMatch(/rough|trouble|shelled/i);
  });

  it('calls on the Closer for a 5-inning Save Spot even when the starter still has moderate endurance', () => {
    const { session } = makeControlledMatch(5);
    const starterId = session.home.activePitcherId;
    const saveSpot = {
      ...session,
      inning: 5,
      half: 'TOP' as const,
      outs: 0,
      away: { ...session.away, score: 2 },
      home: { ...session.home, score: 4, pitcherFatigue: 45 }, // 55% endurance remaining
      boxScore: {
        ...session.boxScore,
        homePitchers: {
          ...session.boxScore.homePitchers,
          [starterId]: {
            ...session.boxScore.homePitchers[starterId],
            pitchesThrown: 38,
            outsRecorded: 12,
          },
        },
      },
    };

    const rec = evaluateBullpenCall(saveSpot, 'home');
    expect(rec?.shouldSwap).toBe(true);
    expect(rec?.trigger).toBe('save_spot');
    expect(rec?.recommendedReliever.id).toBe('rp-closer');
    expect(rec?.shortTag).toMatch(/save/i);
    expect(rec?.autoCommentary).toContain('Rico Vega');
  });

  it('ranks bullpen candidates with Coach Pick first, role tags, OVR, freshness, and platoon edge', () => {
    const { session } = makeControlledMatch(5);
    const saveSession = {
      ...session,
      inning: 5,
      half: 'TOP' as const,
      away: { ...session.away, score: 2 },
      home: { ...session.home, score: 3 },
    };

    const ranked = rankBullpenCandidates(saveSession, 'home');
    expect(ranked).toHaveLength(4);
    expect(ranked[0].player.id).toBe('rp-closer');
    expect(ranked[0].isRecommended).toBe(true);
    expect(ranked[0].fitTag).toMatch(/save/i);
    expect(ranked[0].freshnessPct).toBe(100);
    expect(ranked.slice(1).every((c) => !c.isRecommended)).toBe(true);
  });

  it('covers tiring (no jam), late_jam (semi-auto vs auto suppression), platoon tags, and empty-pen edge cases', () => {
    const { session } = makeControlledMatch(5);
    const runnerId = session.away.lineup[0].playerId;
    const starterId = session.home.activePitcherId;

    // Tiring without jam (endurance = 26% -> tiring trigger)
    const tiring = evaluateBullpenCall(
      { ...session, inning: 3, home: { ...session.home, pitcherFatigue: 74 } },
      'home',
    );
    expect(tiring?.trigger).toBe('tiring');
    expect(tiring?.shortTag).toMatch(/tired/i);

    // Late jam (endurance = 49% -> prompts in Semi-Auto, suppressed in Auto since > 46%)
    const lateJamSession: GameSessionState = {
      ...session,
      inning: 4,
      bases: [runnerId, null, null],
      away: { ...session.away, score: 2 },
      home: { ...session.home, score: 3, pitcherFatigue: 51 },
      boxScore: {
        ...session.boxScore,
        homePitchers: {
          ...session.boxScore.homePitchers,
          [starterId]: { ...session.boxScore.homePitchers[starterId], pitchesThrown: 20 },
        },
      },
    };
    expect(evaluateBullpenCall(lateJamSession, 'home', false)?.trigger).toBe('late_jam');
    expect(evaluateBullpenCall(lateJamSession, 'home', true)).toBeNull();

    // Ranking while batting (off-defense) & against LHB / Switch hitters
    const lhbBatterId = session.away.lineup[0].playerId;
    const lhbSession: GameSessionState = {
      ...session,
      inning: 2,
      half: 'TOP',
      away: {
        ...session.away,
        playersById: {
          ...session.away.playersById,
          [lhbBatterId]: { ...session.away.playersById[lhbBatterId], bats: 'L' },
        },
      },
    };
    const rankedL = rankBullpenCandidates(lhbSession, 'home');
    expect(rankedL.some((c) => c.fitTag === 'L vs L Edge')).toBe(true);
    expect(rankedL.some((c) => c.fitTag === 'Long Arm')).toBe(true);
    expect(rankedL.some((c) => c.platoonEdge === 'favorable')).toBe(true);
    expect(rankedL.some((c) => c.platoonEdge === 'tough')).toBe(true);

    // Off-defense ranking (while batting in BOT) still ranks cleanly
    const battingRanked = rankBullpenCandidates({ ...lhbSession, half: 'BOT' }, 'home');
    expect(battingRanked).toHaveLength(4);

    // Empty bullpen returns empty list and false for hasAvailableFieldingReliever
    const emptyPenSession: GameSessionState = {
      ...session,
      home: { ...session.home, usedPitcherIds: [...session.home.usedPitcherIds, ...session.home.bullpenIds] },
    };
    expect(rankBullpenCandidates(emptyPenSession, 'home')).toEqual([]);
    expect(hasAvailableFieldingReliever(session)).toBe(true);
    expect(hasAvailableFieldingReliever(emptyPenSession)).toBe(false);
  });

  it('respects bullpenMode in stepPitch: Manual and Semi-Auto never auto-yank human pitchers, Auto swaps smoothly, and AI always auto-manages', () => {
    const { session } = makeControlledMatch(5);
    const gassedHumanPitching: GameSessionState = {
      ...session,
      inning: 3,
      half: 'TOP',
      home: { ...session.home, pitcherFatigue: 95 },
    };

    // Advance until PA finishes (0-0 count on next batter) under manual mode -> human starter stays in!
    let curManual: GameSessionState = gassedHumanPitching;
    for (let i = 0; i < 12 && curManual.status === 'in_progress'; i += 1) {
      const step = stepPitch(curManual, 'normal', { bullpenMode: 'manual' });
      expect(step.events.some((e) => e.type === 'pitching_change')).toBe(false);
      curManual = step.nextSession;
      if (curManual.balls === 0 && curManual.strikes === 0) break;
    }
    expect(curManual.home.activePitcherId).toBe(session.home.activePitcherId);

    // Semi-Auto also does NOT silently pull human pitcher (lets UI prompt 1-tap approval)
    let curSemi: GameSessionState = gassedHumanPitching;
    for (let i = 0; i < 12 && curSemi.status === 'in_progress'; i += 1) {
      const step = stepPitch(curSemi, 'normal', { bullpenMode: 'semi_auto' });
      expect(step.events.some((e) => e.type === 'pitching_change')).toBe(false);
      curSemi = step.nextSession;
      if (curSemi.balls === 0 && curSemi.strikes === 0) break;
    }
    expect(curSemi.home.activePitcherId).toBe(session.home.activePitcherId);

    // Auto mode DOES automatically swap the gassed human pitcher cleanly on batter boundary!
    let curAuto: GameSessionState = gassedHumanPitching;
    let sawHumanAutoSwap = false;
    for (let i = 0; i < 12 && curAuto.status === 'in_progress'; i += 1) {
      const step = stepPitch(curAuto, 'normal', { bullpenMode: 'auto' });
      if (step.events.some((e) => e.type === 'pitching_change')) {
        sawHumanAutoSwap = true;
      }
      curAuto = step.nextSession;
      if (sawHumanAutoSwap) break;
    }
    expect(sawHumanAutoSwap).toBe(true);
    expect(curAuto.home.activePitcherId).not.toBe(session.home.activePitcherId);

    // AI opponent ALWAYS auto-manages its own bullpen even when human selects manual mode!
    const gassedAiPitching: GameSessionState = {
      ...session,
      inning: 3,
      half: 'BOT',
      away: { ...session.away, pitcherFatigue: 95 },
    };
    let curAi: GameSessionState = gassedAiPitching;
    let sawAiSwap = false;
    for (let i = 0; i < 12 && curAi.status === 'in_progress'; i += 1) {
      const step = stepPitch(curAi, 'normal', { bullpenMode: 'manual' });
      if (step.events.some((e) => e.type === 'pitching_change')) {
        sawAiSwap = true;
      }
      curAi = step.nextSession;
      if (sawAiSwap) break;
    }
    expect(sawAiSwap).toBe(true);
    expect(curAi.away.activePitcherId).not.toBe(session.away.activePitcherId);
  });

  it('suppresses nagging tired-pitcher manual alert in computeLiveActionCue when bullpenMode is auto', () => {
    const { session } = makeControlledMatch(5);
    const tired = {
      ...session,
      inning: 4,
      home: { ...session.home, pitcherFatigue: 74 },
    };

    const manualCue = computeLiveActionCue({
      session: tired,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: true,
      bullpenMode: 'manual',
    });
    expect(manualCue.kind).toBe('pitcher_gassed');
    expect(manualCue.suggestedAction?.type).toBe('bullpen_swap');

    const autoCue = computeLiveActionCue({
      session: tired,
      tacticalCall: 'normal',
      armedPowerId: null,
      moundVisitUsed: true,
      bullpenMode: 'auto',
    });
    expect(autoCue.kind).not.toBe('pitcher_gassed');
  });
});
