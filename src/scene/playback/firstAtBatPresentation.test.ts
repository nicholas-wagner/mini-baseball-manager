import { expect, it } from "vitest";
import { Vector3, PerspectiveCamera } from "three";
import { actorAt, diamondCamera, diamondPlay } from "./diamondPlay";
import {
  previewShot,
  rehearsalPose,
  targetOffset,
} from "./firstAtBatPresentation";

it.each(["L", "R"] as const)(
  "frames the rehearsing %s batter from cap to cleats",
  (side) => {
    const play = diamondPlay("ground_out");
    const box = actorAt(play, "BAT", 0, side).pos;
    const shot = previewShot("power", side);
    const camera = new PerspectiveCamera(shot.fov, 1.06, 0.1, 100);
    camera.position.copy(shot.position);
    camera.lookAt(new Vector3().copy(shot.lookAt));
    camera.updateMatrixWorld();
    for (const height of [0.1, 1.85]) {
      const screen = new Vector3(box.x, height, box.z).project(camera);
      expect(Math.max(Math.abs(screen.x), Math.abs(screen.y))).toBeLessThan(
        0.87,
      );
    }
  },
);
it("holds the pitching lane through release, catch and routine return", () => {
  for (const kind of ["called_pitch", "missed_pitch", "ball_pitch"] as const) {
    const play = diamondPlay(kind);
    const start = diamondCamera(play, play.legs[0].start, "L");
    for (const time of [
      play.legs[0].start + 0.16,
      play.finish,
      play.legs[1].end,
    ]) {
      expect(diamondCamera(play, time, "L")).toEqual(start);
    }
  }
});
it.each(["R", "L"] as const)(
  "fits the battery in the narrow replay frame for a %s batter",
  (side) => {
    const play = diamondPlay("called_third");
    const shot = diamondCamera(play, play.finish, side);
    const camera = new PerspectiveCamera(shot.fov, 1.06, 0.1, 100);
    camera.position.copy(shot.position);
    camera.lookAt(new Vector3().copy(shot.lookAt));
    camera.updateMatrixWorld();
    for (const actor of ["P", "C", "BAT"] as const) {
      const center = actorAt(play, actor, play.finish, side).pos;
      for (const offset of [-0.48, 0.48]) {
        const at = new Vector3(center.x + offset, 1.45, center.z).project(
          camera,
        );
        expect(Math.abs(at.x)).toBeLessThan(0.93);
      }
    }
  },
);
it("shows the first baseman and arriving cleat together above the foul line", () => {
  const play = diamondPlay("ground_out");
  const camera = new PerspectiveCamera(40, 1.45, 0.1, 100);
  for (const time of [play.finish - 0.1, play.finish, play.batterArrival]) {
    const shot = diamondCamera(play, time, "R");
    expect(shot.position.y).toBeLessThan(3);
    camera.position.copy(shot.position);
    camera.lookAt(new Vector3().copy(shot.lookAt));
    camera.fov = shot.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const actor of ["BAT", "1B"] as const) {
      const pos = new Vector3().copy(actorAt(play, actor, time, "R").pos);
      pos.y = actor === "BAT" ? 0.12 : 1.12;
      const projected = pos.project(camera);
      expect(
        Math.max(Math.abs(projected.x), Math.abs(projected.y)),
      ).toBeLessThan(0.92);
    }
  }
});
it("gives the reliever one short fist pump only after a pressure strikeout reaches the mitt", () => {
  const play = diamondPlay("called_third");
  const relief = { ...play, reliefStrikeout: true };
  expect(actorAt(relief, "P", play.finish, "R").clip).not.toBe("pitch_salute");
  expect(actorAt(relief, "P", play.finish + 0.58, "R").clip).toBe(
    "pitch_salute",
  );
  expect(actorAt(relief, "P", play.finish + 1.1, "R").clip).not.toBe(
    "pitch_salute",
  );
  expect(actorAt(play, "P", play.finish + 0.58, "R").clip).not.toBe(
    "pitch_salute",
  );
});
it("mirrors catcher targets and holds each distinct stance until the pitch, with a still reduced-motion pose", () => {
  expect(targetOffset("paint_corners", "R").x).toBe(
    -targetOffset("paint_corners", "L").x,
  );
  expect(targetOffset("bury_offspeed", "L").y).toBeLessThan(
    targetOffset("attack_zone", "L").y,
  );
  expect(rehearsalPose("contact", 0.1, false)).not.toEqual(
    rehearsalPose("power", 0.1, false),
  );
  for (const choice of ["contact", "power"] as const) {
    expect(rehearsalPose(choice, 3, false)).toEqual(rehearsalPose(choice, 7, false));
    expect(rehearsalPose(choice, 3, false)).toEqual(rehearsalPose(choice, 0, true));
  }
  expect(rehearsalPose("power", 3, true)).toEqual(
    rehearsalPose("power", 0, true),
  );
});

it("holds a called strike in the pocket for a nod before the return throw", () => {
  const play = diamondPlay("called_pitch");
  expect(actorAt(play, "C", play.finish + .24, "R").clip).toBe("catch_frame");
  expect(actorAt(play, "C", play.legs[1].start, "R").clip).toBe("catch_throw");
  const ball = diamondPlay("ball_pitch");
  expect(actorAt(ball, "C", ball.finish + .24, "L").clip).not.toBe("catch_frame");
});
