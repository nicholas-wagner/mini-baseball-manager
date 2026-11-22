import { useState } from 'react';
import { ArrowLeftRight, Gamepad2, Save, Sparkles } from 'lucide-react';
import { FlagBadge } from '../../art/flags/FlagBadge';
import { soundEngine } from '../../audio/soundEngine';
import { computePlayerOverall, isPitcherPosition } from '../../engine/models/player';
import { useGameStore } from '../../store/gameStore';
import { FlipBaseballCard } from '../components/FlipBaseballCard';
import { SaveSlotsModal } from '../components/SaveSlotsModal';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { toBaseballCardPlayer } from '../utils/playerCardAdapter';

interface RosterLineupScreenProps {
  onPlayBall: () => void;
}

export function RosterLineupScreen({ onPlayBall }: RosterLineupScreenProps) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const swapLineupSlots = useGameStore((s) => s.swapLineupSlots);
  const assignLineupPlayer = useGameStore((s) => s.assignLineupPlayer);
  const autoOptimizeHumanLineup = useGameStore((s) => s.autoOptimizeHumanLineup);
  const swapRotationOrder = useGameStore((s) => s.swapRotationOrder);

  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [selectedRotationIdx, setSelectedRotationIdx] = useState<number | null>(null);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

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

  return (
    <div className="space-y-4">
      <ComicCard
        title={`${humanClub.city} ${humanClub.name} Clubhouse`}
        subtitle={`Record ${humanClub.wins}-${humanClub.losses} • Cash $${humanClub.economy.cash.toLocaleString()} • Hype ${humanClub.economy.teamHype}/100`}
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
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-4 items-start">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-xs uppercase tracking-wider text-[#181B2C]">
                  9-Man Batting Order {selectedSlotIdx !== null ? `(Swap Slot ${selectedSlotIdx + 1} with…)` : '(Tap 2 slots to swap)'}
                </h3>
              </div>
              <div className="space-y-2">
                {humanClub.lineup.map((slot, idx) => {
                  const player = rosterById.get(slot.playerId);
                  if (!player) return null;
                  const ovr = computePlayerOverall(player);
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
                          <div className="font-display text-xs text-[#181B2C] truncate">
                            {player.name}
                          </div>
                          <div className="text-[11px] font-bold text-[#4A5068]">
                            B/T: {player.bats}/{player.throws} • OVR {ovr}
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
                        <div className="text-[11px] font-bold text-[#4A5068]">OVR {ovr}</div>
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
                    className="flex items-center justify-between gap-2 py-1 border-b border-[#181B2C]/15"
                  >
                    <div className="text-xs font-bold text-[#181B2C]">
                      {player.position} {player.name} ({player.bats}/{player.throws}) • OVR{' '}
                      {computePlayerOverall(player)}
                    </div>
                    <ComicButton size="sm" variant="sky" onClick={() => handleBenchSub(player.id)}>
                      Sub In
                    </ComicButton>
                  </div>
                ))}
                {bullpenPitchers.map((rp) => (
                  <button
                    key={rp.id}
                    type="button"
                    onClick={() => setInspectedPlayerId(rp.id)}
                    className="w-full text-left py-1 text-xs font-bold text-[#4A5068] min-h-[44px]"
                  >
                    RP {rp.name} ({rp.throws}HP) • OVR {computePlayerOverall(rp)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[290px]">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#181B2C] mb-2 text-center">
              Selected Player Card
            </div>
            <FlipBaseballCard
              player={toBaseballCardPlayer(inspectedPlayer)}
              team={teamColors}
            />
          </div>
        </div>
      </ComicCard>

      <SaveSlotsModal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
    </div>
  );
}
