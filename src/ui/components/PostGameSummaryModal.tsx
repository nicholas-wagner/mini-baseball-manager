import { Coins, Sparkles, Trophy, Users } from 'lucide-react';
import type { Club } from '../../engine/models/club';
import type { PostGameSummary } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { toBaseballCardPlayer } from '../utils/playerCardAdapter';
import { FlipBaseballCard } from './FlipBaseballCard';

interface PostGameSummaryModalProps {
  summary: PostGameSummary | null;
  humanClub: Club;
  managerLevel: number;
  onClose: () => void;
  onPlayAgain?: () => void;
}

export function PostGameSummaryModal({
  summary,
  humanClub,
  managerLevel,
  onClose,
  onPlayAgain,
}: PostGameSummaryModalProps) {
  if (!summary) return null;

  const mvpDomainPlayer =
    humanClub.roster.find((p) => p.id === summary.mvp.playerId) ?? humanClub.roster[0];
  const mvpCardPlayer = toBaseballCardPlayer(mvpDomainPlayer, 'mvp');
  const humanWon = summary.won;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/80 p-3 sm:p-6 flex items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Post-Game Box Score & MVP"
    >
      <div className="w-full max-w-3xl">
        <ComicCard
          title={humanWon ? 'VICTORY! SANDLOT FINAL' : 'TOUGH LOSS — CLUBHOUSE RECAP'}
          subtitle={`${humanClub.city} ${humanClub.name} vs ${summary.opponentName} • ${summary.awayScore}-${summary.homeScore}`}
          headerBg={humanWon ? '#1B4332' : '#7A1C33'}
          badge={
            <span className="px-2.5 py-1 rounded-full bg-[#FFC300] text-[#181B2C] border-2 border-[#181B2C] font-display text-xs">
              {humanWon ? 'WIN' : 'LOSS'}
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 items-start">
            <div className="mx-auto w-full max-w-[260px]">
              <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B32]">
                <Trophy className="w-4 h-4 text-[#FFC300]" /> Game MVP Spotlight
              </div>
              <FlipBaseballCard
                player={mvpCardPlayer}
                team={{
                  primary: humanClub.colors.primary,
                  secondary: humanClub.colors.secondary,
                  accent: humanClub.colors.accent,
                  monogram: humanClub.colors.monogram,
                }}
                mood={humanWon ? 'fired_up' : 'determined'}
              />
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                  Player of the Game
                </div>
                <div className="font-display text-base text-[#181B2C] mt-0.5">
                  {summary.mvp.playerName}
                </div>
                <div className="text-xs font-bold text-[#1B4332] mt-0.5">{summary.mvp.summary}</div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                    <Coins className="w-3.5 h-3.5 text-[#F77F00]" /> Gate & Bonus
                  </div>
                  <div className="font-display text-base text-[#1B4332] mt-0.5">
                    +${summary.rewards.cashDelta.toLocaleString()}
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

              <div className="flex flex-wrap gap-2.5 pt-1">
                {onPlayAgain ? (
                  <ComicButton variant="gold" onClick={onPlayAgain}>
                    Play Next Game
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
