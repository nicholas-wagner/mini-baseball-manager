import { useState } from 'react';
import { ArrowDown, ArrowUp, FastForward, Gamepad2, Trophy, UserPlus } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { STAFF_ROLE_LABELS } from '../../engine/gm/coaches';
import {
  computeClubPayroll,
  TIER_SALARY_CAPS,
  validateSalaryCapRoom,
} from '../../engine/gm/offseasonEngine';
import { LEAGUE_TIER_LABELS } from '../../engine/league/clubCatalog';
import {
  getNextHumanPlayoffMatchup,
  type PlayoffSeriesState,
} from '../../engine/league/playoffBracket';
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
  type Player,
} from '../../engine/models/player';
import { formatRate3 } from '../../engine/simulation/sabermetrics';
import { hireHumanRetiredLegendCoach } from '../../store/clubHubActions';
import { useGameStore } from '../../store/gameStore';
import { usePostseasonStore } from '../../store/postseasonStore';
import { AwardsAndHofPanel } from '../components/AwardsAndHofPanel';
import {
  PlayerCardModal,
  type InspectableCardEntry,
} from '../components/PlayerCardModal';
import { PlayerDossierModal } from '../components/PlayerDossierModal';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';

interface LeagueScreenProps {
  onPlayLivePlayoffGame?: () => void;
}

function SeriesBracketCard({
  series,
  humanClubId,
}: {
  series: PlayoffSeriesState;
  humanClubId: string;
}) {
  return (
    <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="font-display text-[11px] text-[#181B2C]">{series.label}</span>
        <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[10px] font-extrabold">
          {series.winnerClubId ? 'FINAL' : `G${series.games.length + 1}`}
        </span>
      </div>
      <div
        className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-extrabold ${
          series.winnerClubId === series.highSeedClubId
            ? 'bg-[#D8F3DC] border-[#1B4332] text-[#1B4332]'
            : series.highSeedClubId === humanClubId
              ? 'bg-[#FFF3BF] border-[#181B2C] text-[#181B2C]'
              : 'bg-white border-[#181B2C]/25 text-[#181B2C]'
        }`}
      >
        <span className="truncate">
          #{series.highSeedRank} {series.highSeedName}
          {series.highSeedClubId === humanClubId ? ' (YOU)' : ''}
        </span>
        <span className="font-display text-sm ml-2">{series.highSeedWins}</span>
      </div>
      <div
        className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-extrabold ${
          series.winnerClubId === series.lowSeedClubId
            ? 'bg-[#D8F3DC] border-[#1B4332] text-[#1B4332]'
            : series.lowSeedClubId === humanClubId
              ? 'bg-[#FFF3BF] border-[#181B2C] text-[#181B2C]'
              : 'bg-white border-[#181B2C]/25 text-[#181B2C]'
        }`}
      >
        <span className="truncate">
          #{series.lowSeedRank} {series.lowSeedName}
          {series.lowSeedClubId === humanClubId ? ' (YOU)' : ''}
        </span>
        <span className="font-display text-sm ml-2">{series.lowSeedWins}</span>
      </div>
      {series.games.length > 0 ? (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {series.games.map((g) => (
            <span
              key={g.gameNumber}
              className="px-1.5 py-0.5 rounded bg-[#F1E4C8] border border-[#181B2C]/30 text-[10px] font-mono-tabular font-bold text-[#181B2C]"
            >
              G{g.gameNumber}: {g.awayScore}-{g.homeScore}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LeagueScreen({ onPlayLivePlayoffGame }: LeagueScreenProps = {}) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const leagues = useGameStore((s) => s.leagues);
  const manager = useGameStore((s) => s.manager);
  const worldSeed = useGameStore((s) => s.worldSeed);
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

  const playoffBracket = usePostseasonStore((s) => s.bracket);
  const startBracket = usePostseasonStore((s) => s.startBracket);
  const simNextBracketGame = usePostseasonStore((s) => s.simNextGame);
  const queueLivePlayoffGame = usePostseasonStore((s) => s.queueLivePlayoffGame);
  const clearBracket = usePostseasonStore((s) => s.clearBracket);

  const [selectedTier, setSelectedTier] = useState<LeagueTierId | null>(null);
  const [leagueNotice, setLeagueNotice] = useState<string | null>(null);
  const [simSeedNonce, setSimSeedNonce] = useState(1);
  const [inspectedLeader, setInspectedLeader] = useState<{
    player: Player;
    clubName: string;
  } | null>(null);
  const [leagueCardModal, setLeagueCardModal] = useState<{
    selectedId: string;
    entries: InspectableCardEntry[];
  } | null>(null);

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
    clearBracket();
    soundEngine.play('organ_rally');
    setLeagueNotice(`Season ${nextSeason} underway! Rosters and Salary Caps locked for Opening Day.`);
  };

  const humanTierClubs = leagues[humanClub.leagueTier];
  const humanTierStandings = computeTierStandings(humanTierClubs);
  const humanTierClubsById = Object.fromEntries(humanTierClubs.map((c) => [c.id, c]));
  const activeTierBracket =
    playoffBracket &&
    playoffBracket.tier === humanClub.leagueTier &&
    playoffBracket.seasonNumber === seasonNumber
      ? playoffBracket
      : null;
  const nextHumanPlayoff = activeTierBracket
    ? getNextHumanPlayoffMatchup(activeTierBracket, humanClub.id)
    : null;

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
            {regularSeasonDone && !activeOffseason ? (
              <ComicButton
                size="sm"
                variant="turf"
                icon={<Trophy className="w-4 h-4" />}
                onClick={handleOpenOffseason}
              >
                Playoffs &amp; Offseason
              </ComicButton>
            ) : null}
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
                  {activeOffseason.retiredCoachCandidates.length > 0 ? (
                    <div className="pt-1.5 border-t border-dashed border-[#181B2C]/20 space-y-1.5">
                      <div className="text-[10px] font-extrabold uppercase text-[#7209B7]">
                        Retiring Club Legends Open to Coaching
                      </div>
                      {activeOffseason.retiredCoachCandidates.slice(0, 3).map((legend) => (
                        <div
                          key={legend.formerPlayerId}
                          className="p-2 rounded-lg border border-[#7209B7]/40 bg-[#F5EEFF] flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="text-[11px] font-extrabold text-[#181B2C]">
                            {legend.name} — {STAFF_ROLE_LABELS[legend.recommendedRole]} (Tier{' '}
                            {legend.startingTier} • Peak {legend.careerOvrPeak})
                          </div>
                          <ComicButton
                            size="sm"
                            variant="violet"
                            icon={<UserPlus className="w-3.5 h-3.5" />}
                            onClick={() => {
                              const res = hireHumanRetiredLegendCoach(legend);
                              if (res.hired) soundEngine.play('trophy_fanfare');
                              setLeagueNotice(
                                res.hired
                                  ? `Hired Club Legend ${res.coachName} to your coaching staff!`
                                  : (res.reason ?? 'Unable to hire legend coach.'),
                              );
                            }}
                          >
                            Hire Legend as Coach
                          </ComicButton>
                        </div>
                      ))}
                    </div>
                  ) : null}
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

          {/* Interactive Best-of-3 Postseason Playoff Bracket */}
          {!activeOffseason ? (
            <div
              data-testid="playoff-bracket-panel"
              className="p-2.5 sm:p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FFF8E7] space-y-2 shadow-[3px_3px_0_#181B2C]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-[11px] sm:text-sm text-[#181B2C]">
                    🏆 {LEAGUE_TIER_LABELS[humanClub.leagueTier].toUpperCase()} — PLAYOFF PICTURE
                  </div>
                  <div className="text-[10.5px] sm:text-[11px] font-bold text-[#4A5068] truncate sm:whitespace-normal">
                    {activeTierBracket
                      ? activeTierBracket.championClubId
                        ? `Champion crowned: ${humanTierClubsById[activeTierBracket.championClubId]?.name ?? 'Winner'}! Proceed to Offseason HQ.`
                        : 'Play your club’s playoff games live in 3D or sim game-by-game!'
                      : regularSeasonDone
                        ? 'Regular season complete! Launch the interactive Best-of-3 Postseason Bracket.'
                        : `#1 ${humanTierStandings[0]?.clubName ?? ''} vs #4 ${humanTierStandings[3]?.clubName ?? ''} • #2 ${humanTierStandings[1]?.clubName ?? ''} vs #3 ${humanTierStandings[2]?.clubName ?? ''}`}
                  </div>
                </div>
                {regularSeasonDone && !activeTierBracket ? (
                  <ComicButton
                    size="sm"
                    variant="gold"
                    icon={<Trophy className="w-4 h-4" />}
                    onClick={() => {
                      startBracket(humanTierClubs, humanClub.leagueTier, seasonNumber);
                      soundEngine.play('organ_charge');
                      setLeagueNotice('Best-of-3 Postseason Bracket live! Play in 3D or sim games.');
                    }}
                  >
                    Launch Best-of-3 Playoff Bracket
                  </ComicButton>
                ) : null}
              </div>

              {activeTierBracket ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <SeriesBracketCard
                      series={activeTierBracket.semifinalA}
                      humanClubId={humanClub.id}
                    />
                    <SeriesBracketCard
                      series={activeTierBracket.semifinalB}
                      humanClubId={humanClub.id}
                    />
                    {activeTierBracket.championship ? (
                      <SeriesBracketCard
                        series={activeTierBracket.championship}
                        humanClubId={humanClub.id}
                      />
                    ) : (
                      <div className="p-3 rounded-xl border-2 border-dashed border-[#181B2C]/40 bg-white/70 flex flex-col items-center justify-center text-center text-xs font-bold text-[#4A5068]">
                        <Trophy className="w-5 h-5 text-[#FFC300] mb-1" />
                        <span>Championship Series</span>
                        <span className="text-[10px]">Awaiting Semifinal Winners</span>
                      </div>
                    )}
                  </div>

                  {!activeTierBracket.championClubId ? (
                    <div className="flex flex-wrap gap-2">
                      {nextHumanPlayoff ? (
                        <ComicButton
                          size="sm"
                          variant="turf"
                          icon={<Gamepad2 className="w-4 h-4" />}
                          onClick={() => {
                            queueLivePlayoffGame({
                              seriesId: nextHumanPlayoff.seriesId,
                              seriesLabel: nextHumanPlayoff.seriesLabel,
                              gameNumber: nextHumanPlayoff.gameNumber,
                              opponentClubId: nextHumanPlayoff.opponentClubId,
                              pressureLevel: nextHumanPlayoff.pressureLevel,
                            });
                            soundEngine.play('organ_charge');
                            if (onPlayLivePlayoffGame) {
                              onPlayLivePlayoffGame();
                            }
                          }}
                        >
                          Play Live 3D: {nextHumanPlayoff.seriesLabel} G{nextHumanPlayoff.gameNumber} vs{' '}
                          {nextHumanPlayoff.opponentName}
                        </ComicButton>
                      ) : null}
                      <ComicButton
                        size="sm"
                        variant="sky"
                        icon={<FastForward className="w-4 h-4" />}
                        onClick={() => {
                          const summary = simNextBracketGame(
                            humanTierClubsById,
                            worldSeed + seasonNumber * 101 + simSeedNonce * 37,
                          );
                          setSimSeedNonce((n) => n + 1);
                          soundEngine.play('bat_crack');
                          if (summary) setLeagueNotice(summary);
                        }}
                      >
                        Sim Next Playoff Game
                      </ComicButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 6-Tier Pyramid Tabs (Single-row horizontal strip on mobile so all 8 standings clubs fit above the fold!) */}
          <div
            data-testid="league-tier-tabs"
            className="flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto pb-0.5"
          >
            {LEAGUE_TIER_ORDER.map((tier) => {
              const isHumanTier = tier === humanClub.leagueTier;
              const shortTierLabel =
                tier === 'rookie'
                  ? 'Rookie'
                  : tier === 'low_a'
                    ? 'Low-A'
                    : tier === 'high_a'
                      ? 'High-A'
                      : tier === 'aa'
                        ? 'AA'
                        : tier === 'aaa'
                          ? 'AAA'
                          : 'Majors';
              return (
                <ComicButton
                  key={tier}
                  size="sm"
                  variant={activeTier === tier ? 'gold' : isHumanTier ? 'sky' : 'cream'}
                  active={activeTier === tier}
                  aria-label={`${LEAGUE_TIER_LABELS[tier]}${isHumanTier ? ' ★' : ''}`}
                  onClick={() => setSelectedTier(tier)}
                  className="shrink-0 whitespace-nowrap px-2.5 text-[11px] sm:text-xs"
                >
                  <span className="hidden sm:inline">{LEAGUE_TIER_LABELS[tier]}</span>
                  <span className="sm:hidden">{shortTierLabel}</span>
                  {isHumanTier ? ' ★' : ''}
                </ComicButton>
              );
            })}
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
            <table className="w-full text-left text-xs font-bold text-[#181B2C]">
              <thead className="bg-[#181B2C] text-[#FFD166] font-display text-[10.5px] sm:text-[11px]">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2">#</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2">
                    Club<span className="hidden sm:inline"> ({LEAGUE_TIER_LABELS[activeTier]})</span>
                  </th>
                  <th className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-right">W</th>
                  <th className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-right">L</th>
                  <th className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-right">PCT</th>
                  <th className="hidden sm:table-cell px-2 py-2 text-right">GB</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right">Zone</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => {
                  const rowClub = tierClubs.find((c) => c.id === row.clubId);
                  return (
                  <tr
                    key={row.clubId}
                    className={`border-t border-[#181B2C]/15 ${
                      row.isHuman ? 'bg-[#FFF3BF]' : ''
                    }`}
                  >
                    <td className="px-2 sm:px-3 py-1.5 font-display">{row.rank}</td>
                    <td className="px-2 sm:px-3 py-1.5 font-extrabold max-w-[140px] sm:max-w-none">
                      <button
                        type="button"
                        data-testid="standings-club-btn"
                        onClick={() => {
                          const targetClub = tierClubs.find((c) => c.id === row.clubId);
                          if (!targetClub) return;
                          const entries: InspectableCardEntry[] = targetClub.roster.map((p) => ({
                            player: p,
                            club: targetClub,
                            roleTag: `${targetClub.city} ${targetClub.name} • ${p.position}`,
                          }));
                          setLeagueCardModal({
                            selectedId: targetClub.lineup[0]?.playerId ?? targetClub.roster[0].id,
                            entries,
                          });
                          soundEngine.play('card_flip');
                        }}
                        className="flex items-center gap-1.5 text-left hover:text-[#E63946] hover:underline cursor-pointer min-w-0 max-w-full"
                      >
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-full border border-[#181B2C] shrink-0"
                          style={{ backgroundColor: rowClub?.colors.primary ?? '#1B4332' }}
                        />
                        <span className="truncate">
                          {row.clubName} {row.isHuman ? '(YOU)' : ''}
                        </span>
                      </button>
                    </td>
                    <td className="px-1.5 sm:px-2 py-1.5 text-right font-mono-tabular">{row.wins}</td>
                    <td className="px-1.5 sm:px-2 py-1.5 text-right font-mono-tabular">{row.losses}</td>
                    <td className="px-1.5 sm:px-2 py-1.5 text-right font-mono-tabular">
                      {formatRate3(row.winPct)}
                    </td>
                    <td className="hidden sm:table-cell px-2 py-1.5 text-right font-mono-tabular">
                      {row.gamesBack === 0 ? '—' : row.gamesBack.toFixed(1)}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap">
                      {row.rank <= 4 ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C] text-[9.5px] sm:text-[10px] text-[#1B4332]">
                          Playoffs
                        </span>
                      ) : row.rank === 8 && activeTier !== 'rookie' ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#FFE5EC] border border-[#181B2C] text-[9.5px] sm:text-[10px] text-[#9D0208]">
                          Releg.
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#4A5068]">Safe</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* League Leaders (Clickable 90s Baseball Cards!) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="font-display text-xs text-[#181B2C]">Home Run Leaders</div>
              {leaders.homeRuns.slice(0, 3).map((entry) => {
                const ownerClub = tierClubs.find((c) => c.roster.some((p) => p.id === entry.playerId));
                const matchPlayer = ownerClub?.roster.find((p) => p.id === entry.playerId);
                return (
                  <button
                    key={entry.playerId}
                    type="button"
                    data-testid="league-leader-card-btn"
                    aria-label={`Inspect leader ${entry.playerName}`}
                    onClick={() => {
                      if (matchPlayer && ownerClub) {
                        setLeagueCardModal({
                          selectedId: matchPlayer.id,
                          entries: [
                            {
                              player: matchPlayer,
                              club: ownerClub,
                              roleTag: `HR LEADER • ${entry.value} HR`,
                            },
                          ],
                        });
                        soundEngine.play('card_flip');
                      }
                    }}
                    className="w-full flex justify-between text-xs font-bold hover:text-[#1D3557] hover:underline cursor-pointer text-left"
                  >
                    <span className="truncate">🃏 {entry.playerName}</span>
                    <span className="font-mono-tabular text-[#1B4332]">{entry.value} HR</span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-1.5">
              <div className="font-display text-xs text-[#181B2C]">Strikeout Leaders</div>
              {leaders.strikeouts.slice(0, 3).map((entry) => {
                const ownerClub = tierClubs.find((c) => c.roster.some((p) => p.id === entry.playerId));
                const matchPlayer = ownerClub?.roster.find((p) => p.id === entry.playerId);
                return (
                  <button
                    key={entry.playerId}
                    type="button"
                    data-testid="league-leader-card-btn"
                    aria-label={`Inspect leader ${entry.playerName}`}
                    onClick={() => {
                      if (matchPlayer && ownerClub) {
                        setLeagueCardModal({
                          selectedId: matchPlayer.id,
                          entries: [
                            {
                              player: matchPlayer,
                              club: ownerClub,
                              roleTag: `STRIKEOUT LEADER • ${entry.value} K`,
                            },
                          ],
                        });
                        soundEngine.play('card_flip');
                      }
                    }}
                    className="w-full flex justify-between text-xs font-bold hover:text-[#1D3557] hover:underline cursor-pointer text-left"
                  >
                    <span className="truncate">🃏 {entry.playerName}</span>
                    <span className="font-mono-tabular text-[#1D3557]">{entry.value} K</span>
                  </button>
                );
              })}
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

      <PlayerCardModal
        open={leagueCardModal !== null}
        entry={
          leagueCardModal
            ? (leagueCardModal.entries.find((e) => e.player.id === leagueCardModal.selectedId) ??
                leagueCardModal.entries[0] ??
                null)
            : null
        }
        allEntries={leagueCardModal?.entries ?? []}
        onSelectPlayerId={(id) =>
          setLeagueCardModal((prev) => (prev ? { ...prev, selectedId: id } : prev))
        }
        onOpenDossier={(player) => {
          const found = leagueCardModal?.entries.find((e) => e.player.id === player.id);
          setLeagueCardModal(null);
          setInspectedLeader({
            player,
            clubName: found ? `${found.club.city} ${found.club.name}` : 'League Club',
          });
        }}
        onClose={() => setLeagueCardModal(null)}
      />

      <PlayerDossierModal
        player={inspectedLeader?.player ?? null}
        clubName={inspectedLeader?.clubName}
        onClose={() => setInspectedLeader(null)}
      />
    </div>
  );
}
