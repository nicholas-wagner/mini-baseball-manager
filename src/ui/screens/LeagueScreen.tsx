import { useState } from 'react';
import { ArrowDown, ArrowUp, FastForward, Trophy } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { LEAGUE_TIER_LABELS } from '../../engine/league/clubCatalog';
import {
  computeTierStandings,
  getTierLeagueLeaders,
} from '../../engine/league/seasonEngine';
import { LEAGUE_TIER_ORDER, type LeagueTierId } from '../../engine/models/club';
import { formatRate3 } from '../../engine/simulation/sabermetrics';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

export function LeagueScreen() {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const leagues = useGameStore((s) => s.leagues);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentSeriesIndex = useGameStore((s) => s.currentSeriesIndex);
  const lastOffseasonTransitions = useGameStore((s) => s.lastOffseasonTransitions);
  const simNextSeriesRound = useGameStore((s) => s.simNextSeriesRound);
  const runPlayoffsAndAdvanceSeason = useGameStore((s) => s.runPlayoffsAndAdvanceSeason);

  const [selectedTier, setSelectedTier] = useState<LeagueTierId | null>(null);
  const [leagueNotice, setLeagueNotice] = useState<string | null>(null);

  if (!humanClub) return null;

  const activeTier: LeagueTierId = selectedTier ?? humanClub.leagueTier;
  const tierClubs = leagues[activeTier];
  const standings = computeTierStandings(tierClubs);
  const leaders = getTierLeagueLeaders(tierClubs);
  const regularSeasonDone = currentSeriesIndex >= 7;

  const handleSimSeries = () => {
    const res = simNextSeriesRound(5);
    soundEngine.play('bat_crack');
    setLeagueNotice(
      res.seasonComplete
        ? `Series 7 complete! Regular season finished — ready for Best-of-3 Playoffs!`
        : `Simulated Series ${res.seriesCompleted} of 7 across all 6 tiers!`,
    );
  };

  const handleRunPlayoffs = () => {
    const res = runPlayoffsAndAdvanceSeason(5);
    if (!res) return;
    soundEngine.play('crowd_cheer');
    setSelectedTier(null);
    setLeagueNotice(
      `Season ${res.nextSeasonNumber} underway! ${res.transitions.length / 2} clubs promoted & relegated across the 6-tier pyramid.`,
    );
  };

  return (
    <div className="space-y-4">
      <ComicCard
        title={`6-TIER BASEBALL PYRAMID • SEASON ${seasonNumber}`}
        subtitle={`Series ${Math.min(7, currentSeriesIndex)} / 7 (21-Game Season) • Your Club: ${LEAGUE_TIER_LABELS[humanClub.leagueTier]}`}
        headerBg="#1B4332"
        badge={
          <div className="flex flex-wrap gap-2">
            <ComicButton
              size="sm"
              variant="gold"
              icon={<FastForward className="w-4 h-4" />}
              disabled={regularSeasonDone}
              onClick={handleSimSeries}
            >
              Sim Next 3-Game Series
            </ComicButton>
            <ComicButton
              size="sm"
              variant="turf"
              icon={<Trophy className="w-4 h-4" />}
              disabled={!regularSeasonDone}
              onClick={handleRunPlayoffs}
            >
              Playoffs &amp; Offseason
            </ComicButton>
          </div>
        }
      >
        <div className="space-y-4">
          {leagueNotice ? (
            <div
              data-testid="league-notice"
              className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]"
            >
              {leagueNotice}
            </div>
          ) : null}

          {/* 6-Tier Pyramid Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {LEAGUE_TIER_ORDER.map((tier) => {
              const isHumanTier = tier === humanClub.leagueTier;
              return (
                <ComicButton
                  key={tier}
                  size="sm"
                  variant={activeTier === tier ? 'gold' : isHumanTier ? 'sky' : 'cream'}
                  active={activeTier === tier}
                  onClick={() => setSelectedTier(tier)}
                >
                  {LEAGUE_TIER_LABELS[tier]}
                  {isHumanTier ? ' ★' : ''}
                </ComicButton>
              );
            })}
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
            <table className="w-full text-left text-xs font-bold text-[#181B2C]">
              <thead className="bg-[#181B2C] text-[#FFD166] font-display text-[11px]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Club ({LEAGUE_TIER_LABELS[activeTier]})</th>
                  <th className="px-2 py-2 text-right">W</th>
                  <th className="px-2 py-2 text-right">L</th>
                  <th className="px-2 py-2 text-right">PCT</th>
                  <th className="px-2 py-2 text-right">GB</th>
                  <th className="px-3 py-2 text-right">Zone</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.clubId}
                    className={`border-t border-[#181B2C]/15 ${
                      row.isHuman ? 'bg-[#FFF3BF]' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-display">{row.rank}</td>
                    <td className="px-3 py-2 font-extrabold">
                      {row.clubName} {row.isHuman ? '(YOU)' : ''}
                    </td>
                    <td className="px-2 py-2 text-right font-mono-tabular">{row.wins}</td>
                    <td className="px-2 py-2 text-right font-mono-tabular">{row.losses}</td>
                    <td className="px-2 py-2 text-right font-mono-tabular">
                      {formatRate3(row.winPct)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono-tabular">
                      {row.gamesBack === 0 ? '—' : row.gamesBack.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.rank <= 4 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[10px] text-[#1B4332]">
                          Playoffs
                        </span>
                      ) : row.rank === 8 && activeTier !== 'rookie' ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[10px] text-[#9D0208]">
                          Relegation
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#4A5068]">Safe</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* League Leaders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="font-display text-xs text-[#181B2C]">Home Run Leaders</div>
              {leaders.homeRuns.slice(0, 3).map((entry) => (
                <div key={entry.playerId} className="flex justify-between text-xs font-bold">
                  <span className="truncate">{entry.playerName}</span>
                  <span className="font-mono-tabular text-[#1B4332]">{entry.value} HR</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="font-display text-xs text-[#181B2C]">Strikeout Leaders</div>
              {leaders.strikeouts.slice(0, 3).map((entry) => (
                <div key={entry.playerId} className="flex justify-between text-xs font-bold">
                  <span className="truncate">{entry.playerName}</span>
                  <span className="font-mono-tabular text-[#1D3557]">{entry.value} K</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="font-display text-xs text-[#181B2C]">Last Offseason Moves</div>
              {lastOffseasonTransitions.length === 0 ? (
                <div className="text-[11px] font-bold text-[#4A5068]">
                  Finish all 7 series to trigger Promotion &amp; Relegation!
                </div>
              ) : (
                lastOffseasonTransitions.slice(0, 4).map((t) => (
                  <div key={`${t.clubId}-${t.direction}`} className="flex items-center gap-1 text-[11px] font-bold">
                    {t.direction === 'promoted' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-[#2FB356] shrink-0" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-[#E63946] shrink-0" />
                    )}
                    <span className="truncate">
                      {t.clubName} → {LEAGUE_TIER_LABELS[t.toTier]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ComicCard>
    </div>
  );
}
