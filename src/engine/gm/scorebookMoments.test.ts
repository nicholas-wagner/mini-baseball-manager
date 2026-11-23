import { describe, expect, it } from "vitest";
import type { PlayEvent } from "../models/playEvent";
import { selectScorebookMoments } from "./scorebookMoments";

const play: PlayEvent = {
  seq: 10,
  inning: 4,
  half: "BOT",
  type: "ball_in_play",
  outsBefore: 0,
  outsAfter: 0,
  balls: 0,
  strikes: 0,
  awayScore: 3,
  homeScore: 2,
  basesAfter: [null, null, null],
  commentary: "",
  isClutchMoment: false,
};
const players = {
  bat: { name: "Rowan Hayes" },
  glove: { name: "Inés Torres" },
  arm: { name: "Rico Vega" },
};
const select = (events: PlayEvent[]) =>
  selectScorebookMoments(events, players, true, "Shamrocks", "1.4");

describe("signed scorebook moments", () => {
  it("inscribes the actual score change and separates pitcher and fielder credit", () => {
    const hr: PlayEvent = {
      ...play,
      seq: 11,
      homeScore: 4,
      batterId: "bat",
      outcome: "home_run",
    };
    const catchPlay: PlayEvent = {
      ...play,
      seq: 12,
      half: "TOP",
      outsAfter: 1,
      outcome: "fly_out",
      fieldingHighlight: {
        fielderId: "glove",
        fielderPos: "CF",
        anim: "field_dive",
      },
    };
    const moments = select([play, hr, catchPlay]);
    expect(moments[0]).toMatchObject({
      playerName: "Rowan Hayes",
      caption: "Two-run homer",
      situation: "Took the lead 4–3",
      inning: 4,
      half: "BOT",
    });
    expect(moments[1]).toMatchObject({
      playerId: "glove",
      caption: "Diving catch",
    });
  });
  it("avoids guessing runs from a missing previous pitch or crediting an error as a catch", () => {
    expect(
      select([
        {
          ...play,
          seq: 40,
          homeScore: 6,
          outcome: "home_run",
          batterId: "bat",
        },
      ])[0].caption,
    ).toBe("Home run");
    expect(
      select([
        {
          ...play,
          half: "TOP",
          outcome: "fielding_error",
          fieldingHighlight: {
            fielderId: "glove",
            fielderPos: "CF",
            anim: "field_dive",
          },
        },
      ]),
    ).toEqual([]);
  });
  it("records the pitcher retiring a hitter even when a routine out has no fielder credit", () => {
    const out = {
      ...play,
      half: "TOP",
      pitcherId: "arm",
      outcome: "ground_out",
      outsAfter: 1,
    } as const;
    expect(select([out])[0]).toMatchObject({
      playerId: "arm",
      caption: "Induced a groundout",
    });
  });
  it("retains a pitching highlight for the losing club", () => {
    expect(
      select([
        {
          ...play,
          half: "TOP",
          pitcherId: "arm",
          outcome: "strikeout",
          outsBefore: 2,
          outsAfter: 3,
        },
      ])[0],
    ).toMatchObject({ playerId: "arm", caption: "Inning-ending strikeout" });
  });
});
