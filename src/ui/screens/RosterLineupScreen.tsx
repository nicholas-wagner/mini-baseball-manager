import { useState } from 'react';
import { ArrowLeftRight, Flame, Gamepad2, Save, Snowflake, Sparkles, UserPlus } from 'lucide-react';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { soundEngine } from '../../audio/soundEngine';
import type { FieldPosition } from '../../engine/handedness/types';
import { MAX_ACTIVE_ROSTER_SIZE } from '../../engine/models/club';
import {
  BATTED_BALL_TENDENCY_LABELS,
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
import { FlipBaseballCard } from '../components/FlipBaseballCard';
import { SaveSlotsModal } from '../components/SaveSlotsModal';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { formStateToCardMood, toBaseballCardPlayer } from '../utils/playerCardAdapter';

interface RosterLineupScreenProps {
  onPlayBall: () => void;
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

export function RosterLineupScreen({ onPlayBall }: RosterLineupScreenProps) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const freeAgents = useGameStore((s) => s.freeAgents);
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
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);

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
      swapLineupSlots(selectedSlotIdx, idx);
      soundEngine.play('bat_crack');
    }
    setSelectedSlotIdx(null);
  };

  const handleBenchSub = (playerId: string) => {
    setInspectedPlayerId(playerId);
    const targetIdx = selectedSlotIdx ?? 8;
    assignLineupPlayer(targetIdx, playerId);
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
      swapRotationOrder(selectedRotationIdx, idx);
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

  return (
    <div className="space-y-4">
      <ComicCard
        title={`${humanClub.city} ${humanClub.name} Clubhouse`}
        subtitle={`Record ${humanClub.wins}-${humanClub.losses} • Roster ${humanClub.roster.length}/${MAX_ACTIVE_ROSTER_SIZE} • Cash $${humanClub.economy.cash.toLocaleString()} • Hype ${humanClub.economy.teamHype}/100`}
        headerBg={humanClub.colors.secondary}
        badge={
          <div className="flex flex-wrap gap-2">
            <ComicButton
              size="sm"
              variant="gold"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => {
                autoOptimizeHumanLineup();
                soundEngine.play('level_up');
              }}
            >
              Auto-Optimize Lineup
            </ComicButton>
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
            data-testid="cross-train-feedback"
            className="mb-3 px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]"
          >
            {rosterMessage}
          </div>
        ) : null}

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
                  return (
                    <div
                      key={slot.orderIndex}
                      className={`p-2 rounded-xl border-2 border-[#181B2C] flex flex-wrap items-center justify-between gap-2 ${
                        isSelected ? 'bg-[#FFF3BF]' : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setInspectedPlayerId(player.id)}
                        className="flex items-center gap-2 text-left min-w-0 flex-1 min-h-[44px]"
                      >
                        <span className="w-7 h-7 rounded-lg bg-[#181B2C] text-[#FFD166] font-display text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#1B4332] text-[#FBF4E4] font-display text-[11px] shrink-0">
                          {slot.defensivePosition}
                        </span>
                        <FlagBadge nationalityId={player.nationalityId} size="sm" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-display text-xs text-[#181B2C] truncate">
                              {player.name}
                            </span>
                            {posEval.isFavorite ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#FFC300] text-[#181B2C] text-[10px] font-extrabold">
                                ★ FAV
                              </span>
                            ) : null}
                            {posEval.isOutOfPosition ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#FF4D6D] text-white text-[10px] font-extrabold">
                                OOP
                              </span>
                            ) : null}
                            {renderFormBadge(player.formState)}
                          </div>
                          <div className="text-[11px] font-bold text-[#4A5068]">
                            B/T: {player.bats}/{player.throws} • OVR {ovr} •{' '}
                            {SPECIALIST_LABELS[player.specialistArchetype]} • Pos: {eligibleList}
                          </div>
                        </div>
                      </button>

                      <ComicButton
                        size="sm"
                        variant={isSelected ? 'coral' : 'cream'}
                        active={isSelected}
                        icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                        aria-label={`Swap slot ${idx + 1}`}
                        onClick={() => handleSlotSwapClick(idx, player.id)}
                      >
                        {isSelected ? 'Selected' : 'Swap'}
                      </ComicButton>
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
                        className="text-left min-h-[44px] flex-1"
                      >
                        <div className="font-bold text-xs text-[#181B2C]">
                          SP{idx + 1}: {pitcher.name} ({pitcher.throws}HP)
                        </div>
                        <div className="text-[11px] font-bold text-[#4A5068]">
                          OVR {ovr} • {SPECIALIST_LABELS[pitcher.specialistArchetype]}
                        </div>
                      </button>
                      <ComicButton
                        size="sm"
                        variant={isSelected ? 'coral' : 'cream'}
                        aria-label={`Swap rotation SP${idx + 1}`}
                        onClick={() => handleRotationSwapClick(idx, pitcher.id)}
                      >
                        {isSelected ? 'Pick SP' : 'Swap'}
                      </ComicButton>
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
                      className="text-left text-xs font-bold text-[#181B2C] flex-1 min-h-[44px]"
                    >
                      {player.position} {player.name} ({player.bats}/{player.throws}) • OVR{' '}
                      {computePlayerOverall(player)} • {MARKET_TIER_LABELS[player.marketTier]}
                    </button>
                    <div className="flex gap-1">
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
                  <button
                    key={rp.id}
                    type="button"
                    onClick={() => setInspectedPlayerId(rp.id)}
                    className="w-full text-left py-1 text-xs font-bold text-[#4A5068] min-h-[44px]"
                  >
                    RP {rp.name} ({rp.throws}HP
                    {rp.pitcherRole ? ` • ${PITCHER_ROLE_SHORT_LABELS[rp.pitcherRole]}` : ''}) • OVR{' '}
                    {computePlayerOverall(rp)} • {SPECIALIST_LABELS[rp.specialistArchetype]}
                  </button>
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
                          Bonus ${fa.contract.signingBonus.toLocaleString()}
                        </div>
                      </div>
                      <ComicButton
                        size="sm"
                        variant="turf"
                        disabled={full || !canAfford}
                        onClick={() => handleSignAgent(fa.id, fa.name)}
                      >
                        Sign
                      </ComicButton>
                    </div>
                  );
                })}
              </div>
            </div>
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
                <span className="text-[#1B4332]">Fav: {inspectedPlayer.favoritePosition}</span>
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
                <span className="text-[#4A5068]">Fatigue {inspectedPlayer.fatigue}/100</span>
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
      </ComicCard>

      <SaveSlotsModal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
    </div>
  );
}
