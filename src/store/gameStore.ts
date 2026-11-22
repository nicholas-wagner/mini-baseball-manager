import { create } from 'zustand';
import {
  generateMarketPool,
  validateRosterAddition,
  validateRosterRelease,
} from '../engine/gm/marketTiers';
import {
  buildOptimalLineup,
  createClub,
  validateLineup,
} from '../engine/gm/rosterFactory';
import type { FieldPosition } from '../engine/handedness/types';
import type { AiArchetype, Club, LeagueTierId } from '../engine/models/club';
import { createManagerProfile, type ManagerProfile } from '../engine/models/manager';
import { isPitcherPosition, type Player } from '../engine/models/player';
import { createSeededRng } from '../engine/rng/seededRng';
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
  getHumanClub: () => Club | null;
  startNewCareer: (input: StartNewCareerInput) => void;
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
  signFreeAgent: (playerId: string) => { signed: boolean; reason?: string };
  releasePlayer: (playerId: string) => { released: boolean; reason?: string };
  commitCompletedGame: (opponentClubId: string, result: GameSessionResult, isHomeGame: boolean) => PostGameSummary | null;
  playInstantExhibition: (opponentClubId: string, gameSeed?: number) => PostGameSummary | null;
  saveCareerToSlot: (slotId: SaveSlotId) => Promise<void>;
  loadCareerFromSlot: (slotId: SaveSlotId) => Promise<boolean>;
  exportCurrentCareerJson: () => string;
  importCareerJson: (rawJson: string) => boolean;
}

interface AiClubSeedTemplate {
  city: string;
  name: string;
  mascot: string;
  monogram: string;
  primary: string;
  secondary: string;
  accent: string;
  archetype: AiArchetype;
}

const AI_ROOKIE_TEMPLATES: readonly AiClubSeedTemplate[] = [
  { city: 'Bayside', name: 'Pelicans', mascot: 'Pelican', monogram: 'BP', primary: '#1D63B8', secondary: '#0F2B46', accent: '#FFD166', archetype: 'ace_factory' },
  { city: 'Maple', name: 'Lumberjacks', mascot: 'Moose', monogram: 'ML', primary: '#B8332A', secondary: '#2E1A18', accent: '#F4A261', archetype: 'mashers' },
  { city: 'Cactus', name: 'Runners', mascot: 'Roadrunner', monogram: 'CR', primary: '#2FB356', secondary: '#1B4332', accent: '#FFC300', archetype: 'speed_demons' },
  { city: 'Ironwood', name: 'Knights', mascot: 'Hawk', monogram: 'IK', primary: '#5A4AE3', secondary: '#181B2C', accent: '#00E5FF', archetype: 'defense_first' },
  { city: 'Harbor', name: 'Pelicanos', mascot: 'Gull', monogram: 'HP', primary: '#0096C7', secondary: '#023E8A', accent: '#FFF3B0', archetype: 'moneyball' },
  { city: 'Sunset', name: 'coyotes', mascot: 'Coyote', monogram: 'SC', primary: '#F77F00', secondary: '#3A1C0E', accent: '#FCBF49', archetype: 'mashers' },
  { city: 'Clover', name: 'Shamrocks', mascot: 'Fox', monogram: 'CS', primary: '#1F9D55', secondary: '#0D3B22', accent: '#FFD166', archetype: 'speed_demons' },
];

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

    getHumanClub: () => findClubAcrossLeagues(get().leagues, get().humanClubId),

    startNewCareer: (input) => {
      const seed = input.seed ?? 1994;
      const rng = createSeededRng(seed);
      const humanClub = createClub(rng, {
        id: `club-human-${seed}`,
        city: input.city.trim() || 'Sandlot',
        name: input.clubName.trim() || 'Comets',
        mascot: input.mascot.trim() || 'Rocket Dog',
        colors: {
          primary: input.primaryColor,
          secondary: input.secondaryColor,
          accent: input.accentColor,
          monogram: input.monogram.trim().toUpperCase().slice(0, 2) || 'SC',
        },
        leagueTier: 'rookie',
        isHuman: true,
      });

      const aiClubs = AI_ROOKIE_TEMPLATES.map((tpl, idx) =>
        createClub(createSeededRng(seed + 100 + idx), {
          id: `club-ai-rookie-${idx + 1}`,
          city: tpl.city,
          name: tpl.name,
          mascot: tpl.mascot,
          colors: {
            primary: tpl.primary,
            secondary: tpl.secondary,
            accent: tpl.accent,
            monogram: tpl.monogram,
          },
          leagueTier: 'rookie',
          isHuman: false,
          aiArchetype: tpl.archetype,
        }),
      );

      const leagues = createEmptyLeagues();
      leagues.rookie = [humanClub, ...aiClubs];
      const freeAgents = generateMarketPool(createSeededRng(seed + 505), 'rookie', 12);

      set({
        worldSeed: seed,
        seasonNumber: 1,
        currentSeriesIndex: 0,
        rosterActionNonce: 1,
        humanClubId: humanClub.id,
        manager: createManagerProfile({
          name: input.managerName.trim() || 'Skipper',
          avatarSeed: seed,
        }),
        leagues,
        freeAgents,
        lastPostGameSummary: null,
      });
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

    signFreeAgent: (playerId) => {
      const club = get().getHumanClub();
      if (!club) return { signed: false, reason: 'No active club found.' };
      const incoming = get().freeAgents.find((p) => p.id === playerId);
      if (!incoming) return { signed: false, reason: 'Free agent is no longer available.' };

      const capCheck = validateRosterAddition(club.roster, incoming.id);
      if (!capCheck.allowed) {
        return { signed: false, reason: capCheck.reason };
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
        freeAgents: generateMarketPool(createSeededRng(save.worldSeed + 505), 'rookie', 12),
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
        freeAgents: generateMarketPool(createSeededRng(save.worldSeed + 505), 'rookie', 12),
        settings: save.settings,
        lastPostGameSummary: null,
      });
      return true;
    },
  }));
}

export const useGameStore = createGameStore();
