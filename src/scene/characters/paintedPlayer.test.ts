import { Vector3 } from 'three';
import { BATTERS_BOX, batterBox } from '../playback/diamondLayout';
import { describe, expect, it } from 'vitest';
import { PLAYER_CATALOG } from '../../engine/catalog/playerCatalog';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE } from './animationState';
import { createPaintedPlayerRig } from './paintedPlayer';
import { paintedSheets } from '../../art/miniPlayers/paintedLook';

describe('shared painted minis', () => {
  it('selects existing shared artwork for every catalog identity and view', () => {
    const files = import.meta.glob('../../art/miniPlayers/atlases/*.png');
    const used = new Set<string>();
    for (const player of PLAYER_CATALOG) {
      for (const rear of [false, true]) {
        for (const role of ['pitcher', 'batter', 'fielder', 'catcher', 'runner'] as const) {
          const { body, head } = paintedSheets(player.traits, role, rear);
          used.add(body);
          used.add(head);
        }
      }
    }
    for (const bottom of ['pants', 'shorts', 'skirt']) {
      used.add(bottom);
      used.add('rear-' + bottom);
    }
    used.add('receivers');
    used.add('strides');
    expect([...used].sort()).toEqual(Object.keys(files).map(path => path.split('/').at(-1)!.slice(0,-4)).sort());
  });
  it('stands over the pivot foot and keeps one throwing side from set through hand break and recovery', () => {
    for (const throwsHand of ['R','L'] as const) {
      for (const pitchingMotion of ['sidearm','overhand','underhand'] as const) {
        const rig = createPaintedPlayerRig({ team: SAMPLE_TEAM_PALETTES[0], jerseyNumber: 16, role: 'pitcher',
          throwsHand, traits: { ...PLAYER_CATALOG[0].traits, pitchingMotion } });
        const ball = rig.root.getObjectByName('held baseball')!;
        const head = rig.root.getObjectByName('painted head')!;
        for (const z of [5,-5]) {
          const view = new Vector3(0,2,z);
          rig.updatePose('idle', 0, undefined, view);
          const setHeight = head.getWorldPosition(new Vector3()).y;
          for (const phase of [.03,.17,.35,.46,.54,.66,.79,.95]) {
            rig.updatePose('pitch_windup', phase * CLIP_DURATIONS.pitch_windup, undefined, view);
            expect(ball.visible).toBe(phase >= .43 && phase < PITCH_RELEASE_PHASE);
            if (phase < .43 || phase > .9)
              expect(head.getWorldPosition(new Vector3()).y).toBeGreaterThan(setHeight - .04);
            if (ball.visible)
              expect(ball.getWorldPosition(new Vector3()).x * (throwsHand === 'R' ? -1 : 1)).toBeGreaterThan(0);
          }
        }
        rig.dispose();
      }
    }
  });
  it('rolls the seams in the same registered hand between pitches', () => {
    const rig = createPaintedPlayerRig({team: SAMPLE_TEAM_PALETTES[0], jerseyNumber:18,
      role:'pitcher', throwsHand:'L', traits:{...PLAYER_CATALOG[0].traits, seed:6}});
    const view = new Vector3(1,2,5);
    const ball = rig.root.getObjectByName('held baseball')!;
    rig.updatePose('pitch_set',.55,undefined,view);
    const angle = ball.rotation.z;
    const hand = ball.parent;
    expect(ball.visible).toBe(true);
    rig.updatePose('pitch_set',.75,undefined,view);
    expect(ball.parent).toBe(hand);
    expect(ball.rotation.z).not.toBe(angle);
    rig.updatePose('pitch_windup',.8 * CLIP_DURATIONS.pitch_windup,undefined,view);
    expect(ball.visible).toBe(false);
    rig.dispose();
  });
  it('receives the ball on the glove side through camera changes in every uniform', () => {
    const options = {
      traits: PLAYER_CATALOG[0].traits,
      team: SAMPLE_TEAM_PALETTES[0],
      role: 'catcher' as const,
      jerseyNumber: 18,
    };
    const rig = createPaintedPlayerRig(options);
    for (const bottoms of ['pants', 'shorts', 'skirt'] as const) {
      for (const throwsHand of ['R', 'L'] as const) {
        rig.updateAppearance({ ...options, throwsHand, traits: { ...options.traits, bottoms } });
        for (const z of [-4, 4]) {
          const pocket = rig.contactAt(
            'catch_receive', CLIP_DURATIONS.catch_receive * 0.45, new Vector3(), new Vector3(0, 2, z),
          );
          const gloveSide = throwsHand === 'R' ? 1 : -1;
          expect(pocket.x * gloveSide, `${bottoms} ${throwsHand} camera z=${z}`).toBeGreaterThan(0);
        }
      }
    }
    rig.dispose();
  });
  it('keeps a runner watching home steady as the camera crosses the eye line', () => {
    const runner = createPaintedPlayerRig({
      traits: PLAYER_CATALOG[0].traits, team: SAMPLE_TEAM_PALETTES[1],
      role: 'fielder', jerseyNumber: 9,
    }, Math.PI / 4, true);
    const head = runner.root.getObjectByName('painted head')!;
    const right = new Vector3(1, 0, 0);
    const projectedRight = (x: number) => {
      runner.updatePose('runner_lead', 0, undefined, new Vector3(x, 2, 4));
      return head.localToWorld(right.clone()).sub(head.getWorldPosition(new Vector3()));
    };
    expect(projectedRight(3.99).dot(projectedRight(4.01))).toBeGreaterThan(0);
    runner.dispose();
  });
  it('fits both painted cleats inside the chalk for the widest batting stance', () => {
    for (const batSide of ['R', 'L'] as const) {
      const box = batterBox(batSide);
      const rig = createPaintedPlayerRig({
        traits: { ...PLAYER_CATALOG[0].traits, stature: 'tall', build: 'power' },
        role: 'batter', batSide, team: SAMPLE_TEAM_PALETTES[0], jerseyNumber: 7,
      }, box.yaw);
      rig.root.position.copy(box.position);
      const jersey = rig.root.getObjectByName('painted uniform')!;
      const center = (batSide === 'R' ? -1 : 1) * BATTERS_BOX.centerOffset;
      for (const z of [5, -5]) {
        rig.updatePose('bat_stance', .4, undefined, new Vector3(0, 2, z));
        // The outermost ink of the two ready cleats across all six uniform sheets.
        for (const pixelX of [72, 182]) {
          const foot = jersey.localToWorld(new Vector3(pixelX / 256 - .5, .5 - 247 / 256, 0));
          expect(Math.abs(foot.x - center)).toBeLessThan(BATTERS_BOX.halfWidth - BATTERS_BOX.lineWidth);
          expect(Math.abs(foot.z)).toBeLessThan(BATTERS_BOX.halfLength - BATTERS_BOX.lineWidth);
        }
      }
      rig.dispose();
    }
  });
  it('keeps the helmet flap on the leading ear in both batting boxes and camera views', () => {
    const options = {
      traits: PLAYER_CATALOG[0].traits,
      team: SAMPLE_TEAM_PALETTES[0],
      role: 'batter' as const,
      jerseyNumber: 9,
    };
    const rig = createPaintedPlayerRig(options);
    const helmet = rig.root.getObjectByName('painted head')!;
    for (const batSide of ['R', 'L'] as const) {
      rig.updateAppearance({ ...options, batSide });
      for (const z of [4, -4]) {
        rig.updatePose('bat_stance', 0, undefined, new Vector3(0, 2, z));
        // The two authored views show the flap on opposite sides of the sheet.
        const flap = helmet.localToWorld(new Vector3(z > 0 ? 0.25 : -0.25, 0, 0));
        const center = helmet.getWorldPosition(new Vector3());
        expect((flap.x - center.x) * (batSide === 'R' ? 1 : -1)).toBeGreaterThan(0);
      }
    }
    rig.dispose();
  });
  it('releases from the painted throwing hand in both views and all arm slots', () => {
    const options = {
      traits: PLAYER_CATALOG[0].traits,
      team: SAMPLE_TEAM_PALETTES[0],
      role: 'pitcher' as const,
      jerseyNumber: 24,
    };
    const rig = createPaintedPlayerRig(options);
    const ball = rig.root.getObjectByName('held baseball')!;
    const release = CLIP_DURATIONS.pitch_super * PITCH_RELEASE_PHASE;
    for (const z of [-4, 4]) {
      for (const pitchingMotion of ['sidearm', 'underhand', 'overhand'] as const) {
        const start = [];
        for (const throwsHand of ['R', 'L'] as const) {
          rig.updateAppearance({ ...options, throwsHand, traits: { ...options.traits, pitchingMotion } });
          rig.updatePose('pitch_super', release - 0.001, undefined, new Vector3(0, 2, z));
          const before = ball.getWorldPosition(new Vector3());
          expect(ball.visible).toBe(true);
          const at = rig.releasePoint('pitch_super');
          expect(at.distanceTo(before)).toBeLessThan(0.01);
          expect(ball.visible).toBe(false);
          start.push(at.x);
        }
        expect(start[0]).toBeCloseTo(-start[1], 4);
      }
    }
    rig.dispose();
  });
});

it('keeps the catcher’s throwing hand opposite the pocket from both sides of the bag', () => {
  for (const throwsHand of ['R','L'] as const) {
    const rig = createPaintedPlayerRig({ team: SAMPLE_TEAM_PALETTES[0], jerseyNumber: 2,
      role: 'catcher', throwsHand, traits: PLAYER_CATALOG[0].traits });
    for (const z of [-5,5]) {
      const camera = new Vector3(0,2,z);
      const glove = rig.contactAt('catch_receive',.22,rig.root.position,camera);
      const hand = rig.contactAt('catch_throw',.33,rig.root.position,camera);
      expect(Math.sign(hand.x)).toBe(-Math.sign(glove.x));
      expect(hand.y).toBeGreaterThan(glove.y);
    }
    rig.dispose();
  }
});

it('keeps the receiving uniform resident across live pitcher updates', () => {
  const options = {traits:PLAYER_CATALOG[0].traits, team:SAMPLE_TEAM_PALETTES[0], jerseyNumber:12, role:'pitcher' as const};
  const rig = createPaintedPlayerRig(options);
  const body = rig.root.getObjectByName('painted uniform') as import('three').Mesh<
    import('three').BufferGeometry, import('three').ShaderMaterial>;
  rig.updatePose('field_receive', .3);
  const uniform = body.material.uniforms.sheet.value;
  rig.updateAppearance({...options,jerseyNumber:22,traits:PLAYER_CATALOG[13].traits});
  rig.updatePose('field_receive', .3);
  expect(body.material.uniforms.sheet.value).toBe(uniform);
  rig.dispose();
});
