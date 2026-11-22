import { describe, expect, it } from 'vitest';
import { createPlayer } from '../gm/rosterFactory';
import { ALL_PITCH_TYPES } from '../models/player';
import { createSeededRng } from '../rng/seededRng';
import {
  applyTrainingDrill,
  computeCoreRatingSum,
  enforceRatingBudget,
  previewTrainingDrill,
} from './trainingCompromises';

describe('Compromise-First Training Engine (TASK-056)', () => {
  it('enforces concrete trade-offs on batting, speed, velocity, and command drills inside statCaps and totalRatingBudget', () => {
    const hitter = createPlayer(createSeededRng(101), {
      position: 'LF',
      tier: 'aa',
      marketTier: 'average',
    });
    const pitcher = createPlayer(createSeededRng(102), {
      position: 'SP',
      tier: 'aa',
      marketTier: 'average',
    });

    // Power Launch Cage: +Power, -Contact/Eye, +Fatigue
    const powerPreview = previewTrainingDrill(hitter, { drillId: 'power_launch_cage' });
    expect(powerPreview.allowed).toBe(true);
    expect(powerPreview.gains.length).toBeGreaterThan(0);
    expect(powerPreview.compromises.length).toBeGreaterThan(0);
    const powerRes = applyTrainingDrill(createSeededRng(1), hitter, { drillId: 'power_launch_cage' });
    expect(powerRes.trained).toBe(true);
    expect(powerRes.player.ratings.power).toBeGreaterThanOrEqual(hitter.ratings.power);
    expect(powerRes.player.ratings.contact).toBeLessThan(hitter.ratings.contact);
    expect(powerRes.player.fatigue).toBeGreaterThan(hitter.fatigue);

    // Contact Choke-Up Cage: +Contact/+Eye, -Power
    const contactRes = applyTrainingDrill(createSeededRng(2), hitter, { drillId: 'contact_choke_up' });
    expect(contactRes.trained).toBe(true);
    expect(contactRes.player.ratings.contact).toBeGreaterThanOrEqual(hitter.ratings.contact);
    expect(contactRes.player.ratings.power).toBeLessThan(hitter.ratings.power);

    // Speed Track: +Speed/+Bunt, -Power
    const speedRes = applyTrainingDrill(createSeededRng(3), hitter, { drillId: 'speed_sprint_track' });
    expect(speedRes.trained).toBe(true);
    expect(speedRes.player.ratings.speed).toBeGreaterThanOrEqual(hitter.ratings.speed);
    expect(speedRes.player.ratings.power).toBeLessThan(hitter.ratings.power);

    // Velocity Conditioning: +Velocity/+Arm, -Control
    const veloRes = applyTrainingDrill(createSeededRng(4), pitcher, { drillId: 'velocity_conditioning' });
    expect(veloRes.trained).toBe(true);
    expect(veloRes.player.ratings.velocity).toBeGreaterThanOrEqual(pitcher.ratings.velocity);
    expect(veloRes.player.ratings.control).toBeLessThan(pitcher.ratings.control);

    // Command Pinpoint: +Control, -Velocity
    const cmdRes = applyTrainingDrill(createSeededRng(5), pitcher, { drillId: 'command_pinpoint' });
    expect(cmdRes.trained).toBe(true);
    expect(cmdRes.player.ratings.control).toBeGreaterThanOrEqual(pitcher.ratings.control);
    expect(cmdRes.player.ratings.velocity).toBeLessThan(pitcher.ratings.velocity);

    // Repeated training never allows an average player to exceed totalRatingBudget
    let trainedHitter = { ...hitter, fatigue: 0 };
    const loopRng = createSeededRng(77);
    for (let i = 0; i < 15; i += 1) {
      const next = applyTrainingDrill(loopRng, { ...trainedHitter, fatigue: 0 }, {
        drillId: i % 2 === 0 ? 'power_launch_cage' : 'contact_choke_up',
      });
      trainedHitter = next.player;
      expect(computeCoreRatingSum(trainedHitter)).toBeLessThanOrEqual(trainedHitter.totalRatingBudget);
      expect(trainedHitter.ratings.power).toBeLessThanOrEqual(trainedHitter.statCaps.power);
      expect(trainedHitter.ratings.contact).toBeLessThanOrEqual(trainedHitter.statCaps.contact);
    }

    // Rare All-Star carries a clearly higher budget envelope than average player
    const allStar = createPlayer(createSeededRng(103), {
      position: 'LF',
      tier: 'aa',
      marketTier: 'all_star',
    });
    expect(allStar.totalRatingBudget).toBeGreaterThan(hitter.totalRatingBudget);
    const trimmed = enforceRatingBudget(
      { ...hitter.ratings, contact: 95, power: 95, eye: 95, bunt: 95, speed: 95, fielding: 95, arm: 95 },
      hitter.position,
      hitter.totalRatingBudget,
      'power',
    );
    expect(computeCoreRatingSum({ position: hitter.position, ratings: trimmed })).toBeLessThanOrEqual(
      hitter.totalRatingBudget,
    );
  });

  it('trains batter pitch recognition with timing drift on neglected pitches and rejects mismatched or exhausted players', () => {
    const hitter = createPlayer(createSeededRng(201), { position: 'SS', tier: 'aa' });
    const weakPitch = hitter.batterPitchProfile.weakPitch;
    const beforeWeak = hitter.batterPitchProfile.pitchRecognition[weakPitch] ?? -12;

    const drill = applyTrainingDrill(createSeededRng(202), hitter, {
      drillId: 'batter_pitch_recognition',
      targetPitch: weakPitch,
    });
    expect(drill.trained).toBe(true);
    const afterWeak = drill.player.batterPitchProfile.pitchRecognition[weakPitch]!;
    expect(afterWeak).toBeGreaterThan(beforeWeak);

    // At least one other pitch suffered timing drift
    const drifted = Object.entries(hitter.batterPitchProfile.pitchRecognition).some(
      ([pt, val]) => pt !== weakPitch && (drill.player.batterPitchProfile.pitchRecognition[pt as typeof weakPitch] ?? 0) < (val ?? 0),
    );
    expect(drifted).toBe(true);

    // Exhausted players cannot train
    const exhausted = { ...hitter, fatigue: 90 };
    expect(applyTrainingDrill(createSeededRng(203), exhausted, { drillId: 'power_launch_cage' }).trained).toBe(false);
    // Role mismatch rejected
    expect(applyTrainingDrill(createSeededRng(204), hitter, { drillId: 'velocity_conditioning' }).trained).toBe(false);
    // Missing targetPitch rejected
    expect(applyTrainingDrill(createSeededRng(205), hitter, { drillId: 'batter_pitch_recognition' }).trained).toBe(false);
  });

  it('polishes pitcher weak pitches with arsenal rust and learns/replaces pitches strictly within 2-3 RP and 4-5 SP caps', () => {
    const sp = createPlayer(createSeededRng(301), { position: 'SP', tier: 'aa' });
    const weakPitch = sp.pitchArsenal!.weakestPitch;
    const beforeWeakMastery = sp.pitchArsenal!.repertoire.find((s) => s.pitchType === weakPitch)!.mastery;

    const polished = applyTrainingDrill(createSeededRng(302), sp, {
      drillId: 'bullpen_pitch_lab_polish',
      targetPitch: weakPitch,
    });
    expect(polished.trained).toBe(true);
    const afterWeakMastery = polished.player.pitchArsenal!.repertoire.find(
      (s) => s.pitchType === weakPitch,
    )!.mastery;
    expect(afterWeakMastery).toBeGreaterThan(beforeWeakMastery);
    // At least one other pitch rusted
    const rusted = sp.pitchArsenal!.repertoire.some(
      (slot) =>
        slot.pitchType !== weakPitch &&
        polished.player.pitchArsenal!.repertoire.find((s) => s.pitchType === slot.pitchType)!.mastery <
          slot.mastery,
    );
    expect(rusted).toBe(true);

    // Find a 2-pitch RP and a 3-pitch RP to test learning vs cap-replacement
    let twoPitchRp = createPlayer(createSeededRng(400), { position: 'RP', tier: 'aa' });
    let threePitchRp = createPlayer(createSeededRng(401), { position: 'RP', tier: 'aa' });
    for (let s = 400; s < 500; s += 1) {
      const candidate = createPlayer(createSeededRng(s), { position: 'RP', tier: 'aa' });
      if (candidate.pitchArsenal!.repertoire.length === 2) twoPitchRp = candidate;
      if (candidate.pitchArsenal!.repertoire.length === 3) threePitchRp = candidate;
    }

    const newPitchForTwo = ALL_PITCH_TYPES.find(
      (pt) => !twoPitchRp.pitchArsenal!.repertoire.some((s) => s.pitchType === pt),
    )!;
    const learned = applyTrainingDrill(createSeededRng(450), twoPitchRp, {
      drillId: 'bullpen_pitch_lab_learn',
      targetPitch: newPitchForTwo,
    });
    expect(learned.trained).toBe(true);
    expect(learned.player.pitchArsenal!.repertoire).toHaveLength(3);
    expect(learned.player.ratings.control).toBeLessThan(twoPitchRp.ratings.control);

    // 3-pitch RP cannot add a 4th pitch without replacing an existing slot
    const newPitchForThree = ALL_PITCH_TYPES.find(
      (pt) => !threePitchRp.pitchArsenal!.repertoire.some((s) => s.pitchType === pt),
    )!;
    const blockedFourth = applyTrainingDrill(createSeededRng(451), threePitchRp, {
      drillId: 'bullpen_pitch_lab_learn',
      targetPitch: newPitchForThree,
    });
    expect(blockedFourth.trained).toBe(false);

    // Replacing weakestPitch keeps RP strictly at 3 pitches
    const replaced = applyTrainingDrill(createSeededRng(452), threePitchRp, {
      drillId: 'bullpen_pitch_lab_learn',
      targetPitch: newPitchForThree,
      replacePitchType: threePitchRp.pitchArsenal!.weakestPitch,
    });
    expect(replaced.trained).toBe(true);
    expect(replaced.player.pitchArsenal!.repertoire).toHaveLength(3);
    expect(
      replaced.player.pitchArsenal!.repertoire.some((s) => s.pitchType === newPitchForThree),
    ).toBe(true);

    // Pitcher cannot run batter drills, and polishing unowned pitch fails
    expect(applyTrainingDrill(createSeededRng(453), sp, { drillId: 'power_launch_cage' }).trained).toBe(false);
    expect(
      applyTrainingDrill(createSeededRng(454), threePitchRp, {
        drillId: 'bullpen_pitch_lab_polish',
        targetPitch: newPitchForThree,
      }).trained,
    ).toBe(false);
  });
});
