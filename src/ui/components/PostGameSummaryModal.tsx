import { Coins, Sparkles, Trophy, Users } from 'lucide-react';
import {
  buildMvpDugoutQuote,
  buildPostGameMvpHeadline,
} from '../../engine/gm/openingDayHook';
import type { Club } from '../../engine/models/club';
import { isPitcherPosition } from '../../engine/models/player';
import {
  computeBattingSabermetrics,
  computePitchingSabermetrics,
  formatRate3,
} from '../../engine/simulation/sabermetrics';
import type { PostGameSummary } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { toBaseballCardPlayer } from '../utils/playerCardAdapter';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { ScorebookPrint } from './ScorebookPrint';
import { useGameStore } from '../../store/gameStore';
import { FlipBaseballCard } from './FlipBaseballCard';

interface PostGameSummaryModalProps {
  summary: PostGameSummary | null;
  humanClub: Club;
  opponentClub?: Club | null;
  managerLevel: number;
  unopenedPackCount?: number;
  playAgainLabel?: string;
  onClose: () => void;
  onPlayAgain?: () => void;
  onOpenFoilPacks?: () => void;
  onSpendSkillPoints?: () => void;
}

export function PostGameSummaryModal({
  summary,
  humanClub,
  opponentClub = null,
  managerLevel,
  unopenedPackCount = 0,
  playAgainLabel,
  onClose,
  onPlayAgain,
  onOpenFoilPacks,
  onSpendSkillPoints,
}: PostGameSummaryModalProps) {
  const keepMoment = useGameStore(s=>s.keepScorebookMoment);
  if (!summary) return null;

  const isHumanMvp = summary.mvp.clubId === humanClub.id;
  const mvpClub = isHumanMvp ? humanClub : (opponentClub ?? humanClub);
  const mvpDomainPlayer =
    mvpClub.roster.find((p) => p.id === summary.mvp.playerId) ??
    humanClub.roster.find((p) => p.id === summary.mvp.playerId) ??
    summary.result.finalState.home.playersById[summary.mvp.playerId] ??
    summary.result.finalState.away.playersById[summary.mvp.playerId];
  const mvpCardPlayer = toBaseballCardPlayer(mvpDomainPlayer, 'mvp');
  const game = summary.result.playerStatDeltas[summary.mvp.playerId];
  const story = buildPostGameMvpHeadline(summary.mvp.playerName, game);
  const humanWon = summary.won;
  const humanScore = summary.isHomeGame ? summary.homeScore : summary.awayScore;
  const rivalScore = summary.isHomeGame ? summary.awayScore : summary.homeScore;
  const levelUps = summary.levelUps ?? [];
  const totalUnspentSp = humanClub.roster.reduce((sum, p) => sum + p.skillPoints, 0);
  const mvpQuote = buildMvpDugoutQuote({
    playerName: mvpDomainPlayer.name,
    nickname: mvpDomainPlayer.nickname,
    won: isHumanMvp === humanWon,
    isPitcher: isPitcherPosition(mvpDomainPlayer.position),
    homeRuns: game?.homeRuns ?? 0,
    strikeouts: game?.pitchingStrikeouts ?? 0,
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/80 p-3 sm:p-6 flex items-start sm:items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Post-Game Box Score & MVP"
    >
      <div className="w-full max-w-3xl my-2 sm:my-auto">
        <ComicCard
          title={humanWon ? 'VICTORY! SANDLOT FINAL' : 'TOUGH LOSS — CLUBHOUSE RECAP'}
          subtitle={`${humanClub.city} ${humanClub.name} ${summary.isHomeGame ? 'vs' : '@'} ${summary.opponentName} • ${humanScore}-${rivalScore}`}
          headerBg={humanWon ? '#1B4332' : '#7A1C33'}
          badge={
            <span className="px-2.5 py-1 rounded-full bg-[#FFC300] text-[#181B2C] border-2 border-[#181B2C] font-display text-xs">
              {humanWon ? 'WIN' : 'LOSS'}
            </span>
          }
        >
          <ScorebookPrint moments={summary.moments ?? []} kept={humanClub.keepsakes} onKeep={keepMoment} />
          <div className="mb-3 space-y-2 border-b-2 border-[#d6bea0] pb-3">
            {(isHumanMvp || !summary.moments?.length) && <h3 className="font-display text-base sm:text-lg leading-tight text-[#173f3a]">
              {story}
            </h3>}
            <div className="flex flex-wrap items-center gap-2">
              {unopenedPackCount > 0 && onOpenFoilPacks ? (
                <ComicButton
                  size="sm"
                  variant="coral"
                  onClick={onOpenFoilPacks}
                >
                  {humanWon
                    ? `🎁 Victory! Rip Foil Pack (${unopenedPackCount})`
                    : `🎁 Rip Foil Pack (${unopenedPackCount})`}
                </ComicButton>
              ) : null}
              {onPlayAgain ? (
                <button type="button" className="recap-rematch" onClick={onPlayAgain}>
                  {playAgainLabel ?? 'Play Next Game'}
                </button>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 items-start">
            <div className={isHumanMvp || !summary.moments?.length ? "mx-auto w-full max-w-[260px]" : "mx-auto w-full max-w-[195px]"}>
              <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B32]">
                <Trophy className="w-4 h-4 text-[#FFC300]" />{' '}
                {isHumanMvp ? 'Game MVP Spotlight' : 'Rival MVP Spotlight'}
              </div>
              {!isHumanMvp && Boolean(summary.moments?.length) && <p className="mb-2 text-center text-sm font-bold">{story}</p>}
              <FlipBaseballCard
                player={mvpCardPlayer}
                team={{
                  primary: mvpClub.colors.primary,
                  secondary: mvpClub.colors.secondary,
                  accent: mvpClub.colors.accent,
                  monogram: mvpClub.colors.monogram,
                }}
                mood={humanWon ? 'fired_up' : 'determined'}
              />
            </div>

            <div className="space-y-3">
              {/* Cute Club Mascot Reaction + Player of the Game Banner */}
              <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex items-center gap-3">
                <ClubMascotBuddy
                  mascot={humanClub.mascot}
                  primaryColor={humanClub.colors.primary}
                  secondaryColor={humanClub.colors.secondary}
                  accentColor={humanClub.colors.accent}
                  mood={humanWon ? 'cheering' : 'determined'}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                    {isHumanMvp ? 'Player of the Game' : `Rival Player of the Game (${mvpClub.name})`}
                  </div>
                  <div className="font-display text-base text-[#181B2C] mt-0.5 truncate">
                    {summary.mvp.playerName}
                  </div>
                  <div className="text-xs font-bold text-[#1B4332] mt-0.5">{summary.mvp.summary}</div>
                  <div className="text-[11px] font-bold text-[#4A5068] mt-0.5">
                    {isPitcherPosition(mvpDomainPlayer.position)
                      ? (() => {
                          const p = computePitchingSabermetrics(mvpDomainPlayer.seasonStats);
                          return `Season: ${p.era.toFixed(2)} ERA • ${p.whip.toFixed(2)} WHIP • ${Math.round(p.strikeRate * 100)}% Strk`;
                        })()
                      : (() => {
                          const b = computeBattingSabermetrics(mvpDomainPlayer.seasonStats);
                          return `Season: ${formatRate3(b.avg)}/${formatRate3(b.obp)}/${formatRate3(b.slg)} (${formatRate3(b.ops)} OPS)`;
                        })()}
                  </div>
                </div>
              </div>

              {/* Cute MVP Clubhouse Speech Bubble */}
              <div
                data-testid="mvp-dugout-quote"
                className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] text-xs font-extrabold text-[#1D3557] italic"
              >
                💬 {mvpQuote}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                    <Coins className="w-3.5 h-3.5 text-[#F77F00]" /> Gate & Bonus
                  </div>
                  <div className="font-display text-base text-[#1B4332] mt-0.5">
                    +${summary.rewards.cashDelta.toLocaleString()}
                    {summary.sweepBonusAwarded ? ' 🧹' : ''}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                    <Users className="w-3.5 h-3.5 text-[#1D63B8]" /> Attendance
                  </div>
                  <div className="font-display text-base text-[#181B2C] mt-0.5">
                    {summary.rewards.attendance.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                    <Sparkles className="w-3.5 h-3.5 text-[#9B5DE5]" /> Manager XP
                  </div>
                  <div className="font-display text-sm text-[#181B2C] mt-0.5">
                    +{summary.rewards.managerXp} XP (LV.{managerLevel})
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                  <div className="text-[10px] font-extrabold uppercase text-[#4A5068]">
                    Fan Hype Shift
                  </div>
                  <div className="font-display text-sm text-[#181B2C] mt-0.5">
                    {summary.rewards.hypeDelta >= 0
                      ? `+${summary.rewards.hypeDelta} Hype`
                      : `${summary.rewards.hypeDelta} Hype`}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#1B4332] text-[#FBF4E4]">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFD166] mb-1">
                  Line Score
                </div>
                <div className="font-mono-tabular text-xs overflow-x-auto">
                  <div className="flex gap-2">
                    <span className="w-16 font-bold">INN</span>
                    {summary.result.boxScore.inningRuns.map((row) => (
                      <span key={row.inning} className="w-5 text-center text-[#89C2A5]">
                        {row.inning}
                      </span>
                    ))}
                    <span className="w-8 text-right font-bold text-[#FFD166]">R</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-16 font-bold">AWAY</span>
                    {summary.result.boxScore.inningRuns.map((row) => (
                      <span key={row.inning} className="w-5 text-center">
                        {row.away}
                      </span>
                    ))}
                    <span className="w-8 text-right font-bold text-[#FFD166]">
                      {summary.awayScore}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-16 font-bold">HOME</span>
                    {summary.result.boxScore.inningRuns.map((row) => (
                      <span key={row.inning} className="w-5 text-center">
                        {row.home}
                      </span>
                    ))}
                    <span className="w-8 text-right font-bold text-[#FFD166]">
                      {summary.homeScore}
                    </span>
                  </div>
                </div>
              </div>

              {levelUps.length > 0 ? (
                <div
                  data-testid="postgame-levelups-card"
                  className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#181B2C]">
                    <span>⬆️ Automatic Level-Ups! (+Core Stats &amp; Skill Tree SP)</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166]">
                      {levelUps.length} UP
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {levelUps.slice(0, 6).map((lv) => (
                      <span
                        key={lv.playerId}
                        className="px-2 py-0.5 rounded-lg border border-[#181B2C] bg-[#FFFDF7] text-[11px] font-extrabold text-[#181B2C]"
                      >
                        {lv.playerName} → LV.{lv.newLevel} (+{lv.spEarned} SP)
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2.5 pt-1">
                {onSpendSkillPoints && totalUnspentSp > 0 ? (
                  <ComicButton variant="violet" onClick={onSpendSkillPoints}>
                    ⚡ Spend Skill Points ({totalUnspentSp} SP)
                  </ComicButton>
                ) : null}

                <ComicButton variant="turf" onClick={onClose}>
                  Back to Clubhouse
                </ComicButton>
              </div>
            </div>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
