import type { Club } from '../models/club';
import { computePlayerOverall } from '../models/player';

export interface SandlotGazetteIssue {
  id: string;
  seasonNumber: number;
  seriesIndex: number;
  headline: string;
  subhead: string;
  spotlightPlayerId: string;
  spotlightBlurbs: string[];
}

export interface GazetteInput {
  seasonNumber: number;
  seriesIndex: number;
  humanClub: Club;
  rivalryHeadline?: string;
  tradeHeadline?: string;
}

function buildLeadHeadline(club: Club, rivalryHeadline?: string): string {
  const fullName = `${club.city} ${club.name}`.toUpperCase();
  if (rivalryHeadline) return `RIVALRY EXTRA: ${rivalryHeadline}`;
  if (club.streak >= 4) return `RED-HOT ${fullName} ROLL TO ${club.streak} STRAIGHT!`;
  if (club.streak <= -4) return `SLUMP ALERT: ${fullName} SEEK DUGOUT SPARK!`;
  return `${fullName} STAND ${club.wins}-${club.losses} IN ${club.leagueTier.toUpperCase()} RACE!`;
}

/** Auto-generates a retro 1994 tabloid front page for "The Sandlot Gazette" after every series! */
export function generateSandlotGazetteIssue(input: GazetteInput): SandlotGazetteIssue {
  const { humanClub, seasonNumber, seriesIndex, rivalryHeadline, tradeHeadline } = input;
  const hotPlayer =
    [...humanClub.roster].sort(
      (a, b) => b.formScore - a.formScore || computePlayerOverall(b) - computePlayerOverall(a),
    )[0] ?? humanClub.roster[0];

  const headline = buildLeadHeadline(humanClub, rivalryHeadline);
  const subhead = tradeHeadline
    ? `Trade Rumor Mill: ${tradeHeadline}`
    : `${hotPlayer.name} (${hotPlayer.position}) powers the headlines as ${humanClub.stadium.name} buzzes at ${humanClub.economy.teamHype} Hype.`;

  const spotlightBlurbs = [
    `Player to Watch: ${hotPlayer.name} ("${hotPlayer.nickname}") — OVR ${computePlayerOverall(hotPlayer)}, Form ${hotPlayer.formState.toUpperCase()}.`,
    `Clubhouse Pulse: ${humanClub.wins}-${humanClub.losses} record with ${humanClub.economy.fanBase.toLocaleString()} loyal sandlot fans.`,
  ];

  return {
    id: `gazette-s${seasonNumber}-sr${seriesIndex}`,
    seasonNumber,
    seriesIndex,
    headline,
    subhead,
    spotlightPlayerId: hotPlayer.id,
    spotlightBlurbs,
  };
}
