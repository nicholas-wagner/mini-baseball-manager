import { Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import anchors from '../../art/miniPlayers/anchors.json';
import { PLAYER_CATALOG } from '../../engine/catalog/playerCatalog';
import { SAMPLE_TEAM_PALETTES } from '../../art/themes/teamPalettes';
import { CLIP_DURATIONS, PITCH_RELEASE_PHASE } from './animationState';
import { createPaintedPlayerRig } from './paintedPlayer';

describe('painted pitching delivery', () => {
  for (const throwsHand of ['L', 'R'] as const) {
    for (const pitchingMotion of ['sidearm', 'overhand', 'underhand'] as const) {
      it(`keeps the ball at the inked ${throwsHand} hand across the ${pitchingMotion} release and a camera cut`, () => {
        const rig = createPaintedPlayerRig({
          traits: { ...PLAYER_CATALOG[0].traits, bottoms: 'pants', pitchingMotion },
          role: 'pitcher', jerseyNumber: 17, team: SAMPLE_TEAM_PALETTES[0], throwsHand,
        });
        const ball = rig.root.getObjectByName('held baseball')!;
        const uniform = rig.root.getObjectByName('painted uniform') as Mesh;
        expect(uniform).toBeInstanceOf(Mesh);
        const duration = CLIP_DURATIONS.pitch_windup;
        for (const phase of [.43, .47, .505, .535, .55, PITCH_RELEASE_PHASE]) {
          const points = [new Vector3(0, 2, 5), new Vector3(-4, 2, .1), new Vector3(1, 2, -5)]
            .map(camera => {
              rig.updatePose('pitch_windup', phase * duration, undefined, camera);
              const grip = ball.parent!.getWorldPosition(new Vector3());
              // Sample the actual textured triangles at the painted fingertips.
              const material = uniform.material as import('three').ShaderMaterial;
              const cell = material.uniforms.cell.value;
              const sheet = camera.z > 0 ? 'delivery-front-pants' : 'delivery-rear-pants';
              const [, , px, py] = anchors[sheet][cell.x + (2 - cell.y) * 4];
              const geo = uniform.geometry;
              const uv = geo.getAttribute('uv');
              const positions = geo.getAttribute('position');
              let closest = 0, best = Infinity;
              for (let i = 0; i < uv.count; i++) {
                const dist = Math.hypot(uv.getX(i) - px / 256, uv.getY(i) - (1 - py / 256));
                if (dist < best) { closest = i; best = dist; }
              }
              const ink = uniform.localToWorld(new Vector3().fromBufferAttribute(positions, closest));
              expect(ink.distanceTo(grip)).toBeLessThan(.034);
              return ball.getWorldPosition(new Vector3());
            });
          expect(points[0].distanceTo(points[1])).toBeLessThan(.0001);
          expect(points[0].distanceTo(points[2])).toBeLessThan(.0001);
        }
        const before = rig.contactAt('pitch_windup', (PITCH_RELEASE_PHASE - .04) * duration,
          rig.root.position, new Vector3(0, 2, -4));
        const release = rig.releasePoint('pitch_windup');
        expect(release.x * (throwsHand === 'L' ? 1 : -1)).toBeGreaterThan(.10);
        const forward = release.sub(before);
        expect(forward.z).toBeGreaterThan(.08);
        expect(forward.z).toBeGreaterThan(Math.abs(forward.x));
        rig.dispose();
      });
    }
  }
});

it.each(['L', 'R'] as const)('keeps the %s slide-step release at the fingertips through a camera cut', hand => {
  const rig = createPaintedPlayerRig({ traits: PLAYER_CATALOG[0].traits, role: 'pitcher',
    jerseyNumber: 5, team: SAMPLE_TEAM_PALETTES[0], throwsHand: hand });
  try {
    const release = CLIP_DURATIONS.pitch_stretch * PITCH_RELEASE_PHASE;
    expect(release).toBeGreaterThanOrEqual(.48);
    expect(release).toBeLessThanOrEqual(.52);
    const front = new Vector3(0,2,5), rear = new Vector3(0,2,-5);
    const at = (t: number, eye: Vector3) => rig.contactAt('pitch_stretch', t, rig.root.position, eye);
    const glove = at(0, front), separated = at(release-.06, front), handAtRelease = at(release, front);
    expect(separated.distanceTo(glove)).toBeGreaterThan(.1);
    expect(handAtRelease.z - separated.z).toBeGreaterThan(.08);
    expect(handAtRelease.distanceTo(at(release, rear))).toBeLessThan(.001);
    expect(handAtRelease.x * (hand === 'L' ? 1 : -1)).toBeGreaterThan(.10);
  } finally { rig.dispose(); }
});
