import { describe, expect, it } from 'vitest';
import { actorAt, diamondPlay } from './diamondPlay';
import { BASE_PATH_VERTICES, batterBox, headingToward } from './diamondLayout';

describe('players face their target on the diamond', () => {
  it('sets both batters sideways with the lead shoulder toward the mound', () => {
    for (const side of ['R', 'L'] as const) {
      const { position, yaw } = batterBox(side);
      const facingX = Math.sin(yaw);
      expect(facingX * position.x).toBeLessThan(0);
      expect(Math.cos(yaw)).toBeCloseTo(0);
      expect((side === 'R' ? -1 : 1) * facingX).toBeCloseTo(-1);
      expect(actorAt(diamondPlay('ground_out'), 'BAT', 0, side).yaw).toBe(yaw);
    }
  });

  it('watches home from all three bags and runs along each basepath', () => {
    for (let bag = 1; bag <= 3; bag++) {
      const base = BASE_PATH_VERTICES[bag];
      const watch = headingToward(base, BASE_PATH_VERTICES[0]);
      expect(Math.cos(watch)).toBeGreaterThan(0);
      expect(base.x + Math.sin(watch) * Math.hypot(base.x, base.z)).toBeCloseTo(0);
      const run = headingToward(base, BASE_PATH_VERTICES[bag + 1]);
      expect(Math.sign(Math.cos(run))).toBe(bag === 1 ? -1 : 1);
    }
  });

  it('turns from watching the pitch to running the force and watches home again after the out', () => {
    const play = diamondPlay('double_play');
    for (const side of ['R', 'L'] as const) {
      const lead = actorAt(play, 'RUN', 0, side);
      expect(lead.yaw).toBeCloseTo(headingToward(lead.pos, BASE_PATH_VERTICES[0]));
      for (const runner of ['BAT', 'RUN'] as const) {
        const running = actorAt(play, runner, 2, side);
        const step = actorAt(play, runner, 2.1, side);
        expect(running.yaw).toBeCloseTo(headingToward(running.pos, step.pos));
        const stopped = actorAt(play, runner, play.duration, side);
        expect(stopped.yaw).toBeCloseTo(headingToward(stopped.pos, BASE_PATH_VERTICES[0]));
      }
    }
  });
});
