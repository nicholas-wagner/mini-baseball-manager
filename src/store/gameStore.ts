import { create } from 'zustand';
import {
  generateMarketPool,
  validateRosterAddition,
  validateRosterRelease,
} from '../engine/gm/marketTiers';
import {
  beginOffseasonCycle,
  completeOffseasonCycle,
  draftOffseasonProspect,
  resolveExpiringContractDecision,
  signOffseasonFreeAgent,
  validateSalaryCapRoom,
  type OffseasonState,
} from '../engine/gm/offseasonEngine';
import {
  buildOptimalLineup,
  validateLineup,
} from '../engine/gm/rosterFactory';
import type { StartingRosterPreset } from '../engine/gm/rosterPresets';
import type { FieldPosition } from '../engine/handedness/types';
import {
  advanceOffseasonWorld,
  generateSixTierWorld,
  simulateBestOfThreePlayoffs,
  simulateSeriesRound,
  type TierPlayoffResult,
  type TierPromotionTransition,
} from '../engine/league/seasonEngine';
import {
  LEAGUE_TIER_ORDER,
  type Club,
  type LeagueTierId,
} from '../engine/models/club';
import { createManagerProfile, type ManagerProfile } from '../engine/models/manager';
import {
  isPitcherPosition,
  type GameLengthInnings,
  type Player,
} from '../engine/models/player';
import { createSeededRng } from '../engine/rng/seededRng';
import { unlockNextHeritageTier } from '../engine/rpg/heritageTrees';
import {
  respecPlayerSkills,
  SKILL_RESPEC_CASH_FEE,
  toggleEquippedSpecialPower,
  unlockSkillNode,
} from '../engine/rpg/skillTrees';
import { crossTrainPosition } from '../engine/rpg/specialistsAndPositions';
import {
  applyTrainingDrill,
  type TrainingDrillRequest,
} from '../engine/rpg/trainingCompromises';
import { simFullGame } from '../engine/simulation/baseballEngine';
import type { GameSessionResult } from '../engine/simulation/gameState';
import {
  applyPostGameProgression,
  calculatePostGameRewards,
  selectGameMvp,
  type GameMvpSelection,
  type PostGameRewards,
} from '../engine/simulation/rewards';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_SAVE_SETTINGS,
  createSaveRepository,
  exportSaveJson,
  importSaveJson,
  type SaveFileV1,
  type SaveRepository,
  type SaveSlotId,
  type UserSaveSettings,
} from './persistence';

export interface StartNewCareerInput {
  city: string;
  clubName: string;
  mascot: string;
  monogram: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  managerName: string;
  startingPreset?: StartingRosterPreset;
  enableInjuries?: boolean;
  enableIllnesses?: boolean;
  seed?: number;
}

export interface PostGameSummary {
  opponentClubId: string;
  opponentName: string;
  won: boolean;
  awayScore: number;
  homeScore: number;
  mvp: GameMvpSelection;
  rewards: PostGameRewards;
  result: GameSessionResult;
}

export interface GameStoreState {
  worldSeed: number;
  seasonNumber: number;
  currentSeriesIndex: number;
  rosterActionNonce: number;
  humanClubId: string | null;
  manager: ManagerProfile | null;
  leagues: Record<LeagueTierId, Club[]>;
  freeAgents: Player[];
  settings: UserSaveSettings;
  lastPostGameSummary: PostGameSummary | null;
  lastPlayoffResult: TierPlayoffResult | null;
  lastOffseasonTransitions: readonly TierPromotionTransition[];
  activeOffseason: OffseasonState | null;
  getHumanClub: () => Club | null;
  startNewCareer: (input: StartNewCareerInput) => void;
  simNextSeriesRound: (
    regulationInnings?: GameLengthInnings,
  ) => { seriesCompleted: number; seasonComplete: boolean };
  runPlayoffsAndAdvanceSeason: (
    regulationInnings?: GameLengthInnings,
  ) => {
    humanPlayoffs: TierPlayoffResult;
    transitions: readonly TierPromotionTransition[];
    nextSeasonNumber: number;
  } | null;
  beginInteractiveOffseason: (regulationInnings?: GameLengthInnings) => OffseasonState | null;
  decideOffseasonExpiring: (
    playerId: string,
    decision: 'resign' | 'release',
    offeredYears?: number,
  ) => { applied: boolean; reason?: string };
  draftOffseasonRookie: (prospectId: string) => { drafted: boolean; reason?: string };
  signOffseasonAgent: (playerId: string) => { signed: boolean; reason?: string };
  finishInteractiveOffseason: () => number | null;
  swapLineupSlots: (slotIndexA: number, slotIndexB: number) => void;
  assignLineupPlayer: (slotIndex: number, playerId: string) => void;
  autoOptimizeHumanLineup: () => void;
  swapRotationOrder: (indexA: number, indexB: number) => void;
  crossTrainPlayerPosition: (
    playerId: string,
    targetPos: FieldPosition,
  ) => { trained: boolean; reason?: string; deltaGain?: number; rustApplied?: number };
  runCompromiseTrainingDrill: (
    playerId: string,
    request: TrainingDrillRequest,
  ) => { trained: boolean; reason?: string; summary: string };
  unlockPlayerSkill: (playerId: string, nodeId: string) => { unlocked: boolean; reason?: string };
  unlockPlayerHeritageTier: (playerId: string) => { unlocked: boolean; reason?: string };
  togglePlayerSpecialPower: (
    playerId: string,
    powerId: string,
  ) => { changed: boolean; reason?: string };
  respecPlayerSkillTree: (playerId: string) => { refundedSp: number; reason?: string };
  signFreeAgent: (playerId: string) => { signed: boolean; reason?: string };
  releasePlayer: (playerId: string) => { released: boolean; reason?: string };
  commitCompletedGame: (opponentClubId: string, result: GameSessionResult, isHomeGame: boolean) => PostGameSummary | null;
  playInstantExhibition: (opponentClubId: string, gameSeed?: number) => PostGameSummary | null;
  saveCareerToSlot: (slotId: SaveSlotId) => Promise<void>;
  loadCareerFromSlot: (slotId: SaveSlotId) => Promise<boolean>;
  exportCurrentCareerJson: () => string;
  importCareerJson: (rawJson: string) => boolean;
}

function createEmptyLeagues(): Record<LeagueTierId, Club[]> {
  return {
    rookie: [],
    low_a: [],
    high_a: [],
    aa: [],
    aaa: [],
    majors: [],
  };
}

function updateHumanClubInLeagues(
  leagues: Record<LeagueTierId, Club[]>,
  updatedClub: Club,
): Record<LeagueTierId, Club[]> {
  return {
    ...leagues,
    [updatedClub.leagueTier]: leagues[updatedClub.leagueTier].map((club) =>
      club.id === updatedClub.id ? updatedClub : club,
    ),
  };
}

function findClubAcrossLeagues(
  leagues: Record<LeagueTierId, Club[]>,
  clubId: string | null,
): Club | null {
  if (!clubId) return null;
  for (const tierClubs of Object.values(leagues)) {
    const match = tierClubs.find((c) => c.id === clubId);
    if (match) return match;
  }
  return null;
}

/** Sample entropy once when founding a career. All subsequent draws use its saved seed. */
export function newCareerSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function createGameStore(repository: SaveRepository = createSaveRepository()) {
  return create<GameStoreState>()((set, get) => ({
    worldSeed: 1994,
    seasonNumber: 1,
    currentSeriesIndex: 0,
    rosterActionNonce: 1,
    humanClubId: null,
    manager: null,
    leagues: createEmptyLeagues(),
    freeAgents: [],
    settings: { ...DEFAULT_SAVE_SETTINGS },
    lastPostGameSummary: null,
    lastPlayoffResult: null,
    lastOffseasonTransitions: [],
    activeOffseason: null,

    getHumanClub: () => findClubAcrossLeagues(get().leagues, get().humanClubId),

    startNewCareer: (input) => {
      const seed = input.seed ?? newCareerSeed();
      const world = generateSixTierWorld(seed, input);
      const freeAgents = world.freeAgents;

      set((prev) => ({
        worldSeed: seed,
        seasonNumber: 1,
        currentSeriesIndex: 0,
        rosterActionNonce: 1,
        humanClubId: world.humanClubId,
        manager: createManagerProfile({
          name: input.managerName.trim() || 'Skipper',
          avatarSeed: seed,
        }),
        leagues: world.leagues,
        freeAgents,
        settings: {
          ...prev.settings,
          enableInjuries: input.enableInjuries ?? true,
          enableIllnesses: input.enableIllnesses ?? true,
        },
        lastPostGameSummary: null,
        lastPlayoffResult: null,
        lastOffseasonTransitions: [],
        activeOffseason: null,
      }));
    },

    simNextSeriesRound: (regulationInnings = 5) => {
      const state = get();
      if (state.currentSeriesIndex >= 7) {
        return { seriesCompleted: state.currentSeriesIndex, seasonComplete: true };
      }

      const nextLeagues = { ...state.leagues };
      LEAGUE_TIER_ORDER.forEach((tier, tierIdx) => {
        if (nextLeagues[tier].length < 2) return;
        const roundSeed =
          state.worldSeed +
          state.seasonNumber * 10000 +
          state.currentSeriesIndex * 500 +
          tierIdx * 71;
        nextLeagues[tier] = simulateSeriesRound(
          nextLeagues[tier],
          state.currentSeriesIndex,
          roundSeed,
          regulationInnings,
        ).clubs;
      });

      const nextIndex = state.currentSeriesIndex + 1;
      set({
        leagues: nextLeagues,
        currentSeriesIndex: nextIndex,
      });
      return { seriesCompleted: nextIndex, seasonComplete: nextIndex >= 7 };
    },

    runPlayoffsAndAdvanceSeason: (regulationInnings = 5) => {
      const state = get();
      const humanClub = get().getHumanClub();
      if (!humanClub) return null;

      const championsByTier: Partial<Record<LeagueTierId, string>> = {};
      let humanPlayoffs: TierPlayoffResult | null = null;

      LEAGUE_TIER_ORDER.forEach((tier, tierIdx) => {
        if (state.leagues[tier].length < 4) return;
        const playoffSeed = state.worldSeed + state.seasonNumber * 20000 + tierIdx * 131;
        const res = simulateBestOfThreePlayoffs(
          state.leagues[tier],
          playoffSeed,
          regulationInnings,
        );
        championsByTier[tier] = res.championClubId;
        if (tier === humanClub.leagueTier) humanPlayoffs = res;
      });

      const offseason = advanceOffseasonWorld(
        state.leagues,
        state.worldSeed + state.seasonNumber * 30000,
        championsByTier,
      );
      const nextSeasonNumber = state.seasonNumber + 1;
      const updatedHuman = findClubAcrossLeagues(offseason.leagues, state.humanClubId);
      const nextTier = updatedHuman?.leagueTier ?? 'rookie';
      const nextFreeAgents = generateMarketPool(
        createSeededRng(state.worldSeed + nextSeasonNumber * 733),
        nextTier,
        12,
      );

      set({
        seasonNumber: nextSeasonNumber,
        currentSeriesIndex: 0,
        leagues: offseason.leagues,
        freeAgents: nextFreeAgents,
        lastPlayoffResult: humanPlayoffs,
        lastOffseasonTransitions: offseason.transitions,
      });

      return {
        humanPlayoffs: humanPlayoffs!,
        transitions: offseason.transitions,
        nextSeasonNumber,
      };
    },

    beginInteractiveOffseason: (regulationInnings = 5) => {
      const state = get();
      const humanClub = get().getHumanClub();
      if (!humanClub) return null;

      const championsByTier: Partial<Record<LeagueTierId, string>> = {};
      let humanPlayoffs: TierPlayoffResult | null = null;
      LEAGUE_TIER_ORDER.forEach((tier, tierIdx) => {
        if (state.leagues[tier].length < 4) return;
        const playoffSeed = state.worldSeed + state.seasonNumber * 20000 + tierIdx * 131;
        const res = simulateBestOfThreePlayoffs(state.leagues[tier], playoffSeed, regulationInnings);
        championsByTier[tier] = res.championClubId;
        if (tier === humanClub.leagueTier) humanPlayoffs = res;
      });

      const offseason = beginOffseasonCycle(
        state.leagues,
        humanClub.id,
        state.worldSeed,
        state.seasonNumber,
        championsByTier,
      );
      set({
        activeOffseason: offseason,
        lastPlayoffResult: humanPlayoffs,
        lastOffseasonTransitions: offseason.transitions,
      });
      return offseason;
    },

    decideOffseasonExpiring: (playerId, decision, offeredYears = 2) => {
      const current = get().activeOffseason;
      if (!current) return { applied: false, reason: 'No active offseason.' };
      const res = resolveExpiringContractDecision(current, playerId, decision, offeredYears);
      if (!res.applied) return { applied: false, reason: res.reason };
      set({ activeOffseason: res.state });
      return { applied: true };
    },

    draftOffseasonRookie: (prospectId) => {
      const current = get().activeOffseason;
      if (!current) return { drafted: false, reason: 'No active offseason.' };
      const res = draftOffseasonProspect(current, prospectId);
      if (!res.drafted) return { drafted: false, reason: res.reason };
      set({ activeOffseason: res.state });
      return { drafted: true };
    },

    signOffseasonAgent: (playerId) => {
      const current = get().activeOffseason;
      if (!current) return { signed: false, reason: 'No active offseason.' };
      const res = signOffseasonFreeAgent(current, playerId);
      if (!res.signed) return { signed: false, reason: res.reason };
      set({ activeOffseason: res.state });
      return { signed: true };
    },

    finishInteractiveOffseason: () => {
      const current = get().activeOffseason;
      if (!current) return null;
      const done = completeOffseasonCycle(current);
      set({
        seasonNumber: done.nextSeasonNumber,
        currentSeriesIndex: 0,
        leagues: done.leagues,
        freeAgents: done.freeAgents,
        activeOffseason: null,
      });
      return done.nextSeasonNumber;
    },

    swapLineupSlots: (slotIndexA, slotIndexB) => {
      const club = get().getHumanClub();
      if (!club || slotIndexA === slotIndexB) return;
      const slotA = club.lineup[slotIndexA];
      const slotB = club.lineup[slotIndexB];
      if (!slotA || !slotB) return;

      const nextLineup = club.lineup.map((slot, idx) => {
        if (idx === slotIndexA) {
          return { ...slotB, orderIndex: slotIndexA };
        }
        if (idx === slotIndexB) {
          return { ...slotA, orderIndex: slotIndexB };
        }
        return slot;
      });

      const candidateClub = { ...club, lineup: nextLineup };
      if (!validateLineup(candidateClub).valid) return;
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, candidateClub),
      }));
    },

    assignLineupPlayer: (slotIndex, playerId) => {
      const club = get().getHumanClub();
      if (!club || !club.lineup[slotIndex]) return;
      const incoming = club.roster.find((p) => p.id === playerId);
      if (!incoming || isPitcherPosition(incoming.position)) return;

      const existingIdx = club.lineup.findIndex((s) => s.playerId === playerId);
      if (existingIdx !== -1) {
        get().swapLineupSlots(slotIndex, existingIdx);
        return;
      }

      const nextLineup = club.lineup.map((slot, idx) =>
        idx === slotIndex ? { ...slot, playerId } : slot,
      );
      const candidateClub = { ...club, lineup: nextLineup };
      if (!validateLineup(candidateClub).valid) return;
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, candidateClub),
      }));
    },

    autoOptimizeHumanLineup: () => {
      const club = get().getHumanClub();
      if (!club) return;
      const optimized = buildOptimalLineup(club.roster);
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, { ...club, lineup: optimized }),
      }));
    },

    swapRotationOrder: (indexA, indexB) => {
      const club = get().getHumanClub();
      if (!club || indexA === indexB) return;
      if (!club.rotationIds[indexA] || !club.rotationIds[indexB]) return;
      const nextRotation = [...club.rotationIds];
      const temp = nextRotation[indexA];
      nextRotation[indexA] = nextRotation[indexB];
      nextRotation[indexB] = temp;
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, {
          ...club,
          rotationIds: nextRotation,
        }),
      }));
    },

    crossTrainPlayerPosition: (playerId, targetPos) => {
      const club = get().getHumanClub();
      if (!club) return { trained: false, reason: 'No active club found.' };
      const target = club.roster.find((p) => p.id === playerId);
      if (!target) return { trained: false, reason: 'Player is not on your roster.' };

      const nonce = get().rosterActionNonce;
      const result = crossTrainPosition(
        createSeededRng(get().worldSeed + nonce * 97),
        target,
        targetPos,
      );
      if (!result.trained) {
        return { trained: false, reason: result.reason };
      }

      const nextClub: Club = {
        ...club,
        roster: club.roster.map((p) => (p.id === playerId ? result.player : p)),
      };
      set((state) => ({
        rosterActionNonce: state.rosterActionNonce + 1,
        leagues: updateHumanClubInLeagues(state.leagues, nextClub),
      }));
      return {
        trained: true,
        deltaGain: result.deltaGain,
        rustApplied: result.rustApplied,
      };
    },

    runCompromiseTrainingDrill: (playerId, request) => {
      const club = get().getHumanClub();
      if (!club) return { trained: false, reason: 'No active club found.', summary: 'No active club found.' };
      const target = club.roster.find((p) => p.id === playerId);
      if (!target) {
        return { trained: false, reason: 'Player is not on your roster.', summary: 'Player is not on your roster.' };
      }

      const nonce = get().rosterActionNonce;
      const result = applyTrainingDrill(
        createSeededRng(get().worldSeed + nonce * 131),
        target,
        request,
      );
      if (!result.trained) {
        return { trained: false, reason: result.reason, summary: result.summary };
      }

      const nextClub: Club = {
        ...club,
        roster: club.roster.map((p) => (p.id === playerId ? result.player : p)),
      };
      set((state) => ({
        rosterActionNonce: state.rosterActionNonce + 1,
        leagues: updateHumanClubInLeagues(state.leagues, nextClub),
      }));
      return { trained: true, summary: result.summary };
    },

    unlockPlayerSkill: (playerId, nodeId) => {
      const club = get().getHumanClub();
      if (!club) return { unlocked: false, reason: 'No active club found.' };
      const target = club.roster.find((p) => p.id === playerId);
      if (!target) return { unlocked: false, reason: 'Player is not on your roster.' };

      const res = unlockSkillNode(target, nodeId);
      if (!res.unlocked) return { unlocked: false, reason: res.reason };

      const nextClub: Club = {
        ...club,
        roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
      };
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, nextClub),
      }));
      return { unlocked: true };
    },

    unlockPlayerHeritageTier: (playerId) => {
      const club = get().getHumanClub();
      if (!club) return { unlocked: false, reason: 'No active club found.' };
      const target = club.roster.find((p) => p.id === playerId);
      if (!target) return { unlocked: false, reason: 'Player is not on your roster.' };

      const res = unlockNextHeritageTier(target);
      if (!res.unlocked) return { unlocked: false, reason: res.reason };

      const nextClub: Club = {
        ...club,
        roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
      };
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, nextClub),
      }));
      return { unlocked: true };
    },

    togglePlayerSpecialPower: (playerId, powerId) => {
      const club = get().getHumanClub();
      if (!club) return { changed: false, reason: 'No active club found.' };
      const target = club.roster.find((p) => p.id === playerId);
      if (!target) return { changed: false, reason: 'Player is not on your roster.' };

      const res = toggleEquippedSpecialPower(target, powerId);
      if (!res.changed) return { changed: false, reason: res.reason };

      const nextClub: Club = {
        ...club,
        roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
      };
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, nextClub),
      }));
      return { changed: true };
    },

    respecPlayerSkillTree: (playerId) => {
      const club = get().getHumanClub();
      if (!club) return { refundedSp: 0, reason: 'No active club found.' };
      const target = club.roster.find((p) => p.id === playerId);
      if (!target) return { refundedSp: 0, reason: 'Player is not on your roster.' };
      if (target.unlockedSkillIds.length === 0) {
        return { refundedSp: 0, reason: 'No skill tree nodes to respec.' };
      }
      if (club.economy.cash < SKILL_RESPEC_CASH_FEE) {
        return {
          refundedSp: 0,
          reason: `Need $${SKILL_RESPEC_CASH_FEE} cash to respec.`,
        };
      }

      const res = respecPlayerSkills(target);
      const nextClub: Club = {
        ...club,
        roster: club.roster.map((p) => (p.id === playerId ? res.player : p)),
        economy: {
          ...club.economy,
          cash: club.economy.cash - SKILL_RESPEC_CASH_FEE,
        },
      };
      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, nextClub),
      }));
      return { refundedSp: res.refundedSp };
    },

    signFreeAgent: (playerId) => {
      const club = get().getHumanClub();
      if (!club) return { signed: false, reason: 'No active club found.' };
      const incoming = get().freeAgents.find((p) => p.id === playerId);
      if (!incoming) return { signed: false, reason: 'Free agent is no longer available.' };

      const capCheck = validateRosterAddition(club.roster, incoming.id);
      if (!capCheck.allowed) {
        return { signed: false, reason: capCheck.reason };
      }
      const salaryCheck = validateSalaryCapRoom(club, incoming.contract.salaryPerSeason);
      if (!salaryCheck.allowed) {
        return { signed: false, reason: salaryCheck.reason };
      }
      if (club.economy.cash < incoming.contract.signingBonus) {
        return {
          signed: false,
          reason: `Need $${incoming.contract.signingBonus.toLocaleString()} signing bonus.`,
        };
      }

      const nextRoster = [...club.roster, incoming];
      const nextRotation =
        incoming.position === 'SP' ? [...club.rotationIds, incoming.id] : club.rotationIds;
      const nextBullpen =
        incoming.position === 'RP' ? [...club.bullpenIds, incoming.id] : club.bullpenIds;

      const updatedClub: Club = {
        ...club,
        roster: nextRoster,
        rotationIds: nextRotation,
        bullpenIds: nextBullpen,
        economy: {
          ...club.economy,
          cash: club.economy.cash - incoming.contract.signingBonus,
        },
      };

      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, updatedClub),
        freeAgents: state.freeAgents.filter((p) => p.id !== incoming.id),
      }));
      return { signed: true };
    },

    releasePlayer: (playerId) => {
      const club = get().getHumanClub();
      if (!club) return { released: false, reason: 'No active club found.' };

      const releaseCheck = validateRosterRelease(club.roster, playerId);
      if (!releaseCheck.allowed) {
        return { released: false, reason: releaseCheck.reason };
      }

      const releasedPlayer = club.roster.find((p) => p.id === playerId)!;
      const nextRoster = club.roster.filter((p) => p.id !== playerId);
      const inLineup = club.lineup.some((s) => s.playerId === playerId);
      const nextLineup = inLineup ? buildOptimalLineup(nextRoster) : club.lineup;

      const updatedClub: Club = {
        ...club,
        roster: nextRoster,
        lineup: nextLineup,
        rotationIds: club.rotationIds.filter((id) => id !== playerId),
        bullpenIds: club.bullpenIds.filter((id) => id !== playerId),
      };

      set((state) => ({
        leagues: updateHumanClubInLeagues(state.leagues, updatedClub),
        freeAgents: [releasedPlayer, ...state.freeAgents],
      }));
      return { released: true };
    },

    commitCompletedGame: (opponentClubId, result, isHomeGame) => {
      const { manager, leagues } = get();
      const humanClub = get().getHumanClub();
      const opponentClub = findClubAcrossLeagues(leagues, opponentClubId);
      if (!humanClub || !opponentClub || !manager) return null;

      const won = result.winnerClubId === humanClub.id;
      const awayClub = isHomeGame ? opponentClub : humanClub;
      const homeClub = isHomeGame ? humanClub : opponentClub;
      const mvp = selectGameMvp(result, awayClub, homeClub);
      const rewards = calculatePostGameRewards(humanClub, result, isHomeGame, won);
      const progressed = applyPostGameProgression(
        humanClub,
        manager,
        rewards,
        result.playerStatDeltas,
        won,
      );

      const summary: PostGameSummary = {
        opponentClubId: opponentClub.id,
        opponentName: `${opponentClub.city} ${opponentClub.name}`,
        won,
        awayScore: result.awayScore,
        homeScore: result.homeScore,
        mvp,
        rewards,
        result,
      };

      set({
        manager: progressed.manager,
        leagues: updateHumanClubInLeagues(leagues, progressed.club),
        lastPostGameSummary: summary,
      });

      return summary;
    },

    playInstantExhibition: (opponentClubId, gameSeed) => {
      const humanClub = get().getHumanClub();
      const opponentClub = findClubAcrossLeagues(get().leagues, opponentClubId);
      if (!humanClub || !opponentClub) return null;

      const seed = gameSeed ?? get().worldSeed + humanClub.wins + humanClub.losses + 1;
      const result = simFullGame(opponentClub, humanClub, seed);
      return get().commitCompletedGame(opponentClub.id, result, true);
    },

    saveCareerToSlot: async (slotId) => {
      const state = get();
      if (!state.humanClubId || !state.manager) return;
      const payload: SaveFileV1 = {
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        savedAtIso: new Date().toISOString(),
        worldSeed: state.worldSeed,
        seasonNumber: state.seasonNumber,
        currentSeriesIndex: state.currentSeriesIndex,
        humanClubId: state.humanClubId,
        manager: state.manager,
        leagues: state.leagues,
        freeAgents: state.freeAgents,
        rivalries: [],
        trophies: [],
        newspaperArchive: [],
        unlockedCosmeticIds: [],
        settings: state.settings,
      };
      await repository.saveSlot(slotId, payload);
    },

    loadCareerFromSlot: async (slotId) => {
      const save = await repository.loadSlot(slotId);
      if (!save) return false;
      set({
        worldSeed: save.worldSeed,
        seasonNumber: save.seasonNumber,
        currentSeriesIndex: save.currentSeriesIndex,
        humanClubId: save.humanClubId,
        manager: save.manager,
        leagues: save.leagues,
        freeAgents: save.freeAgents ?? generateMarketPool(createSeededRng(save.worldSeed + 505), 'rookie', 12),
        settings: save.settings,
        lastPostGameSummary: null,
      });
      return true;
    },

    exportCurrentCareerJson: () => {
      const state = get();
      if (!state.humanClubId || !state.manager) {
        throw new Error('Cannot export career before creating a club.');
      }
      return exportSaveJson({
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        savedAtIso: new Date().toISOString(),
        worldSeed: state.worldSeed,
        seasonNumber: state.seasonNumber,
        currentSeriesIndex: state.currentSeriesIndex,
        humanClubId: state.humanClubId,
        manager: state.manager,
        leagues: state.leagues,
        freeAgents: state.freeAgents,
        rivalries: [],
        trophies: [],
        newspaperArchive: [],
        unlockedCosmeticIds: [],
        settings: state.settings,
      });
    },

    importCareerJson: (rawJson) => {
      const save = importSaveJson(rawJson);
      set({
        worldSeed: save.worldSeed,
        seasonNumber: save.seasonNumber,
        currentSeriesIndex: save.currentSeriesIndex,
        humanClubId: save.humanClubId,
        manager: save.manager,
        leagues: save.leagues,
        freeAgents: save.freeAgents ?? generateMarketPool(createSeededRng(save.worldSeed + 505), 'rookie', 12),
        settings: save.settings,
        lastPostGameSummary: null,
      });
      return true;
    },
  }));
}

export const useGameStore = createGameStore();
