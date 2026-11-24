import { useEffect, useMemo, useState } from 'react';
import { Flame, RotateCcw, Sparkles, Trophy, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  DERBY_PITCH_COUNT,
  DERBY_WIN_CASH,
  resolveDerbyTimingSwing,
  rollDerbyRivalTarget,
  type DerbySwingResult,
} from '../../engine/events/arcadeDerby';
import type { Club } from '../../engine/models/club';
import { isPitcherPosition } from '../../engine/models/player';
import { createSeededRng } from '../../engine/rng/seededRng';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { PlayerPortraitBadge } from './PlayerPortraitBadge';

interface ArcadeDerbyModalProps {
  open: boolean;
  club: Club;
  worldSeed: number;
  onClose: () => void;
}

export function ArcadeDerbyModal({ open, club, worldSeed, onClose }: ArcadeDerbyModalProps) {
  const recordArcadeDerbyWin = useGameStore((s) => s.recordArcadeDerbyWin);
  const awardPack = useFoilPackStore((s) => s.awardPack);

  const hitters = useMemo(
    () =>
      club.roster
        .filter((p) => !isPitcherPosition(p.position))
        .sort((a, b) => b.ratings.power - a.ratings.power),
    [club.roster],
  );

  const [selectedSluggerId, setSelectedSluggerId] = useState<string>(hitters[0]?.id ?? club.roster[0].id);
  const [roundNonce, setRoundNonce] = useState(1);
  const [swingStyle, setSwingStyle] = useState<'normal' | 'power'>('power');
  const [cursorPos, setCursorPos] = useState(50);
  const [swings, setSwings] = useState<DerbySwingResult[]>([]);
  const [rewardGranted, setRewardGranted] = useState(false);

  const slugger =
    hitters.find((p) => p.id === selectedSluggerId) ?? hitters[0] ?? club.roster[0];

  const rival = useMemo(
    () => rollDerbyRivalTarget(createSeededRng(worldSeed + roundNonce * 313), club.leagueTier),
    [club.leagueTier, roundNonce, worldSeed],
  );

  const roundOver = swings.length >= DERBY_PITCH_COUNT;
  const homeRuns = swings.filter((s) => s.outcome === 'home_run').length;
  const longestFt = swings.reduce((max, s) => Math.max(max, s.distanceFt), 0);
  const wonDerby = roundOver && homeRuns >= rival.targetHomeRuns;

  // Smooth oscillating timing cursor while round is active!
  useEffect(() => {
    if (!open || roundOver) return undefined;
    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsedSec = (now - start) / 1000;
      const wave = 50 + Math.sin(elapsedSec * 3.1) * 46;
      setCursorPos(Math.round(wave));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [open, roundOver, roundNonce]);

  if (!open) return null;

  const handleSwing = () => {
    if (roundOver) return;
    const pitchNum = swings.length + 1;
    const rng = createSeededRng(worldSeed + roundNonce * 997 + pitchNum * 53);
    const pitchSpeedMph = rng.int(82, 92);
    const res = resolveDerbyTimingSwing({
      batterPower: slugger.ratings.power,
      timingCursor: cursorPos,
      pitchSpeedMph,
      swingStyle,
      rng,
    });
    const nextSwings = [...swings, res];
    setSwings(nextSwings);

    if (res.outcome === 'home_run') {
      soundEngine.play('bat_crack');
      soundEngine.play('crowd_cheer');
    } else {
      soundEngine.play('ui_pop');
    }

    if (nextSwings.length >= DERBY_PITCH_COUNT) {
      const nextHrs = nextSwings.filter((s) => s.outcome === 'home_run').length;
      if (nextHrs >= rival.targetHomeRuns && !rewardGranted) {
        setRewardGranted(true);
        recordArcadeDerbyWin(DERBY_WIN_CASH);
        awardPack('sandlot_foil', `Home Run Derby Champ (${slugger.name}: ${nextHrs} HR)!`);
        soundEngine.play('trophy_fanfare');
      }
    }
  };

  const handleReset = () => {
    setRoundNonce((n) => n + 1);
    setSwings([]);
    setRewardGranted(false);
    setCursorPos(50);
    soundEngine.play('organ_charge');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/80 p-3 sm:p-5 flex items-start sm:items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="90s Arcade Home Run Derby"
    >
      <div data-testid="arcade-derby-modal" className="w-full max-w-2xl my-2 sm:my-auto">
        <ComicCard
          title="💥 30-SECOND ARCADE HOME RUN DERBY!"
          subtitle={`5 Pitches • Beat ${rival.rivalName}’s ${rival.targetHomeRuns} HR to win +$${DERBY_WIN_CASH.toLocaleString()} & a Shiny Foil Pack!`}
          headerBg="#9D0208"
          badge={
            <button
              type="button"
              aria-label="Close Home Run Derby"
              onClick={onClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#FFFDF7] border-2 border-[#181B2C] flex items-center justify-center text-[#181B2C] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-3.5">
            {/* Slugger Picker Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {hitters.slice(0, 6).map((h) => {
                const selected = h.id === slugger.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    disabled={swings.length > 0 && !roundOver}
                    onClick={() => {
                      setSelectedSluggerId(h.id);
                      soundEngine.play('ui_pop');
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] flex items-center gap-2 text-left cursor-pointer ${
                      selected ? 'bg-[#FFC300] shadow-[2px_2px_0_#181B2C]' : 'bg-[#FFFDF7]'
                    }`}
                  >
                    <PlayerPortraitBadge
                      player={h}
                      primaryColor={club.colors.primary}
                      accentColor={club.colors.accent}
                      size="xs"
                    />
                    <div>
                      <div className="font-display text-[11px] text-[#181B2C]">{h.name.split(' ')[0]}</div>
                      <div className="text-[10px] font-extrabold text-[#9D0208]">PWR {h.ratings.power}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Scoreboard + Moving Sweet-Spot Timing Meter */}
            <div className="p-3.5 rounded-2xl border-[3px] border-[#181B2C] bg-[#181B2C] text-[#FBF4E4] space-y-3 shadow-[4px_4px_0_#181B2C]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
                <span className="text-[#FFD166] font-display">
                  🏏 {slugger.name} “{slugger.nickname}” (PWR {slugger.ratings.power})
                </span>
                <span className="px-2 py-0.5 rounded bg-[#2FB356] text-[#181B2C]">
                  HR: {homeRuns} / Target {rival.targetHomeRuns} • Pitch {Math.min(DERBY_PITCH_COUNT, swings.length + 1)}/{DERBY_PITCH_COUNT}
                </span>
              </div>

              {/* Moving Sweet-Spot Bar */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-center text-[#FFD166]">
                  Tap 💥 SWING! when the baseball hits the GOLD center sweet spot!
                </div>
                <div className="relative h-9 rounded-full border-2 border-[#FFD166] bg-[#2B2D42] overflow-hidden">
                  {/* Outer solid barrel zone */}
                  <div
                    className="absolute inset-y-0 bg-[#2FB356]/55"
                    style={{ left: '26%', width: '48%' }}
                  />
                  {/* Center perfect crush sweet spot */}
                  <div
                    className="absolute inset-y-0 bg-[#FFC300] border-x-2 border-white"
                    style={{ left: '39%', width: '22%' }}
                  />
                  {/* Moving baseball marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-[#E63946] shadow flex items-center justify-center text-xs"
                    style={{ left: `${cursorPos}%` }}
                  >
                    ⚾
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <ComicButton
                    size="sm"
                    variant={swingStyle === 'normal' ? 'sky' : 'cream'}
                    onClick={() => setSwingStyle('normal')}
                  >
                    🎯 Easy Sweet Spot
                  </ComicButton>
                  <ComicButton
                    size="sm"
                    variant={swingStyle === 'power' ? 'coral' : 'cream'}
                    onClick={() => setSwingStyle('power')}
                  >
                    💥 Moonshot Power
                  </ComicButton>
                </div>

                {!roundOver ? (
                  <ComicButton
                    size="lg"
                    variant="gold"
                    data-testid="derby-swing-btn"
                    icon={<Flame className="w-4 h-4" />}
                    onClick={handleSwing}
                    className="flex-1 sm:flex-none min-w-[160px]"
                  >
                    SWING! ({DERBY_PITCH_COUNT - swings.length} left)
                  </ComicButton>
                ) : (
                  <ComicButton
                    size="md"
                    variant="sky"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={handleReset}
                  >
                    Play Another Round
                  </ComicButton>
                )}
              </div>
            </div>

            {/* Pitch-by-Pitch Launch Chips */}
            {swings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                {swings.map((sw, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border-2 border-[#181B2C] text-center ${
                      sw.outcome === 'home_run'
                        ? 'bg-[#FFC300] text-[#181B2C]'
                        : sw.outcome === 'warning_track'
                          ? 'bg-[#E0FBFC] text-[#1D3557]'
                          : 'bg-[#FFE5EC] text-[#9D0208]'
                    }`}
                  >
                    <div className="font-display text-[10px]">P{idx + 1}: {sw.distanceFt} ft</div>
                    <div className="text-[9px] font-extrabold leading-tight mt-0.5">{sw.ratingBadge}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {roundOver ? (
              <div
                data-testid="derby-final-card"
                className={`p-3.5 rounded-2xl border-[3px] border-[#181B2C] flex flex-wrap items-center justify-between gap-3 ${
                  wonDerby ? 'bg-[#D8F3DC] text-[#1B4332]' : 'bg-[#FFF3BF] text-[#181B2C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ClubMascotBuddy
                    mascot={club.mascot}
                    primaryColor={club.colors.primary}
                    secondaryColor={club.colors.secondary}
                    accentColor={club.colors.accent}
                    mood={wonDerby ? 'cheering' : 'determined'}
                    size="md"
                  />
                  <div>
                    <div className="font-display text-sm flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-[#F77F00]" />
                      {wonDerby
                        ? `DERBY CHAMPION! ${homeRuns} HR (Longest ${longestFt} ft)!`
                        : `Great Swings! ${homeRuns} HR vs Target ${rival.targetHomeRuns} HR`}
                    </div>
                    <div className="text-xs font-bold mt-0.5">
                      {wonDerby
                        ? `Earned +$${DERBY_WIN_CASH.toLocaleString()} Cash + 🎁 1994 Sandlot Foil Pack!`
                        : 'Try Easy Sweet Spot or pick your biggest slugger for a rematch!'}
                    </div>
                  </div>
                </div>
                <ComicButton
                  size="sm"
                  variant="turf"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={onClose}
                >
                  Back to Ballpark
                </ComicButton>
              </div>
            ) : null}
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
