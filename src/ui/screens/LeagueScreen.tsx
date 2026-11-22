import { useState } from 'react';
import { ArrowDown, ArrowUp, FastForward, Trophy } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  computeClubPayroll,
  TIER_SALARY_CAPS,
  validateSalaryCapRoom,
} from '../../engine/gm/offseasonEngine';
import { LEAGUE_TIER_LABELS } from '../../engine/league/clubCatalog';
import {
  computeTierStandings,
  getTierLeagueLeaders,
} from '../../engine/league/seasonEngine';
import {
  LEAGUE_TIER_ORDER,
  MAX_ACTIVE_ROSTER_SIZE,
  type LeagueTierId,
} from '../../engine/models/club';
import {
  computePlayerOverall,
  MARKET_TIER_LABELS,
} from '../../engine/models/player';
import { formatRate3 } from '../../engine/simulation/sabermetrics';
import { useGameStore } from '../../store/gameStore';
import { AwardsAndHofPanel } from '../components/AwardsAndHofPanel';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

export function LeagueScreen() {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const leagues = useGameStore((s) => s.leagues);
  const manager = useGameStore((s) => s.manager);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentSeriesIndex = useGameStore((s) => s.currentSeriesIndex);
  const lastOffseasonTransitions = useGameStore((s) => s.lastOffseasonTransitions);
  const activeOffseason = useGameStore((s) => s.activeOffseason);
  const simNextSeriesRound = useGameStore((s) => s.simNextSeriesRound);
  const beginInteractiveOffseason = useGameStore((s) => s.beginInteractiveOffseason);
  const decideOffseasonExpiring = useGameStore((s) => s.decideOffseasonExpiring);
  const draftOffseasonRookie = useGameStore((s) => s.draftOffseasonRookie);
  const signOffseasonAgent = useGameStore((s) => s.signOffseasonAgent);
  const finishInteractiveOffseason = useGameStore((s) => s.finishInteractiveOffseason);

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
        ? `Series 7 complete! Regular season finished — ready for Best-of-3 Playoffs & Offseason!`
        : `Simulated Series ${res.seriesCompleted} of 7 across all 6 tiers!`,
    );
  };

  const handleOpenOffseason = () => {
    const off = beginInteractiveOffseason(5);
    if (!off) return;
    soundEngine.play(off.humanWonWorldChampionship ? 'fireworks_boom' : 'trophy_fanfare');
    setSelectedTier(null);
    setLeagueNotice(
      off.humanWonWorldChampionship
        ? `WORLD CHAMPIONS!! Welcome to Offseason ${off.seasonJustEnded} → Season ${off.nextSeasonNumber}!`
        : `Playoffs complete! Manage Retirements, Expiring Contracts, Amateur Draft & Free Agents under your Salary Cap.`,
    );
  };

  const handleFinishOffseason = () => {
    const nextSeason = finishInteractiveOffseason();
    if (!nextSeason) return;
    soundEngine.play('organ_rally');
    setLeagueNotice(`Season ${nextSeason} underway! Rosters and Salary Caps locked for Opening Day.`);
  };

  const offseasonHumanClub = activeOffseason
    ? Object.values(activeOffseason.leagues)
        .flat()
        .find((c) => c.id === activeOffseason.humanClubId) ?? humanClub
    : humanClub;
  const offseasonPayroll = computeClubPayroll(offseasonHumanClub.roster);
  const offseasonCap = TIER_SALARY_CAPS[offseasonHumanClub.leagueTier];

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
              disabled={regularSeasonDone || Boolean(activeOffseason)}
              onClick={handleSimSeries}
            >
              Sim Next 3-Game Series
            </ComicButton>
            <ComicButton
              size="sm"
              variant="turf"
              icon={<Trophy className="w-4 h-4" />}
              disabled={!regularSeasonDone || Boolean(activeOffseason)}
              onClick={handleOpenOffseason}
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

          {/* Interactive End-of-Season & Offseason Headquarters (TASK-065) */}
          {activeOffseason ? (
            <div
              data-testid="offseason-hq"
              className="p-4 rounded-2xl border-[3px] border-[#181B2C] bg-[#FFF8E7] space-y-4 shadow-[4px_4px_0_#181B2C]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#181B2C] pb-2">
                <div>
                  <div className="font-display text-sm text-[#181B2C]">
                    OFFSEASON HQ — SEASON {activeOffseason.seasonJustEnded} → SEASON{' '}
                    {activeOffseason.nextSeasonNumber}
                  </div>
                  <div className="text-xs font-bold text-[#4A5068]">
                    Tier: {LEAGUE_TIER_LABELS[offseasonHumanClub.leagueTier]} • Roster{' '}
                    {offseasonHumanClub.roster.length}/{MAX_ACTIVE_ROSTER_SIZE} • Payroll $
                    {offseasonPayroll.toLocaleString()} / ${offseasonCap.toLocaleString()} Salary Cap
                  </div>
                </div>
                <ComicButton variant="turf" size="sm" onClick={handleFinishOffseason}>
                  Launch Season {activeOffseason.nextSeasonNumber}
                </ComicButton>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Retirements & Expiring Contracts */}
                <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-white space-y-2">
                  <div className="font-display text-xs text-[#181B2C]">
                    Retirements ({activeOffseason.retirements.length}) &amp; Expiring Contracts (
                    {activeOffseason.pendingExpiringPlayers.length})
                  </div>
                  {activeOffseason.retirements.slice(0, 4).map((ret) => (
                    <div key={ret.playerId} className="text-[11px] font-bold text-[#4A5068]">
                      Retired: {ret.position} {ret.playerName} (Age {ret.age}, {ret.seasonsPlayed}{' '}
                      Yrs — {ret.clubName})
                    </div>
                  ))}
                  {activeOffseason.pendingExpiringPlayers.length === 0 ? (
                    <div className="text-[11px] font-bold text-[#1B4332]">
                      All your expiring contracts are resolved!
                    </div>
                  ) : (
                    activeOffseason.pendingExpiringPlayers.map((exp) => {
                      const canResign = validateSalaryCapRoom(
                        offseasonHumanClub,
                        exp.contract.salaryPerSeason,
                      ).allowed;
                      return (
                        <div
                          key={exp.id}
                          className="p-2 rounded-lg border border-[#181B2C]/30 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="text-xs font-bold text-[#181B2C]">
                            {exp.position} {exp.name} (OVR {computePlayerOverall(exp)}) • $
                            {exp.contract.salaryPerSeason.toLocaleString()}/yr
                          </div>
                          <div className="flex gap-1.5">
                            <ComicButton
                              size="sm"
                              variant="turf"
                              disabled={!canResign}
                              onClick={() => {
                                const r = decideOffseasonExpiring(exp.id, 'resign', 2);
                                setLeagueNotice(
                                  r.applied
                                    ? `Re-signed ${exp.name} to a 2-year deal!`
                                    : r.reason ?? 'Cannot re-sign.',
                                );
                              }}
                            >
                              Re-Sign (2 Yr)
                            </ComicButton>
                            <ComicButton
                              size="sm"
                              variant="coral"
                              onClick={() => {
                                decideOffseasonExpiring(exp.id, 'release');
                                setLeagueNotice(`${exp.name} entered Free Agency.`);
                              }}
                            >
                              Let Walk
                            </ComicButton>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 3-Round Amateur Draft */}
                <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-white space-y-2">
                  <div className="font-display text-xs text-[#181B2C]">
                    Amateur Draft ({activeOffseason.draftRoundsRemaining} Rounds Left)
                  </div>
                  {activeOffseason.draftRoundsRemaining <= 0 ? (
                    <div className="text-[11px] font-bold text-[#1B4332]">
                      All 3 Amateur Draft rounds complete!
                    </div>
                  ) : (
                    activeOffseason.draftPool.slice(0, 4).map((prospect) => (
                      <div
                        key={prospect.id}
                        className="p-2 rounded-lg border border-[#181B2C]/30 flex items-center justify-between gap-2"
                      >
                        <div className="text-xs font-bold text-[#181B2C]">
                          {prospect.position} {prospect.name} (Age {prospect.age}) • OVR{' '}
                          {computePlayerOverall(prospect)} • ${prospect.contract.salaryPerSeason}/yr
                        </div>
                        <ComicButton
                          size="sm"
                          variant="gold"
                          onClick={() => {
                            const r = draftOffseasonRookie(prospect.id);
                            if (r.drafted) soundEngine.play('trophy_fanfare');
                            setLeagueNotice(
                              r.drafted
                                ? `Drafted ${prospect.position} ${prospect.name}!`
                                : r.reason ?? 'Unable to draft prospect.',
                            );
                          }}
                        >
                          Draft
                        </ComicButton>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Offseason Free Agent Signing Window */}
              <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-white space-y-2">
                <div className="font-display text-xs text-[#181B2C]">
                  Offseason Free Agency Signing Window (Under Salary Cap)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeOffseason.freeAgentPool.slice(0, 6).map((fa) => {
                    const fitsCap = validateSalaryCapRoom(
                      offseasonHumanClub,
                      fa.contract.salaryPerSeason,
                    ).allowed;
                    return (
                      <div
                        key={fa.id}
                        className="p-2 rounded-lg border border-[#181B2C]/30 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#181B2C] truncate">
                            {fa.position} {fa.name}
                          </div>
                          <div className="text-[10px] font-bold text-[#4A5068]">
                            {MARKET_TIER_LABELS[fa.marketTier]} • OVR {computePlayerOverall(fa)} • $
                            {fa.contract.salaryPerSeason.toLocaleString()}/yr
                          </div>
                        </div>
                        <ComicButton
                          size="sm"
                          variant="sky"
                          disabled={!fitsCap || offseasonHumanClub.roster.length >= MAX_ACTIVE_ROSTER_SIZE}
                          onClick={() => {
                            const r = signOffseasonAgent(fa.id);
                            setLeagueNotice(
                              r.signed
                                ? `Signed Free Agent ${fa.name}!`
                                : r.reason ?? 'Unable to sign free agent.',
                            );
                          }}
                        >
                          Sign FA
                        </ComicButton>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  <div
                    key={`${t.clubId}-${t.direction}`}
                    className="flex items-center gap-1 text-[11px] font-bold"
                  >
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
          {/* Live Tier Season Awards & Club Hall of Fame Ballot */}
          <AwardsAndHofPanel
            tierClubs={tierClubs}
            humanClub={humanClub}
            seasonNumber={seasonNumber}
            activeTier={activeTier}
            managerName={manager?.name ?? 'Skipper'}
          />
        </div>
      </ComicCard>
    </div>
  );
}
