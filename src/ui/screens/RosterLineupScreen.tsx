import { useState } from 'react';
import {
  ArrowLeftRight,
  Download,
  FileSearch,
  Flame,
  Gamepad2,
  Palette,
  Save,
  Snowflake,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { downloadPlayerCardPng } from '../../art/export/cardExporter';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import pendingPortrait from '../../art/portraits/illustrations/portrait-pending.svg';
import { soundEngine } from '../../audio/soundEngine';
import type { FieldPosition } from '../../engine/handedness/types';
import {
  computeClubPayroll,
  TIER_SALARY_CAPS,
  validateSalaryCapRoom,
} from '../../engine/gm/offseasonEngine';
import { summarizeLineupChange } from '../../engine/gm/seriesRecap';
import { MAX_ACTIVE_ROSTER_SIZE } from '../../engine/models/club';
import {
  BATTED_BALL_TENDENCY_LABELS,
  COED_TRAIT_LABELS,
  computePlayerOverall,
  EXPERIENCE_TIER_LABELS,
  isPitcherPosition,
  MARKET_TIER_LABELS,
  MENTAL_TRAIT_LABELS,
  PITCHER_ROLE_SHORT_LABELS,
  PITCH_TYPE_SHORT_LABELS,
  PRESSURE_PROFILE_LABELS,
  SPECIALIST_LABELS,
  type FormState,
} from '../../engine/models/player';
import { evaluateCoEdClubhouseSynergy } from '../../engine/rpg/coEdArchetypes';
import {
  computeBattingSabermetrics,
  computeFieldingSabermetrics,
  computePitchingSabermetrics,
  formatRate3,
} from '../../engine/simulation/sabermetrics';
import {
  evaluatePositionAssignment,
  getEligiblePositions,
} from '../../engine/rpg/specialistsAndPositions';
import type { TrainingDrillRequest } from '../../engine/rpg/trainingCompromises';
import { useGameStore } from '../../store/gameStore';
import { RosterPrintGallery } from '../components/GameDayPrints';
import { FlipBaseballCard } from '../components/FlipBaseballCard';
import {
  PlayerCardModal,
  type InspectableCardEntry,
} from '../components/PlayerCardModal';
import { PlayerPortraitBadge } from '../components/PlayerPortraitBadge';
import { PlayerDossierModal } from '../components/PlayerDossierModal';
import { SaveSlotsModal } from '../components/SaveSlotsModal';
import { TrainersTablePanel } from '../components/TrainersTablePanel';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { formStateToCardMood, toBaseballCardPlayer } from '../utils/playerCardAdapter';

interface RosterLineupScreenProps {
  onPlayBall: () => void;
  onOpenUniforms?: () => void;
}

const HITTER_CROSS_TRAIN_POSITIONS: readonly FieldPosition[] = [
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];
const PITCHER_CROSS_TRAIN_POSITIONS: readonly FieldPosition[] = ['SP', 'RP'];

function renderFormBadge(formState: FormState) {
  if (formState === 'blazing' || formState === 'hot') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#FF4D6D] text-white text-[10px] font-extrabold">
        <Flame className="w-3 h-3" /> {formState === 'blazing' ? 'ON FIRE' : 'HOT'}
      </span>
    );
  }
  if (formState === 'cold' || formState === 'frozen') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#4CC3FF] text-[#181B2C] text-[10px] font-extrabold">
        <Snowflake className="w-3 h-3" /> {formState === 'frozen' ? 'FROZEN' : 'COLD'}
      </span>
    );
  }
  return null;
}

export function RosterLineupScreen({ onPlayBall, onOpenUniforms }: RosterLineupScreenProps) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const freeAgents = useGameStore((s) => s.freeAgents);
  const individualDrillsRemaining = useGameStore((s) => s.individualDrillsRemaining);
  const favoritePlayerIds = useGameStore((s) => s.favoritePlayerIds);
  const toggleFavoritePlayer = useGameStore((s) => s.toggleFavoritePlayer);
  const customizePlayerProfile = useGameStore((s) => s.customizePlayerProfile);
  const swapLineupSlots = useGameStore((s) => s.swapLineupSlots);
  const assignLineupPlayer = useGameStore((s) => s.assignLineupPlayer);
  const autoOptimizeHumanLineup = useGameStore((s) => s.autoOptimizeHumanLineup);
  const swapRotationOrder = useGameStore((s) => s.swapRotationOrder);
  const crossTrainPlayerPosition = useGameStore((s) => s.crossTrainPlayerPosition);
  const runCompromiseTrainingDrill = useGameStore((s) => s.runCompromiseTrainingDrill);
  const signFreeAgent = useGameStore((s) => s.signFreeAgent);
  const releasePlayer = useGameStore((s) => s.releasePlayer);

  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [selectedRotationIdx, setSelectedRotationIdx] = useState<number | null>(null);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [printGallery, setPrintGallery] = useState(false);
  const [rosterView, setRosterView] = useState<'lineup' | 'cards'>('lineup');
  const [cardFilter, setCardFilter] = useState<'all' | 'favorites' | 'lineup' | 'pitchers' | 'bench'>('all');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [scoutFreeAgentId, setScoutFreeAgentId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [lineupOptimized, setLineupOptimized] = useState(false);

  if (!humanClub) return null;

  const rosterById = new Map(humanClub.roster.map((p) => [p.id, p]));
  const activeLineupIds = new Set(humanClub.lineup.map((s) => s.playerId));
  const benchHitters = humanClub.roster.filter(
    (p) => !isPitcherPosition(p.position) && !activeLineupIds.has(p.id),
  );
  const bullpenPitchers = humanClub.bullpenIds
    .map((id) => rosterById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const inspectedPlayer =
    (inspectedPlayerId ? rosterById.get(inspectedPlayerId) : null) ??
    rosterById.get(humanClub.lineup[0].playerId) ??
    humanClub.roster[0];

  const teamColors = {
    primary: humanClub.colors.primary,
    secondary: humanClub.colors.secondary,
    accent: humanClub.colors.accent,
    monogram: humanClub.colors.monogram,
  };

  const handleSlotSwapClick = (idx: number, playerId: string) => {
    setInspectedPlayerId(playerId);
    if (selectedSlotIdx === null) {
      setSelectedSlotIdx(idx);
      soundEngine.play('ui_pop');
      return;
    }
    if (selectedSlotIdx !== idx) {
      const playerA = rosterById.get(humanClub.lineup[selectedSlotIdx]?.playerId ?? '');
      const playerB = rosterById.get(playerId);
      swapLineupSlots(selectedSlotIdx, idx);
      setLineupOptimized(false);
      setRosterMessage(
        `⇄ Swapped #${selectedSlotIdx + 1} ${playerA?.name ?? 'Batter'} ↔ #${idx + 1} ${playerB?.name ?? 'Batter'}!`,
      );
      soundEngine.play('bat_crack');
    }
    setSelectedSlotIdx(null);
  };

  const handleBenchSub = (playerId: string) => {
    setInspectedPlayerId(playerId);
    const targetIdx = selectedSlotIdx ?? 8;
    const subPlayer = rosterById.get(playerId);
    assignLineupPlayer(targetIdx, playerId);
    setLineupOptimized(false);
    setRosterMessage(`✓ Inserted ${subPlayer?.name ?? 'bench player'} into batting slot #${targetIdx + 1}!`);
    setSelectedSlotIdx(null);
    soundEngine.play('ui_pop');
  };

  const handleRotationSwapClick = (idx: number, pitcherId: string) => {
    setInspectedPlayerId(pitcherId);
    if (selectedRotationIdx === null) {
      setSelectedRotationIdx(idx);
      soundEngine.play('ui_pop');
      return;
    }
    if (selectedRotationIdx !== idx) {
      const spA = rosterById.get(humanClub.rotationIds[selectedRotationIdx] ?? '');
      const spB = rosterById.get(pitcherId);
      swapRotationOrder(selectedRotationIdx, idx);
      setRosterMessage(
        `⇄ Swapped rotation SP${selectedRotationIdx + 1} (${spA?.name ?? 'Pitcher'}) ↔ SP${idx + 1} (${spB?.name ?? 'Pitcher'})!`,
      );
      soundEngine.play('glove_pop');
    }
    setSelectedRotationIdx(null);
  };

  const handleCrossTrain = (targetPos: FieldPosition) => {
    const res = crossTrainPlayerPosition(inspectedPlayer.id, targetPos);
    if (res.trained) {
      soundEngine.play('level_up');
      setRosterMessage(
        `Cross-trained ${inspectedPlayer.name} at ${targetPos} (+${res.deltaGain} mastery, -${res.rustApplied} rust elsewhere).`,
      );
    } else {
      setRosterMessage(res.reason ?? 'Unable to cross-train that position.');
    }
  };

  const handleCompromiseDrill = (request: TrainingDrillRequest) => {
    const res = runCompromiseTrainingDrill(inspectedPlayer.id, request);
    if (res.trained) {
      soundEngine.play('level_up');
      setRosterMessage(`${inspectedPlayer.name}: ${res.summary}`);
    } else {
      setRosterMessage(res.reason ?? 'Unable to run training drill.');
    }
  };

  const handleSignAgent = (playerId: string, playerName: string) => {
    const res = signFreeAgent(playerId);
    if (res.signed) {
      soundEngine.play('cash_chime');
      setInspectedPlayerId(playerId);
      setRosterMessage(`Signed ${playerName}!`);
    } else {
      setRosterMessage(res.reason ?? 'Unable to sign player.');
    }
  };

  const handleRelease = (playerId: string, playerName: string) => {
    const res = releasePlayer(playerId);
    if (res.released) {
      soundEngine.play('ui_pop');
      setRosterMessage(`Released ${playerName} to Free Agency.`);
    } else {
      setRosterMessage(res.reason ?? 'Unable to release player.');
    }
  };

  const crossTrainTargets = isPitcherPosition(inspectedPlayer.position)
    ? PITCHER_CROSS_TRAIN_POSITIONS
    : HITTER_CROSS_TRAIN_POSITIONS;
  const clubPayroll = computeClubPayroll(humanClub.roster);
  const salaryCap = TIER_SALARY_CAPS[humanClub.leagueTier];
  const coEdSynergy = evaluateCoEdClubhouseSynergy(humanClub.roster);

  const openCardModalFor = (playerId: string) => {
    setInspectedPlayerId(playerId);
    setCardModalOpen(true);
    soundEngine.play('card_flip');
  };

  const orderedRosterEntries: InspectableCardEntry[] = [];
  const seenRosterIds = new Set<string>();
  const pushRosterEntry = (p: (typeof humanClub.roster)[number] | undefined, roleTag: string) => {
    if (!p || seenRosterIds.has(p.id)) return;
    seenRosterIds.add(p.id);
    orderedRosterEntries.push({ player: p, club: humanClub, roleTag });
  };
  humanClub.lineup.forEach((slot, idx) => {
    pushRosterEntry(rosterById.get(slot.playerId), `LINEUP #${idx + 1} (${slot.defensivePosition})`);
  });
  humanClub.rotationIds.forEach((id, idx) => {
    pushRosterEntry(rosterById.get(id), `ROTATION SP${idx + 1}`);
  });
  bullpenPitchers.forEach((rp) => {
    pushRosterEntry(rp, rp.pitcherRole ? `BULLPEN (${PITCHER_ROLE_SHORT_LABELS[rp.pitcherRole]})` : 'BULLPEN');
  });
  benchHitters.forEach((p) => {
    pushRosterEntry(p, `BENCH (${p.position})`);
  });
  humanClub.roster.forEach((p) => {
    pushRosterEntry(p, p.position);
  });

  const filteredBinderEntries = orderedRosterEntries.filter(({ player }) => {
    if (cardFilter === 'favorites') return favoritePlayerIds.includes(player.id);
    if (cardFilter === 'lineup') return activeLineupIds.has(player.id);
    if (cardFilter === 'pitchers') return isPitcherPosition(player.position);
    if (cardFilter === 'bench') return !isPitcherPosition(player.position) && !activeLineupIds.has(player.id);
    return true;
  });
  const activeCardModalEntry =
    orderedRosterEntries.find((e) => e.player.id === inspectedPlayer.id) ??
    orderedRosterEntries[0] ??
    null;

  const triggerPngDownload = (player: (typeof humanClub.roster)[number]) => {
    void downloadPlayerCardPng(
      player,
      teamColors,
      `${humanClub.city} ${humanClub.name}`,
    ).then((res) => {
      setRosterMessage(
        `Exported 90s Baseball Card: ${res.filename} (${res.format.toUpperCase()})!`,
      );
      soundEngine.play('card_flip');
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <ComicCard
        title={`${humanClub.city} ${humanClub.name} Roster`}
        subtitle={`Record ${humanClub.wins}-${humanClub.losses} • Roster ${humanClub.roster.length}/${MAX_ACTIVE_ROSTER_SIZE} • Payroll $${clubPayroll.toLocaleString()}/$${salaryCap.toLocaleString()} • Cash $${humanClub.economy.cash.toLocaleString()} • Hype ${humanClub.economy.teamHype}/100`}
        headerBg={humanClub.colors.secondary}
        badge={
          <div className="flex flex-wrap gap-2">
            <ComicButton
              size="sm"
              variant={lineupOptimized ? 'turf' : 'gold'}
              data-testid="roster-auto-optimize-btn"
              data-confirmed={lineupOptimized ? 'true' : undefined}
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => {
                const beforeLineup = humanClub.lineup;
                autoOptimizeHumanLineup();
                const afterLineup =
                  useGameStore.getState().getHumanClub()?.lineup ?? beforeLineup;
                const diff = summarizeLineupChange(
                  beforeLineup,
                  afterLineup,
                  'for best OVR & defense',
                );
                setLineupOptimized(true);
                setRosterMessage(`✓ ${diff.message}`);
                soundEngine.play('level_up');
              }}
            >
              {lineupOptimized ? '✓ Lineup Optimized!' : 'Auto-Optimize Lineup'}
            </ComicButton>
            {onOpenUniforms ? (
              <ComicButton
                size="sm"
                variant="cream"
                data-testid="roster-open-uniforms-btn"
                icon={<Palette className="w-4 h-4" />}
                onClick={() => {
                  soundEngine.play('ui_pop');
                  onOpenUniforms();
                }}
              >
                Uniforms
              </ComicButton>
            ) : null}
            <ComicButton
              size="sm"
              variant="sky"
              icon={<Save className="w-4 h-4" />}
              onClick={() => setSaveModalOpen(true)}
            >
              Save / Load
            </ComicButton>
            <ComicButton
              size="sm"
              variant="turf"
              icon={<Gamepad2 className="w-4 h-4" />}
              onClick={onPlayBall}
            >
              Play Ball!
            </ComicButton>
          </div>
        }
      >
        {rosterMessage ? (
          <div
            role="status"
            data-testid="cross-train-feedback"
            className="mb-3 px-3 py-2 rounded-xl border-2 border-[#1B4332] bg-[#D8F3DC] text-xs font-extrabold text-[#1B4332] shadow-[2px_2px_0_#181B2C]"
          >
            {rosterMessage}
          </div>
        ) : null}

        {rosterView === 'lineup' ? (
          <details
            data-testid="coed-synergy-banner"
            className="mb-2.5 px-3 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] text-xs font-bold text-[#1D3557]"
          >
            <summary className="cursor-pointer font-display text-[11px] sm:text-xs flex items-center justify-between gap-2 list-none">
              <span className="truncate">
                ✨ Synergy: {coEdSynergy.label} ({coEdSynergy.maleCount}M / {coEdSynergy.femaleCount}F)
              </span>
              <span className="text-[10px] font-heading font-extrabold underline shrink-0">
                Details ▾
              </span>
            </summary>
            <p className="mt-1 text-[11px] font-bold text-[#1D3557]/90">{coEdSynergy.summary}</p>
          </details>
        ) : null}

        {/* Crisp 1-Row 3-Column Segmented Switch: Lineup | Cards | Gallery */}
        <div className="mb-3 space-y-1 p-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4]">
          <div data-testid="roster-view-tabs" className="grid grid-cols-3 gap-1.5 w-full">
            <ComicButton
              size="sm"
              data-testid="roster-view-lineup-btn"
              variant={rosterView === 'lineup' ? 'gold' : 'cream'}
              active={rosterView === 'lineup'}
              className="w-full px-1.5 text-[11px] sm:text-xs whitespace-nowrap"
              onClick={() => {
                setRosterView('lineup');
                setPrintGallery(false);
                soundEngine.play('ui_pop');
              }}
            >
              📋 Lineup
            </ComicButton>
            <ComicButton
              size="sm"
              data-testid="roster-view-cards-btn"
              variant={rosterView === 'cards' && !printGallery ? 'coral' : 'cream'}
              active={rosterView === 'cards' && !printGallery}
              className="w-full px-1.5 text-[11px] sm:text-xs whitespace-nowrap"
              onClick={() => {
                setRosterView('cards');
                setPrintGallery(false);
                soundEngine.play('card_flip');
              }}
            >
              🃏 Cards ({humanClub.roster.length})
            </ComicButton>
            <ComicButton
              size="sm"
              data-testid="roster-view-gallery-btn"
              variant={rosterView === 'cards' && printGallery ? 'turf' : 'cream'}
              active={rosterView === 'cards' && printGallery}
              className="w-full px-1.5 text-[11px] sm:text-xs whitespace-nowrap"
              onClick={() => {
                setRosterView('cards');
                setPrintGallery(true);
                soundEngine.play('card_flip');
              }}
            >
              🖼️ Gallery
            </ComicButton>
          </div>
          <div className="text-[10.5px] font-bold text-[#4A5068] px-1">
            {rosterView === 'cards'
              ? printGallery
                ? 'Tap a print to enlarge it.'
                : 'Tap any card to flip, star, or nickname!'
              : 'Tap any player row to flip their illustrated 90s card'}
          </div>
        </div>

        {rosterView === 'cards' ? (
          <div data-testid="roster-card-binder" className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${humanClub.roster.length})` },
                  { id: 'favorites', label: `⭐ Favorites (${favoritePlayerIds.length})` },
                  { id: 'lineup', label: 'Lineup (9)' },
                  { id: 'pitchers', label: 'Pitchers' },
                  { id: 'bench', label: 'Bench' },
                ] as const
              ).map((tab) => (
                <ComicButton
                  key={tab.id}
                  size="sm"
                  variant={cardFilter === tab.id ? 'sky' : 'cream'}
                  active={cardFilter === tab.id}
                  onClick={() => {
                    setCardFilter(tab.id);
                    soundEngine.play('ui_pop');
                  }}
                >
                  {tab.label}
                </ComicButton>
              ))}
              <button
                type="button"
                className="ml-auto min-h-11 px-3 text-sm font-bold underline cursor-pointer"
                aria-pressed={printGallery}
                onClick={() => setPrintGallery((v) => !v)}
              >
                {printGallery ? 'Stat cards' : 'Print gallery'}
              </button>
            </div>

            {printGallery ? (
              <RosterPrintGallery club={humanClub.name} players={filteredBinderEntries.map((e) => e.player)} />
            ) : filteredBinderEntries.length === 0 ? (
              <div className="p-5 rounded-2xl border-2 border-dashed border-[#181B2C]/35 bg-[#FFFDF7] text-center space-y-1">
                <div className="font-display text-sm text-[#181B2C]">
                  {cardFilter === 'favorites' ? 'No ⭐ Favorite Players Yet!' : 'No Cards in This Filter'}
                </div>
                <div className="text-xs font-bold text-[#4A5068]">
                  Tap ☆ on any player card or lineup row to pin your favorite stars here.
                </div>
              </div>
            ) : (
              <div
                data-testid="roster-binder-grid"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3"
              >
                {filteredBinderEntries.map(({ player, roleTag }) => {
                  const ovr = computePlayerOverall(player);
                  const isFav = favoritePlayerIds.includes(player.id);
                  const portraitSrc = playerIllustration(player.id) ?? pendingPortrait;
                  const rarityRing =
                    player.rarity === 'mvp'
                      ? 'bg-gradient-to-br from-[#FFF3BF] via-[#FFD166] to-[#FFADAD]'
                      : player.rarity === 'allstar'
                        ? 'bg-gradient-to-br from-[#E0FBFC] via-[#FFFDF7] to-[#D8F3DC]'
                        : 'bg-[#FFFDF7]';
                  return (
                    <div
                      key={player.id}
                      data-testid="roster-binder-card-slot"
                      className={`relative rounded-2xl border-[2.5px] border-[#181B2C] shadow-[3px_3px_0_#181B2C] overflow-hidden flex flex-col ${rarityRing}`}
                    >
                      <button
                        type="button"
                        data-testid="binder-star-btn"
                        aria-pressed={isFav}
                        aria-label={`Toggle favorite for ${player.name}`}
                        onClick={() => {
                          toggleFavoritePlayer(player.id);
                          soundEngine.play('ui_pop');
                        }}
                        className={`absolute top-1.5 right-1.5 z-10 w-9 h-9 rounded-xl border-2 border-[#181B2C] flex items-center justify-center text-sm font-extrabold cursor-pointer shadow-[2px_2px_0_#181B2C] ${
                          isFav
                            ? 'bg-[#FFC300] text-[#181B2C]'
                            : 'bg-[#FFFDF7]/95 text-[#4A5068] hover:bg-[#FFF3BF]'
                        }`}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>

                      <button
                        type="button"
                        data-testid="binder-card-open-btn"
                        onClick={() => openCardModalFor(player.id)}
                        className="w-full text-left flex-1 flex flex-col cursor-pointer group"
                      >
                        <div className="px-2 pt-2 pb-1 flex items-center gap-1 pr-11">
                          <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[10px]">
                            {player.position}
                          </span>
                          <span className="font-mono-tabular text-[10px] font-extrabold text-[#1D3557]">
                            #{player.jerseyNumber}
                          </span>
                          <span className="ml-auto px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#1B4332] text-[#1B4332] font-mono-tabular text-[10px] font-extrabold">
                            OVR {ovr}
                          </span>
                        </div>
                        <div className="px-2">
                          <div className="rounded-xl border-2 border-[#181B2C] overflow-hidden bg-[#FBF4E4] aspect-[4/4.6]">
                            <img
                              src={portraitSrc}
                              alt={`${player.name} baseball card`}
                              loading="lazy"
                              className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform"
                            />
                          </div>
                        </div>
                        <div className="px-2 py-2 space-y-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <FlagBadge nationalityId={player.nationalityId} size="sm" />
                            <span className="font-display text-xs text-[#181B2C] truncate">
                              {player.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-[#4A5068]">
                            <span className="truncate">{roleTag}</span>
                            <span className="text-[#1D3557] font-extrabold shrink-0">Flip →</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-xs uppercase tracking-wider text-[#181B2C]">
                  9-Man Batting Order{' '}
                  {selectedSlotIdx !== null
                    ? `(Swap Slot ${selectedSlotIdx + 1} with…)`
                    : '(Tap 2 slots to swap)'}
                </h3>
              </div>
              <div className="space-y-2">
                {humanClub.lineup.map((slot, idx) => {
                  const player = rosterById.get(slot.playerId);
                  if (!player) return null;
                  const ovr = computePlayerOverall(player);
                  const posEval = evaluatePositionAssignment(player, slot.defensivePosition);
                  const eligibleList = getEligiblePositions(player).join('/');
                  const isSelected = selectedSlotIdx === idx;
                  const isFavPlayer = favoritePlayerIds.includes(player.id);
                  return (
                    <div
                      key={slot.orderIndex}
                      className={`p-2 rounded-xl border-2 border-[#181B2C] flex items-center justify-between gap-1.5 ${
                        isSelected ? 'bg-[#FFF3BF]' : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <button
                        type="button"
                        data-testid="roster-open-card-btn"
                        aria-label={`View card for ${player.name}`}
                        onClick={() => openCardModalFor(player.id)}
                        className="flex items-center gap-2 text-left min-w-0 flex-1 min-h-[44px] cursor-pointer"
                      >
                        <span className="w-6 h-6 rounded-lg bg-[#181B2C] text-[#FFD166] font-display text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <PlayerPortraitBadge
                          player={player}
                          primaryColor={humanClub.colors.primary}
                          accentColor={humanClub.colors.accent}
                          size="xs"
                          testId="roster-lineup-portrait"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-xs sm:text-sm text-[#181B2C] leading-tight truncate">
                            {isFavPlayer ? '⭐ ' : ''}
                            {player.name}
                          </div>
                          <div
                            title={`Bats ${player.bats} / Throws ${player.throws} • Pos: ${eligibleList}`}
                            className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-bold text-[#4A5068]"
                          >
                            <span className="px-1 py-0.5 rounded bg-[#1B4332] text-[#FBF4E4] font-display text-[9px] shrink-0">
                              {slot.defensivePosition}
                            </span>
                            <FlagBadge nationalityId={player.nationalityId} size="sm" />
                            <span className="px-1 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[9px] font-extrabold shrink-0">
                              {ovr}
                            </span>
                            <span className="shrink-0">
                              {player.bats}/{player.throws}
                            </span>
                            <span className="hidden sm:inline truncate">
                              · {SPECIALIST_LABELS[player.specialistArchetype]}
                            </span>
                            {posEval.isFavorite ? (
                              <span
                                title="Natural Favorite Position (+5 Fielding boost!)"
                                className="px-1 py-0.5 rounded bg-[#FFC300] text-[#181B2C] text-[9px] font-extrabold shrink-0"
                              >
                                ★ FAV
                              </span>
                            ) : null}
                            {posEval.isOutOfPosition ? (
                              <span
                                title="Learning Position (Out of Position — Auto-Optimize or Cross-Train!)"
                                className="px-1 py-0.5 rounded bg-[#FF4D6D] text-white text-[9px] font-extrabold shrink-0"
                              >
                                ⚠️ Pos
                              </span>
                            ) : null}
                            {renderFormBadge(player.formState)}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-testid="roster-star-btn"
                          aria-pressed={isFavPlayer}
                          aria-label={`Toggle favorite for ${player.name}`}
                          onClick={() => {
                            toggleFavoritePlayer(player.id);
                            soundEngine.play('ui_pop');
                          }}
                          className={`min-h-[38px] min-w-[36px] rounded-xl border-2 border-[#181B2C] flex items-center justify-center text-sm font-extrabold cursor-pointer transition ${
                            isFavPlayer
                              ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                              : 'bg-[#FBF4E4] text-[#4A5068] hover:bg-[#FFF3BF]'
                          }`}
                        >
                          {isFavPlayer ? '⭐' : '☆'}
                        </button>
                        <ComicButton
                          size="sm"
                          variant={isSelected ? 'coral' : 'cream'}
                          active={isSelected}
                          icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                          aria-label={`Swap slot ${idx + 1}`}
                          onClick={() => handleSlotSwapClick(idx, player.id)}
                          className="px-1.5 sm:px-2.5 min-h-[38px] text-[10.5px] sm:text-xs"
                        >
                          <span className="hidden sm:inline">{isSelected ? 'Selected' : 'Swap'}</span>
                          <span className="sm:hidden">{isSelected ? 'Pick' : 'Swap'}</span>
                        </ComicButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
                <div className="font-display text-xs text-[#181B2C]">
                  Starting Rotation (SP1–SP3)
                </div>
                {humanClub.rotationIds.map((pitcherId, idx) => {
                  const pitcher = rosterById.get(pitcherId);
                  if (!pitcher) return null;
                  const ovr = computePlayerOverall(pitcher);
                  const isSelected = selectedRotationIdx === idx;
                  return (
                    <div
                      key={pitcher.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-[#181B2C]/15 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => setInspectedPlayerId(pitcher.id)}
                        className="flex items-center gap-2 text-left min-h-[44px] flex-1 min-w-0"
                      >
                        <PlayerPortraitBadge
                          player={pitcher}
                          primaryColor={humanClub.colors.primary}
                          accentColor={humanClub.colors.accent}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#181B2C] truncate">
                            SP{idx + 1}: {pitcher.name} ({pitcher.throws}HP)
                          </div>
                          <div className="text-[11px] font-bold text-[#4A5068]">
                            OVR {ovr} • {SPECIALIST_LABELS[pitcher.specialistArchetype]}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <ComicButton
                          size="sm"
                          variant="sky"
                          data-testid="roster-open-card-btn"
                          aria-label={`View card for ${pitcher.name}`}
                          onClick={() => openCardModalFor(pitcher.id)}
                        >
                          🃏
                        </ComicButton>
                        <ComicButton
                          size="sm"
                          variant={isSelected ? 'coral' : 'cream'}
                          aria-label={`Swap rotation SP${idx + 1}`}
                          onClick={() => handleRotationSwapClick(idx, pitcher.id)}
                        >
                          {isSelected ? 'Pick SP' : 'Swap'}
                        </ComicButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
                <div className="font-display text-xs text-[#181B2C]">
                  Bench Hitters & Bullpen
                </div>
                {benchHitters.map((player) => (
                  <div
                    key={player.id}
                    className="flex flex-wrap items-center justify-between gap-1.5 py-1 border-b border-[#181B2C]/15"
                  >
                    <button
                      type="button"
                      onClick={() => setInspectedPlayerId(player.id)}
                      className="flex items-center gap-2 text-left text-xs font-bold text-[#181B2C] flex-1 min-h-[44px] min-w-0"
                    >
                      <PlayerPortraitBadge
                        player={player}
                        primaryColor={humanClub.colors.primary}
                        accentColor={humanClub.colors.accent}
                        size="xs"
                      />
                      <span className="truncate">
                        {player.position} {player.name} ({player.bats}/{player.throws}) • OVR{' '}
                        {computePlayerOverall(player)} • {MARKET_TIER_LABELS[player.marketTier]}
                      </span>
                    </button>
                    <div className="flex gap-1">
                      <ComicButton
                        size="sm"
                        variant="gold"
                        data-testid="roster-open-card-btn"
                        aria-label={`View card for ${player.name}`}
                        onClick={() => openCardModalFor(player.id)}
                      >
                        🃏
                      </ComicButton>
                      <ComicButton size="sm" variant="sky" onClick={() => handleBenchSub(player.id)}>
                        Sub In
                      </ComicButton>
                      <ComicButton
                        size="sm"
                        variant="coral"
                        onClick={() => handleRelease(player.id, player.name)}
                      >
                        Release
                      </ComicButton>
                    </div>
                  </div>
                ))}
                {bullpenPitchers.map((rp) => (
                  <div
                    key={rp.id}
                    className="flex items-center justify-between gap-1.5 py-1 border-b border-[#181B2C]/15 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => setInspectedPlayerId(rp.id)}
                      className="flex items-center gap-2 text-left py-1 text-xs font-bold text-[#4A5068] flex-1 min-h-[44px] min-w-0"
                    >
                      <PlayerPortraitBadge
                        player={rp}
                        primaryColor={humanClub.colors.primary}
                        accentColor={humanClub.colors.accent}
                        size="xs"
                      />
                      <span className="truncate">
                        RP {rp.name} ({rp.throws}HP
                        {rp.pitcherRole ? ` • ${PITCHER_ROLE_SHORT_LABELS[rp.pitcherRole]}` : ''}) • OVR{' '}
                        {computePlayerOverall(rp)} • {SPECIALIST_LABELS[rp.specialistArchetype]}
                      </span>
                    </button>
                    <ComicButton
                      size="sm"
                      variant="sky"
                      data-testid="roster-open-card-btn"
                      aria-label={`View card for ${rp.name}`}
                      onClick={() => openCardModalFor(rp.id)}
                    >
                      🃏
                    </ComicButton>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-display text-xs text-[#181B2C]">
                  <UserPlus className="w-4 h-4 text-[#2FB356]" />
                  Free Agent Wire (Cap {humanClub.roster.length}/{MAX_ACTIVE_ROSTER_SIZE})
                </div>
                <span className="text-[11px] font-bold text-[#4A5068]">
                  Rookies grow fast • Veterans stay steady • All-Stars cost big
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {freeAgents.slice(0, 6).map((fa) => {
                  const full = humanClub.roster.length >= MAX_ACTIVE_ROSTER_SIZE;
                  const canAfford = humanClub.economy.cash >= fa.contract.signingBonus;
                  const fitsCap = validateSalaryCapRoom(humanClub, fa.contract.salaryPerSeason).allowed;
                  return (
                    <div
                      key={fa.id}
                      className="p-2 rounded-xl border-2 border-[#181B2C]/30 bg-white flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-xs text-[#181B2C] truncate">
                            {fa.position} {fa.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#1D3557] text-[#FFD166] text-[10px] font-extrabold">
                            {MARKET_TIER_LABELS[fa.marketTier]}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-[#4A5068]">
                          OVR {computePlayerOverall(fa)} • {SPECIALIST_LABELS[fa.specialistArchetype]} •
                          ${fa.contract.salaryPerSeason.toLocaleString()}/yr • Bonus ${fa.contract.signingBonus.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ComicButton
                          size="sm"
                          variant="sky"
                          data-testid="fa-scout-card-btn"
                          aria-label={`Scout card for ${fa.name}`}
                          onClick={() => {
                            setScoutFreeAgentId(fa.id);
                            soundEngine.play('card_flip');
                          }}
                        >
                          🃏 Scout
                        </ComicButton>
                        <ComicButton
                          size="sm"
                          variant="turf"
                          disabled={full || !canAfford || !fitsCap}
                          onClick={() => handleSignAgent(fa.id, fa.name)}
                        >
                          Sign
                        </ComicButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <TrainersTablePanel club={humanClub} onMessage={setRosterMessage} />
          </div>

          <div className="mx-auto w-full max-w-[300px] space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C] text-center">
              Selected Player Card
            </div>
            <FlipBaseballCard
              player={toBaseballCardPlayer(inspectedPlayer)}
              team={teamColors}
              mood={formStateToCardMood(inspectedPlayer.formState)}
            />
            <ComicButton
              size="sm"
              variant="sky"
              icon={<FileSearch className="w-4 h-4" />}
              className="w-full"
              onClick={() => {
                setDossierOpen(true);
                soundEngine.play('ui_pop');
              }}
            >
              Full Scouting Dossier
            </ComicButton>
            <ComicButton
              size="sm"
              variant="gold"
              icon={<Download className="w-4 h-4" />}
              className="w-full"
              onClick={() => {
                void downloadPlayerCardPng(
                  inspectedPlayer,
                  teamColors,
                  `${humanClub.city} ${humanClub.name}`,
                ).then((res) => {
                  setRosterMessage(
                    `Exported 90s Baseball Card: ${res.filename} (${res.format.toUpperCase()})!`,
                  );
                  soundEngine.play('card_flip');
                });
              }}
            >
              Download 90s Card (PNG)
            </ComicButton>
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              {isPitcherPosition(inspectedPlayer.position) && inspectedPlayer.pitchArsenal ? (
                <>
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-[#181B2C]">
                    <span>Pitch Arsenal ({inspectedPlayer.pitchArsenal.repertoire.length} Pitches)</span>
                    <span className="text-[#1B4332]">
                      ★ {PITCH_TYPE_SHORT_LABELS[inspectedPlayer.pitchArsenal.favoritePitch]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {inspectedPlayer.pitchArsenal.repertoire.map((slot) => {
                      const isFav = slot.pitchType === inspectedPlayer.pitchArsenal!.favoritePitch;
                      const isWeak = slot.pitchType === inspectedPlayer.pitchArsenal!.weakestPitch;
                      return (
                        <span
                          key={slot.pitchType}
                          className={`px-1.5 py-0.5 rounded border border-[#181B2C] text-[10px] font-extrabold ${
                            isFav
                              ? 'bg-[#FFC300] text-[#181B2C]'
                              : isWeak
                                ? 'bg-[#FFE5EC] text-[#9D0208]'
                                : 'bg-white text-[#181B2C]'
                          }`}
                        >
                          {isFav ? '★ ' : ''}
                          {PITCH_TYPE_SHORT_LABELS[slot.pitchType]} {slot.mastery}
                          {isWeak ? ' (Weak)' : ''}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-extrabold uppercase text-[#181B2C]">
                    Batter Pitch Scouting
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold">
                    <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[#1B4332]">
                      Crushes: {PITCH_TYPE_SHORT_LABELS[inspectedPlayer.batterPitchProfile.favoritePitch]} (
                      +{inspectedPlayer.batterPitchProfile.pitchRecognition[inspectedPlayer.batterPitchProfile.favoritePitch] ?? 12})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[#9D0208]">
                      Weak vs: {PITCH_TYPE_SHORT_LABELS[inspectedPlayer.batterPitchProfile.weakPitch]} (
                      {inspectedPlayer.batterPitchProfile.pitchRecognition[inspectedPlayer.batterPitchProfile.weakPitch] ?? -12})
                    </span>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-1 pt-1 border-t border-[#181B2C]/15 text-[10px] font-extrabold">
                <span className="px-1.5 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C] text-[#1D3557]">
                  {PRESSURE_PROFILE_LABELS[inspectedPlayer.pressureProfile]}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#F6EEFF] border border-[#181B2C] text-[#4A148C]">
                  {COED_TRAIT_LABELS[inspectedPlayer.coEdTrait]}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[#1B4332]">
                  {EXPERIENCE_TIER_LABELS[inspectedPlayer.careerService.experienceTier]} •{' '}
                  {inspectedPlayer.careerService.seasonsPlayed} Yr
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[#181B2C]">
                  Luck {inspectedPlayer.ratings.luck}
                </span>
                {inspectedPlayer.mentalTraits.map((trait) => (
                  <span
                    key={trait}
                    className="px-1.5 py-0.5 rounded bg-[#F1E4C8] border border-[#181B2C] text-[#181B2C]"
                  >
                    {MENTAL_TRAIT_LABELS[trait]}
                  </span>
                ))}
              </div>
              <div className="pt-1 border-t border-[#181B2C]/15 text-[10px] font-bold text-[#4A5068]">
                {(() => {
                  if (isPitcherPosition(inspectedPlayer.position)) {
                    const p = computePitchingSabermetrics(inspectedPlayer.seasonStats);
                    return `ERA ${p.era.toFixed(2)} • WHIP ${p.whip.toFixed(2)} • K/9 ${p.kPer9.toFixed(1)} • Strk ${Math.round(p.strikeRate * 100)}% • ${BATTED_BALL_TENDENCY_LABELS[inspectedPlayer.battedBallProfile.tendency]}`;
                  }
                  const b = computeBattingSabermetrics(inspectedPlayer.seasonStats);
                  const f = computeFieldingSabermetrics(inspectedPlayer.seasonStats);
                  return `AVG ${formatRate3(b.avg)} / OBP ${formatRate3(b.obp)} / OPS ${formatRate3(b.ops)} • RNG ${inspectedPlayer.ratings.range} • FPCT ${formatRate3(f.fpct)} • ${BATTED_BALL_TENDENCY_LABELS[inspectedPlayer.battedBallProfile.tendency]}`;
                })()}
              </div>
            </div>
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-[#181B2C]">
                <span>Cross-Train Position</span>
                <span className="text-[#1B4332]">
                  🏋️ {individualDrillsRemaining}/2 Drills • Fav: {inspectedPlayer.favoritePosition}
                </span>
              </div>
              <div className="text-[10px] font-bold text-[#4A5068]">
                Gains mastery at target spot, adds rust elsewhere.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {crossTrainTargets.map((pos) => {
                  const leftyBlocked =
                    inspectedPlayer.throws === 'L' &&
                    (pos === '2B' || pos === '3B' || pos === 'SS');
                  const prof = inspectedPlayer.positionProficiency[pos];
                  return (
                    <ComicButton
                      key={pos}
                      size="sm"
                      variant={pos === inspectedPlayer.favoritePosition ? 'gold' : 'cream'}
                      disabled={leftyBlocked}
                      onClick={() => handleCrossTrain(pos)}
                    >
                      Train {pos}
                      {prof ? ` (${prof})` : ''}
                    </ComicButton>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-[#181B2C]">
                <span>Compromise Training Lab</span>
                <span className="text-[#4A5068]">
                  🏋️ {individualDrillsRemaining}/2 Drills • Fat {inspectedPlayer.fatigue}
                </span>
              </div>
              <div className="text-[10px] font-bold text-[#4A5068]">
                Every drill trades one edge for another inside player stat caps.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isPitcherPosition(inspectedPlayer.position) && inspectedPlayer.pitchArsenal ? (
                  <>
                    <ComicButton
                      size="sm"
                      variant="sky"
                      onClick={() =>
                        handleCompromiseDrill({
                          drillId: 'bullpen_pitch_lab_polish',
                          targetPitch: inspectedPlayer.pitchArsenal!.weakestPitch,
                        })
                      }
                    >
                      Pitch Lab (+{PITCH_TYPE_SHORT_LABELS[inspectedPlayer.pitchArsenal.weakestPitch]} / -Rust)
                    </ComicButton>
                    <ComicButton
                      size="sm"
                      variant="cream"
                      onClick={() => handleCompromiseDrill({ drillId: 'velocity_conditioning' })}
                    >
                      Velo Drill (+VEL / -CTL)
                    </ComicButton>
                    <ComicButton
                      size="sm"
                      variant="cream"
                      onClick={() => handleCompromiseDrill({ drillId: 'command_pinpoint' })}
                    >
                      Control Drill (+CTL / -VEL)
                    </ComicButton>
                  </>
                ) : (
                  <>
                    <ComicButton
                      size="sm"
                      variant="sky"
                      onClick={() =>
                        handleCompromiseDrill({
                          drillId: 'batter_pitch_recognition',
                          targetPitch: inspectedPlayer.batterPitchProfile.weakPitch,
                        })
                      }
                    >
                      Pitch Timing (+{PITCH_TYPE_SHORT_LABELS[inspectedPlayer.batterPitchProfile.weakPitch]} / -Drift)
                    </ComicButton>
                    <ComicButton
                      size="sm"
                      variant="cream"
                      onClick={() => handleCompromiseDrill({ drillId: 'power_launch_cage' })}
                    >
                      Power Cage (+PWR / -CON)
                    </ComicButton>
                    <ComicButton
                      size="sm"
                      variant="cream"
                      onClick={() => handleCompromiseDrill({ drillId: 'contact_choke_up' })}
                    >
                      Contact Cage (+CON / -PWR)
                    </ComicButton>
                    <ComicButton
                      size="sm"
                      variant="cream"
                      onClick={() => handleCompromiseDrill({ drillId: 'speed_sprint_track' })}
                    >
                      Speed Track (+SPD / -PWR)
                    </ComicButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </ComicCard>

      <PlayerCardModal
        open={cardModalOpen}
        entry={activeCardModalEntry}
        allEntries={orderedRosterEntries}
        isFavorite={
          activeCardModalEntry
            ? favoritePlayerIds.includes(activeCardModalEntry.player.id)
            : false
        }
        onToggleFavorite={
          activeCardModalEntry
            ? () => toggleFavoritePlayer(activeCardModalEntry.player.id)
            : undefined
        }
        onCustomizePlayer={
          activeCardModalEntry
            ? (patch) => customizePlayerProfile(activeCardModalEntry.player.id, patch)
            : undefined
        }
        onSelectPlayerId={(id) => setInspectedPlayerId(id)}
        onOpenDossier={(p) => {
          setInspectedPlayerId(p.id);
          setCardModalOpen(false);
          setDossierOpen(true);
        }}
        onDownloadCard={(p) => triggerPngDownload(p)}
        onClose={() => setCardModalOpen(false)}
      />

      {(() => {
        const faClubShell = {
          ...humanClub,
          city: 'Free Agent',
          name: 'Market',
          colors: {
            primary: '#1D3557',
            secondary: '#181B2C',
            accent: '#FFC300',
            monogram: 'FA',
          },
        };
        const faEntries: InspectableCardEntry[] = freeAgents.slice(0, 8).map((fa) => ({
          player: fa,
          club: faClubShell,
          roleTag: `FREE AGENT • ${MARKET_TIER_LABELS[fa.marketTier]} ($${fa.contract.salaryPerSeason.toLocaleString()}/yr)`,
        }));
        const activeFaEntry = scoutFreeAgentId
          ? (faEntries.find((e) => e.player.id === scoutFreeAgentId) ?? null)
          : null;
        return (
          <PlayerCardModal
            open={scoutFreeAgentId !== null}
            entry={activeFaEntry}
            allEntries={faEntries}
            onSelectPlayerId={(id) => setScoutFreeAgentId(id)}
            onClose={() => setScoutFreeAgentId(null)}
          />
        );
      })()}

      <PlayerDossierModal
        player={dossierOpen ? inspectedPlayer : null}
        clubName={`${humanClub.city} ${humanClub.name}`}
        onClose={() => setDossierOpen(false)}
      />

      <SaveSlotsModal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
    </div>
  );
}
