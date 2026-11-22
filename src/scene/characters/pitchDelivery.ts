import { BufferAttribute, DynamicDrawUsage, Group, MathUtils, Mesh, PlaneGeometry, Vector3 } from 'three';
import type { PitchingMotion, UniformBottoms } from '../../art/portraits/types';
import anchors from '../../art/miniPlayers/anchors.json';
import { PITCH_RELEASE_PHASE } from './animationState';

type Beat = readonly [phase: number, cel: number, reach: number, stride: number];

// Cel numbers index whole neck-to-cleat paintings. Reach and stride are metres
// along the rubber-to-plate axis, in the canonical right-handed stance.
const set: Beat = [0, 0, .14, 0];
const lift: Beat = [.28, 1, .14, 0];
const recover: Beat = [.97, 0, .14, 0];
const motion: Record<PitchingMotion, readonly Beat[]> = {
  sidearm: [set, [.12, 0, .14, 0], lift, [.355, 8, .13, .012], [.435, 2, -.16, .08],
    [.49, 3, -.24, .13], [PITCH_RELEASE_PHASE, 4, .35, .25], [.607, 4, .39, .27], [.668, 11, .33, .28],
    [.75, 5, .24, .28], [.84, 5, .16, .25], recover],
  overhand: [set, [.12, 0, .14, 0], lift, [.355, 8, .13, .012], [.42, 2, -.16, .07],
    [.49, 6, -.22, .14], [PITCH_RELEASE_PHASE, 7, .34, .25], [.605, 7, .39, .27], [.67, 11, .34, .28],
    [.75, 5, .24, .28], [.84, 5, .16, .25], recover],
  underhand: [set, [.12, 0, .14, 0], lift, [.32, 8, .13, .006], [.37, 9, -.08, .018], [.405, 9, -.24, .06],
    [.442, 6, -.27, .095], [.485, 2, -.20, .14], [PITCH_RELEASE_PHASE, 10, .35, .25], [.61, 10, .39, .27], [.683, 7, .30, .28],
    [.77, 5, .24, .28], [.845, 5, .16, .25], recover],
};

const segments = 48;
const metresPerPixel = .0047;

export function createPitchDelivery() {
  const root = new Group();
  const wrist = new Group();
  wrist.name = 'throwing wrist';
  root.add(wrist);
  const geometry = new PlaneGeometry(1, 1, segments, segments);
  const points = geometry.getAttribute('position') as BufferAttribute;
  points.setUsage(DynamicDrawUsage);
  const flat = new Float32Array(points.array);
  const weights = new Float32Array(points.count);
  const startGrip = new Vector3(), endGrip = new Vector3(), delta = new Vector3();
  let registered: readonly number[] | undefined;
  let wasFlexed = false;

  function gripAt(bottoms: UniformBottoms, beat: Beat, target: Vector3) {
    const front = anchors[`delivery-front-${bottoms}`][beat[1]];
    const rear = anchors[`delivery-rear-${bottoms}`][beat[1]];
    target.set((front[2] - rear[2]) * .5 * metresPerPixel,
      (249 - (front[3] + rear[3]) * .5) * metresPerPixel, beat[2]);
  }

  function pose(phase: number, slot: PitchingMotion, bottoms: UniformBottoms) {
    const beats = motion[slot];
    let next = 1;
    while (next < beats.length - 1 && phase > beats[next][0]) next++;
    const a = beats[next - 1], b = beats[next];
    const t = Math.max(0, Math.min(1, (phase - a[0]) / (b[0] - a[0])));
    const blend = t * t * (3 - 2 * t);
    gripAt(bottoms, a, startGrip);
    gripAt(bottoms, b, endGrip);
    wrist.position.copy(startGrip).lerp(endGrip, blend);
    // A windmill changes elbow bend as the hand passes the shoulder. Keep
    // the palm within the reach of the arm illustrated in the current pose.
    const drawnGrip = t < .5 ? startGrip : endGrip;
    const dx = wrist.position.x - drawnGrip.x, dy = wrist.position.y - drawnGrip.y;
    const drift = Math.hypot(dx, dy);
    if (drift > .055) {
      wrist.position.x = drawnGrip.x + dx * .055 / drift;
      wrist.position.y = drawnGrip.y + dy * .055 / drift;
    }
    const stride = root.scale.y * (a[3] + (b[3] - a[3]) * blend);
    root.position.x = Math.sin(root.rotation.y) * stride;
    root.position.z = Math.cos(root.rotation.y) * stride;
    return t < .5 ? a[1] : b[1];
  }

  // The same connected triangles carry the sleeve, elbow, hand and leather.
  // Give the illustrated palm depth at release without cutting the arm apart.
  function fitGrip(body: Mesh, registration: readonly number[], phase: number) {
    const flex = MathUtils.smoothstep(phase, .37, .43) * (1 - MathUtils.smoothstep(phase, .625, .71));
    if (flex === 0) {
      if (wasFlexed) { points.array.set(flat); points.needsUpdate = true; }
      wasFlexed = false;
      return;
    }
    const [neckX, neckY, handX, handY] = registration;
    const ux = handX / 256 - .5, uy = .5 - handY / 256;
    if (registered !== registration) {
      const shoulderX = neckX + Math.sign(handX - neckX) * 22;
      const falloff = Math.max(20, Math.hypot(handX - shoulderX, handY - neckY - 18));
      for (let i = 0; i < points.count; i++) {
        const distance = 256 * Math.hypot(flat[i * 3] - ux, flat[i * 3 + 1] - uy);
        const t = Math.max(0, Math.min(1, (distance - 10) / falloff));
        weights[i] = 1 - t * t * (3 - 2 * t);
      }
      registered = registration;
    }
    body.worldToLocal(wrist.getWorldPosition(delta));
    delta.x -= ux;
    delta.y -= uy;
    delta.multiplyScalar(flex);
    for (let i = 0; i < points.count; i++) {
      points.setXYZ(i, flat[3 * i] + weights[i] * delta.x,
        flat[3 * i + 1] + weights[i] * delta.y, weights[i] * delta.z);
    }
    points.needsUpdate = true;
    wasFlexed = true;
  }

  return { root, wrist, geometry, pose, fitGrip };
}
