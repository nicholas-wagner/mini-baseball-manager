import type { AtBatOutcome, PlayEvent } from "../models/playEvent";

export interface ScorebookMoment {
  id: string;
  playerId: string;
  playerName: string;
  opponent: string;
  caption: string;
  inning: number;
  half: "TOP" | "BOT";
  situation: string;
}

type Highlight = {
  actor: string | undefined;
  caption: string;
  priority: number;
};
const hits: Partial<Record<AtBatOutcome, string>> = {
  single: "Single",
  bunt_single: "Bunt single",
  double: "Double",
  triple: "Triple",
  walk: "Walk",
  sac_fly: "Sacrifice fly",
};
const homers = [
  "Home run",
  "Solo homer",
  "Two-run homer",
  "Three-run homer",
  "Grand slam",
];

function battingPlay(e: PlayEvent, runs: number): Highlight | undefined {
  if (e.outcome === "home_run")
    return {
      actor: e.batterId,
      caption: homers[runs] ?? "Home run",
      priority: 9,
    };
  const caption = e.outcome && hits[e.outcome];
  if (caption)
    return { actor: e.batterId, caption, priority: runs > 0 ? 8 : 3 };
}

function routinePitchingOut(e: PlayEvent): Highlight | undefined {
  const caption =
    e.outcome === "ground_out"
      ? "Induced a groundout"
      : e.outcome === "fly_out"
        ? "Induced a flyout"
        : undefined;
  if (caption) return { actor: e.pitcherId, caption, priority: 2 };
}

function defensivePlay(e: PlayEvent): Highlight | undefined {
  if (e.outcome === "strikeout")
    return {
      actor: e.pitcherId,
      caption: e.outsAfter === 3 ? "Inning-ending strikeout" : "Strikeout",
      priority: 5,
    };
  if (e.outsAfter <= e.outsBefore) return;
  if (!e.fieldingHighlight) return routinePitchingOut(e);
  const { fielderId: actor, anim } = e.fieldingHighlight;
  if (e.type === "stolen_base_attempt")
    return { actor, caption: "Caught stealing", priority: 7 };
  if (e.outcome === "double_play")
    return { actor, caption: "Turned two", priority: 7 };
  if (
    anim === "field_dive" &&
    (e.outcome === "fly_out" || e.outcome === "line_out")
  )
    return { actor, caption: "Diving catch", priority: 7 };
  return { actor, caption: "Fielded the out", priority: 4 };
}

function scoreLine(ours: number, theirs: number, runs: number) {
  const score = ours + "–" + theirs;
  if (runs > 0 && ours === theirs) return "Tied it " + score;
  if (ours > theirs && ours - runs <= theirs) return "Took the lead " + score;
  return (
    (ours === theirs ? "Tied " : ours > theirs ? "Ahead " : "Behind ") + score
  );
}

function runsSince(event: PlayEvent, previous?: PlayEvent) {
  if (previous?.seq !== event.seq - 1) return 0;
  return (
    event.homeScore + event.awayScore - previous.homeScore - previous.awayScore
  );
}

function scoreForClub(event: PlayEvent, humanHome: boolean, runs: number) {
  return humanHome
    ? scoreLine(event.homeScore, event.awayScore, runs)
    : scoreLine(event.awayScore, event.homeScore, runs);
}

/** Select distinct contributors using only credited plays in this game's log. */
export function selectScorebookMoments(
  events: readonly PlayEvent[],
  players: Readonly<Record<string, { name: string }>>,
  humanHome: boolean,
  opponent: string,
  gameId: string,
): ScorebookMoment[] {
  const ranked = new Map<string, { moment: ScorebookMoment; rank: number }>();
  events.forEach((event, i) => {
    const runs = runsSince(event, events[i - 1]);
    const batting = (event.half === "BOT") === humanHome;
    const play = batting ? battingPlay(event, runs) : defensivePlay(event);
    if (!play?.actor || !players[play.actor]) return;
    const situation = scoreForClub(event, humanHome, batting ? runs : 0);
    const rank =
      play.priority + (situation.startsWith("Took the lead") ? 4 : 0);
    if ((ranked.get(play.actor)?.rank ?? -1) > rank) return;
    ranked.set(play.actor, {
      rank,
      moment: {
        id: gameId + "/" + event.seq,
        playerId: play.actor,
        playerName: players[play.actor].name,
        caption: play.caption,
        opponent,
        situation,
        inning: event.inning,
        half: event.half,
      },
    });
  });
  return [...ranked.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3)
    .map((item) => item.moment);
}
