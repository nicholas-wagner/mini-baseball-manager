import { create } from 'zustand';
import {
  createPlayoffBracketFromClubs,
  recordPlayoffGameResult,
  simNextPlayoffBracketGame,
  type PlayoffBracketState,
  type PlayoffSeriesId,
} from '../engine/league/playoffBracket';
import type { Club, LeagueTierId } from '../engine/models/club';
import type { GamePressureLevel } from '../engine/models/player';

export interface PendingLivePlayoffGame {
  seriesId: PlayoffSeriesId;
  seriesLabel: string;
  gameNumber: number;
  opponentClubId: string;
  pressureLevel: GamePressureLevel;
}

interface PostseasonStoreState {
  bracket: PlayoffBracketState | null;
  pendingLiveGame: PendingLivePlayoffGame | null;
  startBracket: (tierClubs: readonly Club[], tier: LeagueTierId, seasonNumber: number) => PlayoffBracketState;
  simNextGame: (clubsById: Readonly<Record<string, Club>>, seed: number) => string | null;
  queueLivePlayoffGame: (game: PendingLivePlayoffGame) => void;
  recordLivePlayoffResult: (winnerClubId: string, awayScore: number, homeScore: number) => void;
  clearBracket: () => void;
}

export const usePostseasonStore = create<PostseasonStoreState>((set, get) => ({
  bracket: null,
  pendingLiveGame: null,

  startBracket: (tierClubs, tier, seasonNumber) => {
    const next = createPlayoffBracketFromClubs(tierClubs, tier, seasonNumber);
    set({ bracket: next, pendingLiveGame: null });
    return next;
  },

  simNextGame: (clubsById, seed) => {
    const current = get().bracket;
    if (!current) return null;
    const res = simNextPlayoffBracketGame(current, clubsById, seed);
    set({ bracket: res.bracket });
    return res.summary;
  },

  queueLivePlayoffGame: (game) => set({ pendingLiveGame: game }),

  recordLivePlayoffResult: (winnerClubId, awayScore, homeScore) => {
    const { bracket, pendingLiveGame } = get();
    if (!bracket || !pendingLiveGame) return;
    const next = recordPlayoffGameResult(
      bracket,
      pendingLiveGame.seriesId,
      winnerClubId,
      awayScore,
      homeScore,
    );
    set({ bracket: next, pendingLiveGame: null });
  },

  clearBracket: () => set({ bracket: null, pendingLiveGame: null }),
}));
