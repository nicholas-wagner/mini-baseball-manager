import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import type { PitchType } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  computeTotalRatingBudget,
  deriveArsenalExtremes,
  evaluatePitchMatchup,
  PITCH_CATALOG,
  rollBatterPitchProfile,
  rollPitcherArsenal,
  selectPitchForCount,
} from './pitchArsenals';

const FASTBALL_FAMILY: ReadonlySet<PitchType> = new Set(['four_seam', 'two_seam', 'cutter']);

describe('Pitcher Arsenals & Batter Pitch-Matchup Profiles (TASK-055)', () => {
  it('strictly enforces 2-3 pitches for RP and 4-5 pitches for SP with distinct favorite/weak pitches', () => {
    const rng = createSeededRng(2026);
    const baseRatings = {
      contact: 30,
      power: 30,
      eye: 30,
      bunt: 40,
      velocity: 74,
      movement: 72,
      control: 70,
      stamina: 68,
      speed: 55,
      fielding: 60,
      arm: 75,
      clutch: 68,
      popularity: 62,
      potential: 78,
    };

    const rpCounts = new Set<number>();
    for (let i = 0; i < 80; i += 1) {
      const rpArsenal = rollPitcherArsenal(rng, 'RP', 'flame_closer', baseRatings, 'average');
      rpCounts.add(rpArsenal.repertoire.length);
      expect(rpArsenal.repertoire.length).toBeGreaterThanOrEqual(2);
      expect(rpArsenal.repertoire.length).toBeLessThanOrEqual(3);
      const uniqueTypes = new Set(rpArsenal.repertoire.map((s) => s.pitchType));
      expect(uniqueTypes.size).toBe(rpArsenal.repertoire.length);
      expect(rpArsenal.repertoire.some((s) => FASTBALL_FAMILY.has(s.pitchType))).toBe(true);
      expect(rpArsenal.favoritePitch).not.toBe(rpArsenal.weakestPitch);
    }
    expect(rpCounts.has(2)).toBe(true);
    expect(rpCounts.has(3)).toBe(true);

    const spCounts = new Set<number>();
    for (let i = 0; i < 80; i += 1) {
      const spArsenal = rollPitcherArsenal(rng, 'SP', 'crafty_tactician', baseRatings, 'above_average');
      spCounts.add(spArsenal.repertoire.length);
      expect(spArsenal.repertoire.length).toBeGreaterThanOrEqual(4);
      expect(spArsenal.repertoire.length).toBeLessThanOrEqual(5);
      const uniqueTypes = new Set(spArsenal.repertoire.map((s) => s.pitchType));
      expect(uniqueTypes.size).toBe(spArsenal.repertoire.length);
      expect(spArsenal.repertoire.some((s) => FASTBALL_FAMILY.has(s.pitchType))).toBe(true);
      expect(spArsenal.repertoire.some((s) => !FASTBALL_FAMILY.has(s.pitchType))).toBe(true);
      expect(spArsenal.favoritePitch).not.toBe(spArsenal.weakestPitch);
    }
    expect(spCounts.has(4)).toBe(true);
    expect(spCounts.has(5)).toBe(true);

    const allStarArsenal = rollPitcherArsenal(createSeededRng(77), 'SP', 'workhorse_ace', baseRatings, 'all_star');
    const bargainArsenal = rollPitcherArsenal(createSeededRng(77), 'SP', 'balanced_regular', baseRatings, 'below_average');
    const allStarTop = allStarArsenal.repertoire.find((s) => s.pitchType === allStarArsenal.favoritePitch)!.mastery;
    const bargainTop = bargainArsenal.repertoire.find((s) => s.pitchType === bargainArsenal.favoritePitch)!.mastery;
    expect(allStarTop).toBeGreaterThan(bargainTop);
  });

  it('rolls distinct batter favoritePitch and weakPitch profiles with narrower weaknesses on rare all-stars', () => {
    const rng = createSeededRng(9911);
    const dummyRatings = createPlayer(createSeededRng(10), { position: 'CF', tier: 'aa' }).ratings;

    for (let i = 0; i < 40; i += 1) {
      const avg = rollBatterPitchProfile(rng, 'balanced_regular', dummyRatings, 'average');
      expect(avg.favoritePitch).not.toBe(avg.weakPitch);
      expect(avg.pitchRecognition[avg.favoritePitch]!).toBeGreaterThanOrEqual(10);
      expect(avg.pitchRecognition[avg.weakPitch]!).toBeLessThanOrEqual(-10);

      const star = rollBatterPitchProfile(rng, 'power_slugger', dummyRatings, 'all_star');
      expect(star.favoritePitch).not.toBe(star.weakPitch);
      expect(star.pitchRecognition[star.favoritePitch]!).toBeGreaterThanOrEqual(13);
      expect(star.pitchRecognition[star.weakPitch]!).toBeGreaterThanOrEqual(-10);
      expect(star.pitchRecognition[star.weakPitch]!).toBeLessThanOrEqual(-6);
    }
  });

  it('selects pitches strictly inside pitcher arsenal, honors valid requestedPitchType, and resists consecutive spam', () => {
    const pitcher = createPlayer(createSeededRng(101), {
      position: 'RP',
      tier: 'aa',
      specialistArchetype: 'flame_closer',
    });
    const batter = createPlayer(createSeededRng(102), {
      position: 'SS',
      tier: 'aa',
    });

    const owned = new Set(pitcher.pitchArsenal!.repertoire.map((s) => s.pitchType));
    const missingPitch = (Object.keys(PITCH_CATALOG) as PitchType[]).find((pt) => !owned.has(pt))!;
    const validPitch = pitcher.pitchArsenal!.repertoire[0].pitchType;

    expect(selectPitchForCount(createSeededRng(1), pitcher, batter, 1, 1, [], validPitch)).toBe(validPitch);
    const fallback = selectPitchForCount(createSeededRng(2), pitcher, batter, 1, 1, [], missingPitch);
    expect(owned.has(fallback)).toBe(true);

    // Non-pitcher safety fallback
    expect(selectPitchForCount(createSeededRng(3), batter, batter, 0, 0, [])).toBe('four_seam');

    // Spam resistance: after throwing validPitch twice in a row, pitcher usually mixes away from it
    let mixedCount = 0;
    const seqRng = createSeededRng(505);
    for (let i = 0; i < 60; i += 1) {
      const picked = selectPitchForCount(seqRng, pitcher, batter, 1, 2, [validPitch, validPitch]);
      expect(owned.has(picked)).toBe(true);
      if (picked !== validPitch) mixedCount += 1;
    }
    expect(mixedCount).toBeGreaterThan(35);
  });

  it('applies pitcher favorite bonus, consecutive-spam decay, weakest pitch risk, batter crush/weakness, and rating budgets', () => {
    const pitcher = createPlayer(createSeededRng(301), { position: 'SP', tier: 'aaa' });
    const batter = createPlayer(createSeededRng(302), { position: '1B', tier: 'aaa' });
    const fav = pitcher.pitchArsenal!.favoritePitch;
    const weak = pitcher.pitchArsenal!.weakestPitch;

    const freshFav = evaluatePitchMatchup(pitcher, batter, fav, 0);
    const spammedFav = evaluatePitchMatchup(pitcher, batter, fav, 3);
    const pitcherWeak = evaluatePitchMatchup(pitcher, batter, weak, 0);

    expect(freshFav.isFavoritePitch).toBe(true);
    expect(freshFav.pitcherStuffDelta).toBeGreaterThan(pitcherWeak.pitcherStuffDelta);
    expect(freshFav.pitcherControlDelta).toBeGreaterThan(pitcherWeak.pitcherControlDelta);
    expect(spammedFav.pitcherStuffDelta).toBeLessThan(freshFav.pitcherStuffDelta);
    expect(pitcherWeak.isWeakPitchForPitcher).toBe(true);

    const batterCrush = evaluatePitchMatchup(pitcher, batter, batter.batterPitchProfile.favoritePitch, 0);
    const batterHole = evaluatePitchMatchup(pitcher, batter, batter.batterPitchProfile.weakPitch, 0);
    expect(batterCrush.batterAffinity).toBe('favorite');
    expect(batterHole.batterAffinity).toBe('weak');
    expect(batterCrush.batterContactDelta).toBeGreaterThan(batterHole.batterContactDelta);
    expect(batterCrush.batterPowerDelta).toBeGreaterThan(batterHole.batterPowerDelta);
    expect(batterHole.chaseRateDelta).toBeGreaterThan(batterCrush.chaseRateDelta);

    // Fastball faster than curveball/knuckleball
    const fb = evaluatePitchMatchup(pitcher, batter, 'four_seam', 0);
    const cb = evaluatePitchMatchup(pitcher, batter, 'curveball', 0);
    expect(fb.mph).toBeGreaterThan(cb.mph);

    // Derive extremes and market-tier budgets
    const extremes = deriveArsenalExtremes([
      { pitchType: 'slider', mastery: 82 },
      { pitchType: 'four_seam', mastery: 71 },
      { pitchType: 'changeup', mastery: 52 },
    ]);
    expect(extremes).toEqual({ favoritePitch: 'slider', weakestPitch: 'changeup' });

    expect(computeTotalRatingBudget('all_star', 'CF')).toBeGreaterThan(computeTotalRatingBudget('above_average', 'CF'));
    expect(computeTotalRatingBudget('above_average', 'CF')).toBeGreaterThan(computeTotalRatingBudget('average', 'CF'));
    expect(computeTotalRatingBudget('average', 'SP')).toBeGreaterThan(computeTotalRatingBudget('below_average', 'SP'));
  });
});
