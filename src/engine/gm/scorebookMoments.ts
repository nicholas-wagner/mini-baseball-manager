import { sacrificeAdvances } from "../simulation/sacrificeAdvances";
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

function isRecordedSacrifice(e: PlayEvent, previous: PlayEvent | undefined, runs: number) {
  if (previous?.seq !== e.seq - 1 || previous.half !== e.half || previous.inning !== e.inning) return false;
  return Boolean(sacrificeAdvances(e, previous.basesAfter, runs));
}

function battingPlay(e: PlayEvent, runs: number, previous?: PlayEvent): Highlight | undefined {
  if (isRecordedSacrifice(e, previous, runs))
    return { actor: e.batterId, caption: "Sacrifice bunt", priority: runs ? 8 : 5 };
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

type ScorebookPlayers = Readonly<Record<string, { name: string }>>;

function creditedMoment(
  event: PlayEvent,
  previous: PlayEvent | undefined,
  players: ScorebookPlayers,
  humanHome: boolean,
  opponent: string,
  gameId: string,
) {
  const runs = runsSince(event, previous);
  const batting = (event.half === "BOT") === humanHome;
  const play = batting ? battingPlay(event, runs, previous) : defensivePlay(event);
  if (!play?.actor || !players[play.actor]) return;
  const situation = scoreForClub(event, humanHome, batting ? runs : 0);
  const rank =
    play.priority + (situation.startsWith("Took the lead") ? 4 : 0);
  const moment = {
    id: gameId + "/" + event.seq,
    playerId: play.actor,
    playerName: players[play.actor].name,
    caption: play.caption,
    opponent,
    situation,
    inning: event.inning,
    half: event.half,
  };
  return { moment, rank };
}

/** Select distinct contributors using only credited plays in this game's log. */
export function selectScorebookMoments(
  events: readonly PlayEvent[],
  players: ScorebookPlayers,
  humanHome: boolean,
  opponent: string,
  gameId: string,
  guidedEvents?: ReadonlySet<number>,
): ScorebookMoment[] {
  const ranked = new Map<string, { moment: ScorebookMoment; rank: number }>();
  let openingPrint: ScorebookMoment | undefined;
  for (const [i, event] of events.entries()) {
    const credit = creditedMoment(event, events[i - 1], players, humanHome, opponent, gameId);
    if (!credit) continue;
    const { moment, rank } = credit;
    if (!openingPrint && guidedEvents?.has(event.seq)) openingPrint = moment;
    if ((ranked.get(moment.playerId)?.rank ?? -1) <= rank) {
      ranked.set(moment.playerId, credit);
    }
  }
  const highlights = [...ranked.values()]
    .sort((a, b) => b.rank - a.rank)
    .map(item => item.moment);
  if (!openingPrint) return highlights.slice(0, 3);
  const otherPlayers = highlights.filter(moment => moment.playerId !== openingPrint.playerId);
  return [openingPrint, ...otherPlayers.slice(0, 2)];
}
