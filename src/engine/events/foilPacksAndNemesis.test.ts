import { describe, expect, it } from 'vitest';
import { createClub, createPlayer } from '../gm/rosterFactory';
import {
  evaluateNemesisMatchup,
  recordMatchupEvents,
  type NemesisHistoryMap,
} from '../league/nemesisTracker';
import { createSeededRng } from '../rng/seededRng';
import { resolveSinglePitch } from '../simulation/pitchResolver';
import { applyFoilPackRewardsToClub, openFoilBoosterPack } from './foilPacks';

const COLORS = { primary: '#E63946', secondary: '#1D3557', accent: '#FFC300', monogram: 'SC' };

describe('1994 Foil Card Booster Packs & Player-vs-Player Nemesis Grudges', () => {
  it('opens deterministic 3-card 1994 Foil Booster Packs and applies relic/cash/XP rewards to the club', () => {
    const rng = createSeededRng(1994);
    const club = createClub(rng, {
      id: 'h1',
      city: 'Sandlot',
      name: 'Comets',
      mascot: 'Rocket',
      colors: COLORS,
      leagueTier: 'rookie',
      isHuman: true,
    });
    const initialCash = club.economy.cash;
    const countRelics = (roster: typeof club.roster) =>
      roster.reduce((sum, p) => sum + (p.equippedRelicIds ?? []).length, 0);
    const initialRelics = countRelics(club.roster);

    const packA = openFoilBoosterPack(createSeededRng(4242), 'rivalry_chrome');
    const packB = openFoilBoosterPack(createSeededRng(4242), 'rivalry_chrome');
    expect(packA).toEqual(packB);
    expect(packA.cards).toHaveLength(3);
    expect(packA.cards[0].kind).toBe('relic');

    const applied = applyFoilPackRewardsToClub(club, packA);
    expect(countRelics(applied.club.roster)).toBeGreaterThan(initialRelics);
    expect(applied.club.economy.cash).toBeGreaterThanOrEqual(initialCash);
    expect(applied.summaryLines.length).toBe(3);

    // Exercise all 3 pack tiers & every middle/wildcard card branch + duplicate relic cash fallback
    let rollingClub = applied.club;
    const tiers = ['sandlot_foil', 'rivalry_chrome', 'championship_holo'] as const;
    for (let i = 0; i < 18; i += 1) {
      const opened = openFoilBoosterPack(createSeededRng(7700 + i * 19), tiers[i % tiers.length]);
      expect(opened.cards).toHaveLength(3);
      rollingClub = applyFoilPackRewardsToClub(rollingClub, opened).club;
    }
    expect(rollingClub.economy.cash).toBeGreaterThan(initialCash);

    // Explicitly verify duplicate-relic fallback ($1,000) when every roster player's relic slots are full
    const fullClub = {
      ...club,
      roster: club.roster.map((p) => ({ ...p, equippedRelicIds: ['pine_tar_rag', 'lucky_gum'] })),
    };
    const dupApplied = applyFoilPackRewardsToClub(fullClub, {
      tier: 'sandlot_foil',
      tierLabel: '1994 Sandlot Foil Pack',
      cards: [
        { slot: 1, kind: 'relic', rarity: 'common', title: 'Test Relic', subtitle: 'Sub', relicId: 'pine_tar_rag' },
        { slot: 2, kind: 'hype_ticket', rarity: 'common', title: '+15 Hype', subtitle: 'Sub', hypeBonus: 15 },
        { slot: 3, kind: 'training_xp', rarity: 'rare', title: 'Cage Pass', subtitle: 'Sub', xpBonus: 60, spBonus: 1 },
      ],
    });
    const spBefore = fullClub.roster.reduce((sum, p) => sum + p.skillPoints, 0);
    const spAfter = dupApplied.club.roster.reduce((sum, p) => sum + p.skillPoints, 0);
    expect(dupApplied.club.economy.cash).toBe(fullClub.economy.cash + 1000);
    expect(dupApplied.club.economy.teamHype).toBeGreaterThan(fullClub.economy.teamHype);
    expect(spAfter).toBeGreaterThanOrEqual(spBefore + 1);
  });

  it('tracks head-to-head Nemesis history and applies real combat modifiers in pitchResolver', () => {
    let history: NemesisHistoryMap = {};
    history = recordMatchupEvents(history, [
      {
        seq: 1,
        type: 'ball_in_play',
        inning: 1,
        half: 'BOT',
        outsBefore: 0,
        outsAfter: 0,
        balls: 1,
        strikes: 1,
        awayScore: 0,
        homeScore: 1,
        basesAfter: [null, null, null],
        batterId: 'bat-1',
        pitcherId: 'pit-1',
        outcome: 'home_run',
        isClutchMoment: false,
        commentary: 'HR',
      },
      {
        seq: 2,
        type: 'ball_in_play',
        inning: 4,
        half: 'BOT',
        outsBefore: 1,
        outsAfter: 1,
        balls: 0,
        strikes: 1,
        awayScore: 0,
        homeScore: 2,
        basesAfter: [null, 'bat-1', null],
        batterId: 'bat-1',
        pitcherId: 'pit-1',
        outcome: 'double',
        isClutchMoment: true,
        commentary: '2B',
      },
    ]);

    const owns = evaluateNemesisMatchup(history, 'bat-1', 'pit-1', 'Rico Comet', 'Ace Fox');
    expect(owns?.tier).toBe('batter_owns');
    expect(owns?.batterContactDelta).toBeGreaterThan(0);
    expect(owns?.batterPowerDelta).toBeGreaterThan(0);
    expect(owns?.badgeText).toMatch(/owns/i);

    // Pitcher domination history
    let kHistory: NemesisHistoryMap = {};
    kHistory = recordMatchupEvents(kHistory, [
      {
        seq: 1,
        type: 'pitch_thrown',
        inning: 1,
        half: 'TOP',
        outsBefore: 0,
        outsAfter: 1,
        balls: 1,
        strikes: 3,
        awayScore: 0,
        homeScore: 0,
        basesAfter: [null, null, null],
        batterId: 'bat-2',
        pitcherId: 'pit-2',
        outcome: 'strikeout',
        isClutchMoment: false,
        commentary: 'K',
      },
      {
        seq: 2,
        type: 'pitch_thrown',
        inning: 4,
        half: 'TOP',
        outsBefore: 1,
        outsAfter: 2,
        balls: 0,
        strikes: 3,
        awayScore: 0,
        homeScore: 0,
        basesAfter: [null, null, null],
        batterId: 'bat-2',
        pitcherId: 'pit-2',
        outcome: 'strikeout',
        isClutchMoment: false,
        commentary: 'K',
      },
    ]);

    const dom = evaluateNemesisMatchup(kHistory, 'bat-2', 'pit-2', 'Slugger', 'Dr. K');
    expect(dom?.tier).toBe('pitcher_owns');
    expect(dom?.pitcherStuffDelta).toBeGreaterThan(0);

    // Heated grudge tier (4+ battles, split results) & below-threshold null checks
    let grudgeHistory: NemesisHistoryMap = {};
    const makePa = (seq: number, outcome: 'single' | 'ground_out' | 'walk' | 'strikeout') => ({
      seq,
      type: 'ball_in_play' as const,
      inning: seq,
      half: 'TOP' as const,
      outsBefore: 0,
      outsAfter: outcome === 'ground_out' || outcome === 'strikeout' ? 1 : 0,
      balls: 1,
      strikes: 1,
      awayScore: 0,
      homeScore: 0,
      basesAfter: [null, null, null] as [null, null, null],
      batterId: 'bat-3',
      pitcherId: 'pit-3',
      outcome,
      isClutchMoment: false,
      commentary: outcome,
    });
    grudgeHistory = recordMatchupEvents(grudgeHistory, [
      makePa(1, 'single'),
      makePa(2, 'ground_out'),
    ]);
    expect(evaluateNemesisMatchup(grudgeHistory, 'bat-3', 'pit-3', 'A', 'B')).toBeNull();
    expect(evaluateNemesisMatchup(grudgeHistory, 'nobody', 'pit-3', 'A', 'B')).toBeNull();
    grudgeHistory = recordMatchupEvents(grudgeHistory, [
      makePa(3, 'walk'),
      makePa(4, 'strikeout'),
      { ...makePa(5, 'single'), outcome: undefined },
    ]);
    const grudge = evaluateNemesisMatchup(grudgeHistory, 'bat-3', 'pit-3', 'Rival Bat', 'Rival Arm');
    expect(grudge?.tier).toBe('heated_grudge');
    expect(grudge?.batterContactDelta).toBeGreaterThan(0);
    expect(grudge?.pitcherStuffDelta).toBeGreaterThan(0);

    // Confirm nemesis modifier flows through resolveSinglePitch & mathBreakdown
    const rng = createSeededRng(1004);
    const res = resolveSinglePitch({
      rng,
      batter: createPlayer(rng, { position: 'RF', tier: 'aa' }),
      pitcher: createPlayer(rng, { position: 'SP', tier: 'aa' }),
      catcher: createPlayer(rng, { position: 'C', tier: 'aa' }),
      defender: createPlayer(rng, { position: 'CF', tier: 'aa' }),
      defenderPos: 'CF',
      firstBaseRunner: null,
      balls: 1,
      strikes: 1,
      outs: 1,
      inning: 7,
      pitchingLead: 0,
      bases: [null, null, null],
      pitcherFatigue: 15,
      battingHype: 30,
      fieldingHype: 30,
      canBatterTriggerSpecial: false,
      canPitcherTriggerSpecial: false,
      leverageIndex: 1.5,
      tacticalCall: 'normal',
      atBatPitchHistory: [],
      nemesisBonus: owns ?? undefined,
    });
    expect(res.mathBreakdown?.activeModifiers.some((m) => /nemesis|owns/i.test(m))).toBe(true);
  });
});
