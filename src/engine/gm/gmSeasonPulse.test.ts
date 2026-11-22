import { describe, expect, it } from 'vitest';
import { createManagerProfile } from '../models/manager';
import { createSeededRng } from '../rng/seededRng';
import { resolveSinglePitch } from '../simulation/pitchResolver';
import {
  applySpotlightLineupMove,
  detectTiredScheduledStarter,
  evaluateGameplanEffects,
  evaluatePromotionChase,
  evaluateRosterSpotlight,
  resolveGmInboxDecision,
  rollGmInboxEvent,
  SERIES_GAMEPLAN_OPTIONS,
} from './gmSeasonPulse';
import { createClub, createPlayer } from './rosterFactory';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

describe('GM Season Pulse: Promotion Chase, Series Gameplans, Incoming Inbox Events & Breakout Watch', () => {
  const makeTierClubs = () => {
    const rng = createSeededRng(1994);
    const clubs = Array.from({ length: 8 }, (_, idx) =>
      createClub(rng, {
        id: idx === 0 ? 'human' : `ai-${idx}`,
        city: idx === 0 ? 'Sandlot' : `City ${idx}`,
        name: idx === 0 ? 'Comets' : `Club ${idx}`,
        mascot: 'Mascot',
        colors: COLORS,
        leagueTier: 'rookie',
        isHuman: idx === 0,
      }),
    );
    return clubs;
  };

  it('evaluates live Promotion Chase rank, games behind, playoff/relegation zones, and Season Owner Goal', () => {
    const clubs = makeTierClubs();
    const withStandings = clubs.map((c, idx) => ({
      ...c,
      wins: idx === 0 ? 11 : idx === 1 ? 13 : Math.max(2, 10 - idx),
      losses: idx === 0 ? 4 : idx === 1 ? 2 : Math.min(13, 5 + idx),
    }));

    const chase = evaluatePromotionChase(withStandings, 'human', 5);
    expect(chase.rank).toBe(2);
    expect(chase.zone).toBe('playoff_spot');
    expect(chase.gamesBehindFirst).toBe(2);
    expect(chase.ownerGoalCompleted).toBe(true);
    expect(chase.nextTierRewardText).toMatch(/LOW-A/i);

    // 3rd place + Majors tier World Series reward text
    const majorsThird = clubs.map((c, idx) => ({
      ...c,
      leagueTier: 'majors' as const,
      wins: idx === 0 ? 10 : idx <= 2 ? 12 : 4,
      losses: idx === 0 ? 5 : idx <= 2 ? 3 : 11,
    }));
    const majorsChase = evaluatePromotionChase(majorsThird, 'human', 5);
    expect(majorsChase.rank).toBe(3);
    expect(majorsChase.headline).toMatch(/3rd/i);
    expect(majorsChase.nextTierRewardText).toMatch(/world champions/i);

    // 1st place check
    const firstPlace = clubs.map((c, idx) => ({
      ...c,
      wins: idx === 0 ? 15 : 5,
      losses: idx === 0 ? 0 : 10,
    }));
    expect(evaluatePromotionChase(firstPlace, 'human', 5).zone).toBe('first_place');

    // Bubble (5th) & Relegation (8th) checks
    const bubbleClubs = clubs.map((c, idx) => ({
      ...c,
      wins: idx === 0 ? 5 : idx < 5 ? 9 : 2,
      losses: idx === 0 ? 10 : idx < 5 ? 6 : 13,
    }));
    expect(evaluatePromotionChase(bubbleClubs, 'human', 5).zone).toBe('bubble');

    const lastClubs = clubs.map((c, idx) => ({
      ...c,
      wins: idx === 0 ? 1 : 10,
      losses: idx === 0 ? 14 : 5,
    }));
    expect(evaluatePromotionChase(lastClubs, 'human', 5).zone).toBe('relegation_danger');
  });

  it('provides 4 trade-off Series Gameplans wired into pitchResolver math & detects tired scheduled starters', () => {
    expect(SERIES_GAMEPLAN_OPTIONS).toHaveLength(4);
    const fences = evaluateGameplanEffects('swing_fences');
    const smallBall = evaluateGameplanEffects('small_ball');
    const lockdown = evaluateGameplanEffects('bullpen_lockdown');
    expect(fences.batterPowerDelta).toBeGreaterThan(0);
    expect(fences.batterContactDelta).toBeLessThan(0);
    expect(smallBall.batterContactDelta).toBeGreaterThan(0);
    expect(smallBall.batterPowerDelta).toBeLessThan(0);
    expect(lockdown.pitcherControlDelta).toBeGreaterThan(0);
    expect(evaluateGameplanEffects('balanced').label).toBe('');

    // Statistical verification in resolveSinglePitch + mathBreakdown modifier tag
    const rng = createSeededRng(2026);
    const rawBatter = createPlayer(rng, { position: 'RF', tier: 'aa' });
    const batter = {
      ...rawBatter,
      ratings: { ...rawBatter.ratings, contact: 76, power: 82 },
    };
    const pitcher = createPlayer(rng, { position: 'SP', tier: 'aa' });
    const catcher = createPlayer(rng, { position: 'C', tier: 'aa' });
    const defender = createPlayer(rng, { position: 'CF', tier: 'aa' });
    const baseCtx = {
      batter,
      pitcher,
      catcher,
      defender,
      defenderPos: 'CF' as const,
      firstBaseRunner: null,
      balls: 1,
      strikes: 1,
      outs: 1,
      inning: 4,
      pitchingLead: 0,
      bases: [null, null, null] as [null, null, null],
      pitcherFatigue: 15,
      battingHype: 30,
      fieldingHype: 30,
      canBatterTriggerSpecial: false,
      canPitcherTriggerSpecial: false,
      leverageIndex: 1.0,
      tacticalCall: 'normal' as const,
      atBatPitchHistory: [] as const,
      requestedPitchType: 'four_seam' as const,
    };

    let hrsFences = 0;
    let hrsSmall = 0;
    let sawTag = false;
    for (let i = 0; i < 1600; i += 1) {
      const rF = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(81000 + i),
        battingGameplan: 'swing_fences',
      });
      const rS = resolveSinglePitch({
        ...baseCtx,
        rng: createSeededRng(81000 + i),
        battingGameplan: 'small_ball',
      });
      if (rF.outcome === 'home_run') hrsFences += 1;
      if (rS.outcome === 'home_run') hrsSmall += 1;
      if (rF.mathBreakdown?.activeModifiers.some((m) => /swing for the fences/i.test(m))) {
        sawTag = true;
      }
    }
    expect(hrsFences).toBeGreaterThan(hrsSmall);
    expect(sawTag).toBe(true);

    // Tired scheduled starter alert
    const clubs = makeTierClubs();
    const club = clubs[0];
    const scheduledId = club.rotationIds[club.rotationCursor % club.rotationIds.length];
    const tiredClub = {
      ...club,
      roster: club.roster.map((p) =>
        p.id === scheduledId ? { ...p, fatigue: 62 } : { ...p, fatigue: 10 },
      ),
    };
    const alert = detectTiredScheduledStarter(tiredClub);
    expect(alert).not.toBeNull();
    expect(alert?.tiredStarter.id).toBe(scheduledId);
    expect(alert?.fresherStarter.id).not.toBe(scheduledId);
    expect(detectTiredScheduledStarter(club)).toBeNull();
  });

  it('generates and resolves both Incoming AI Trade Offers and Clubhouse Trade-Off Dilemmas cleanly', () => {
    const clubs = makeTierClubs();
    const manager = createManagerProfile({ name: 'Skip', avatarSeed: 1994 });

    let tradeEvent = null;
    let dilemmaEvent = null;
    for (let s = 1; s <= 40; s += 1) {
      const ev = rollGmInboxEvent(createSeededRng(s * 37), clubs, 'human', s);
      if (ev.kind === 'ai_trade_offer' && !tradeEvent) tradeEvent = ev;
      if (ev.kind === 'clubhouse_dilemma' && !dilemmaEvent) dilemmaEvent = ev;
    }
    expect(tradeEvent).not.toBeNull();
    expect(dilemmaEvent).not.toBeNull();

    // Accepting AI trade swaps players cleanly between human & rival club
    const accepted = resolveGmInboxDecision(clubs, 'human', manager, tradeEvent!, 0);
    const newHuman = accepted.clubs.find((c) => c.id === 'human')!;
    const oldOfferedId = tradeEvent!.tradePayload!.humanGivesPlayerId;
    const incomingId = tradeEvent!.tradePayload!.rivalGivesPlayerId;
    expect(newHuman.roster.some((p) => p.id === incomingId)).toBe(true);
    expect(newHuman.roster.some((p) => p.id === oldOfferedId)).toBe(false);
    expect(accepted.summary).toMatch(/trade complete/i);

    // Declining trade keeps roster intact & bumps morale
    const declined = resolveGmInboxDecision(clubs, 'human', manager, tradeEvent!, 1);
    expect(declined.clubs.find((c) => c.id === 'human')!.roster.some((p) => p.id === oldOfferedId)).toBe(
      true,
    );

    // Resolving all 3 dilemma kinds across both choices applies concrete effects cleanly
    const seenDilemmas = new Set<string>();
    for (let s = 1; s <= 60; s += 1) {
      const ev = rollGmInboxEvent(createSeededRng(s * 97), clubs, 'human', s);
      if (ev.kind === 'clubhouse_dilemma' && ev.dilemmaId && !seenDilemmas.has(ev.dilemmaId)) {
        seenDilemmas.add(ev.dilemmaId);
        expect(resolveGmInboxDecision(clubs, 'human', manager, ev, 0).summary.length).toBeGreaterThan(5);
        expect(resolveGmInboxDecision(clubs, 'human', manager, ev, 1).summary.length).toBeGreaterThan(5);
      }
    }
    expect(seenDilemmas.size).toBe(3);

    // Guard check when already leading off
    expect(applySpotlightLineupMove(clubs[0], clubs[0].lineup[0].playerId).applied).toBe(false);
  });

  it('spots Hot-Hand / Breakout Watch players & cold starters and spotlights them to the top of the lineup', () => {
    const clubs = makeTierClubs();
    const club = clubs[0];
    const hitterInSlot6 = club.lineup[5].playerId;
    const coldStarterId = club.lineup[2].playerId;
    const primed = {
      ...club,
      roster: club.roster.map((p) => {
        if (p.id === hitterInSlot6) return { ...p, age: 21, level: 1, xp: 175, formScore: 22 };
        if (p.id === coldStarterId) return { ...p, formScore: -24 };
        return { ...p, xp: 0, formScore: 0 };
      }),
    };

    const watch = evaluateRosterSpotlight(primed);
    expect(watch.breakout?.player.id).toBe(hitterInSlot6);
    expect(watch.breakout?.badgeText).toMatch(/xp to lv|on fire/i);
    expect(watch.coldStarter?.id).toBe(coldStarterId);

    const spotlighted = applySpotlightLineupMove(primed, hitterInSlot6);
    expect(spotlighted.applied).toBe(true);
    expect(spotlighted.club.lineup[0].playerId).toBe(hitterInSlot6);
    expect(
      spotlighted.club.roster.find((p) => p.id === hitterInSlot6)!.xp,
    ).toBeGreaterThanOrEqual(175);

    // Hot-streak-only breakout ("ON FIRE" badge), injured skip, and quiet-roster null breakout
    const onFireOnly = {
      ...club,
      roster: club.roster.map((p, i) => ({
        ...p,
        age: 29,
        xp: 0,
        formScore: i === 2 ? 25 : 0,
        activeHealthStatus:
          i === 0
            ? {
                conditionId: 'flu',
                name: 'Flu',
                kind: 'illness' as const,
                rarity: 'common' as const,
                category: 'respiratory_viral' as const,
                gamesRemaining: 1,
                seasonEnding: false,
                canPlayThrough: true,
                playingThrough: false,
                careerEndingTriggered: false,
                statPenalties: {},
              }
            : null,
      })),
    };
    expect(evaluateRosterSpotlight(onFireOnly).breakout?.badgeText).toMatch(/on fire/i);

    const quietClub = {
      ...club,
      roster: club.roster.map((p) => ({ ...p, age: 30, xp: 0, formScore: 0 })),
    };
    expect(evaluateRosterSpotlight(quietClub).breakout).toBeNull();

    // Opening Day 0-0 standings & tied-for-1st check, plus expired-trade & tired-rotation guards
    const tiedStandings = clubs.map((c, idx) => ({
      ...c,
      wins: idx < 2 ? 5 : 2,
      losses: idx < 2 ? 2 : 5,
    }));
    const tiedChase = evaluatePromotionChase(tiedStandings, 'ai-1', 2);
    expect(tiedChase.rank).toBe(2);
    expect(tiedChase.headline).toMatch(/tied for 1st/i);
    expect(evaluatePromotionChase(clubs, 'human', 0).wins).toBe(0);

    expect(detectTiredScheduledStarter({ ...club, rotationIds: [club.rotationIds[0]] })).toBeNull();
    const allTired = {
      ...club,
      roster: club.roster.map((p) => ({ ...p, fatigue: 70 })),
    };
    expect(detectTiredScheduledStarter(allTired)).toBeNull();

    const manager = createManagerProfile({ name: 'Skip', avatarSeed: 1994 });
    const expiredTrade = {
      id: 'exp',
      kind: 'ai_trade_offer' as const,
      badge: 'TRADE',
      title: 'T',
      description: 'D',
      choices: [
        { label: 'Accept', effectHint: '' },
        { label: 'Decline', effectHint: '' },
      ] as [{ label: string; effectHint: string }, { label: string; effectHint: string }],
      tradePayload: {
        rivalClubId: 'ai-1',
        rivalClubName: 'City 1 Club 1',
        humanGivesPlayerId: 'missing-id',
        humanGivesLabel: 'Missing',
        rivalGivesPlayerId: 'missing-2',
        rivalGivesLabel: 'Missing 2',
        cashToHuman: 0,
      },
    };
    expect(resolveGmInboxDecision(clubs, 'human', manager, expiredTrade, 0).summary).toMatch(
      /expired/i,
    );
    expect(
      resolveGmInboxDecision(clubs, 'no-such-club', manager, { ...expiredTrade, kind: 'clubhouse_dilemma', tradePayload: undefined }, 0).summary,
    ).toMatch(/no club/i);
  });
});
