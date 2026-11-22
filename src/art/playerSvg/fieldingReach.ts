import { rigPointAtFeet, type MiniPlayerRigPose } from './miniPlayerPose';

export function fieldingReach(pose: MiniPlayerRigPose, left: boolean) {
  const side = left ? -1 : 1;
  const root = { ...pose.root, tx: side * pose.root.tx, rotDeg: side * pose.root.rotDeg };
  const wrist = { x: 120 + side * (44 + (pose.reach?.out ?? 0)), y: 169 - (pose.reach?.up ?? 0) };
  return { root, wrist };
}

// Artwork coordinates after the root's SVG transform about the feet. The
// baseball sits three drawing units above the wrist inside the leather.
export function reachedPocket(pose: MiniPlayerRigPose, left: boolean, stature = 1) {
  const { root, wrist } = fieldingReach(pose, left);
  return rigPointAtFeet(wrist.x, wrist.y - 3, root, stature);
}
