import { describe, expect, it } from 'vitest';
import type { AtBatOutcome, PlayEvent } from '../../engine/models/playEvent';
import {
  DIAMOND_DEFENDER_COORDS,
  choreographPlayEvent,
  interpolateBaserunnerPosition,
} from './eventChoreographer';

function buildEvent(overrides: Partial<PlayEvent>): PlayEvent {
  return {
    seq: 1,
    type: 'pitch_thrown',
    inning: 1,
    half: 'TOP',
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 0,
    homeScore: 0,
    basesAfter: [null, null, null],
    batterId: 'bat-1',
    pitcherId: 'pit-1',
    isClutchMoment: false,
    commentary: 'Pitch delivered.',
    ...overrides,
  };
}

describe('Event Choreographer & Diamond Coordinates (TASK-016)', () => {
  it('defines all 9 canonical defensive positions matching 3D ballpark landmarks', () => {
    const positions = DIAMOND_DEFENDER_COORDS.map((d) => d.pos);
    expect(positions).toEqual(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']);

    const pitcher = DIAMOND_DEFENDER_COORDS.find((d) => d.pos === 'P')!;
    const catcher = DIAMOND_DEFENDER_COORDS.find((d) => d.pos === 'C')!;
    const center = DIAMOND_DEFENDER_COORDS.find((d) => d.pos === 'CF')!;
    expect(pitcher.z).toBeCloseTo(-10.2, 1);
    expect(catcher.z).toBeGreaterThan(0);
    expect(center.z).toBeLessThan(-25);
  });

  it('interpolates baserunner coordinates cleanly along basepaths from Home -> 1B -> 2B -> 3B -> Home', () => {
    const atHome = interpolateBaserunnerPosition(0, 1, 0);
    expect(atHome.x).toBeCloseTo(0, 2);
    expect(atHome.z).toBeCloseTo(0, 2);

    const midToFirst = interpolateBaserunnerPosition(0, 1, 0.5);
    expect(midToFirst.x).toBeCloseTo(4.9, 1);
    expect(midToFirst.z).toBeCloseTo(-4.9, 1);

    const atSecondFromFirst = interpolateBaserunnerPosition(1, 2, 1);
    expect(atSecondFromFirst.x).toBeCloseTo(0, 2);
    expect(atSecondFromFirst.z).toBeCloseTo(-19.6, 1);

    const halfwayDouble = interpolateBaserunnerPosition(0, 2, 0.5);
    expect(halfwayDouble.x).toBeCloseTo(9.8, 1);
    expect(halfwayDouble.z).toBeCloseTo(-9.8, 1);
  });

  it('maps every AtBatOutcome to valid camera, animations, VFX, audio cues, and speed-scaled durations', () => {
    const allOutcomes: AtBatOutcome[] = [
      'ball',
      'called_strike',
      'swinging_strike',
      'foul',
      'walk',
      'strikeout',
      'single',
      'double',
      'triple',
      'home_run',
      'ground_out',
      'fly_out',
      'line_out',
      'double_play',
      'sac_fly',
      'fielding_error',
      'bunt_single',
      'bunt_out',
    ];

    for (const outcome of allOutcomes) {
      const event = buildEvent({
        type: outcome === 'ball' || outcome === 'called_strike' || outcome === 'swinging_strike' || outcome === 'foul' || outcome === 'walk' || outcome === 'strikeout'
          ? 'pitch_thrown'
          : 'ball_in_play',
        outcome,
      });

      const step1x = choreographPlayEvent(event, 1);
      const step2x = choreographPlayEvent(event, 2);
      const step4x = choreographPlayEvent(event, 4);

      expect(step1x.durationMs).toBeGreaterThan(step2x.durationMs);
      expect(step2x.durationMs).toBeGreaterThan(step4x.durationMs);
      expect(step1x.pitcherClip).toBeTruthy();
      expect(step1x.batterClip).toBeTruthy();
      expect(step1x.fielderClip).toBeTruthy();
    }

    const hrStep = choreographPlayEvent(
      buildEvent({ type: 'ball_in_play', outcome: 'home_run' }),
      1,
    );
    expect(hrStep.cameraPreset).toBe('broadcast_diamond');
    expect(hrStep.batterClip).toBe('bat_bomb');
    expect(hrStep.ballStyle).toBe('moonshot_hr');
    expect(hrStep.callout?.text).toMatch(/home run|ka-boom/i);
  });
});
