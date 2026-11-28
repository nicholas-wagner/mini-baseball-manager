import { useState } from 'react';
import { Coins, Sparkles, Trophy, Users, X } from 'lucide-react';
import {
  buildMvpDugoutQuote,
  buildPostGameMvpHeadline,
} from '../../engine/gm/openingDayHook';
import type { Club } from '../../engine/models/club';
import { isPitcherPosition, type Player } from '../../engine/models/player';
import { evaluateClubhouseChemistry } from '../../engine/rpg/chemistry';
import { availableHobbyChats } from '../../engine/rpg/playerHobbies';
import type { BatterBoxLine, PitcherBoxLine } from '../../engine/simulation/gameState';
import {
  computeBattingSabermetrics,
  computePitchingSabermetrics,
  formatRate3,
} from '../../engine/simulation/sabermetrics';
import { useGameStore, type PostGameSummary } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';
import { ComicCard } from '../design-system/ComicCard';
import { toBaseballCardPlayer } from '../utils/playerCardAdapter';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { FlipBaseballCard } from './FlipBaseballCard';
import { HobbyConversation } from './OffTheClock';
import { PolaroidKeepsakeCard } from './PolaroidKeepsakeCard';
import { ScorebookPrint } from './ScorebookPrint';

export type PostGameTabId = 'highlights' | 'clubhouse' | 'box_score';

export interface PostGameSummaryModalProps {
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

const CHEMISTRY_TIER_META: Readonly<
  Record<'electric' | 'tight_knit' | 'steady' | 'tense', { label: string; badgeClass: string; blurb: string }>
> = {
  electric: {
    label: '⚡ ELECTRIC CLUBHOUSE',
    badgeClass: 'bg-[#FFC300] text-[#181B2C]',
    blurb: 'Music pumping, sunflower seeds flying — this dugout believes in magic!',
  },
  tight_knit: {
    label: '🤝 TIGHT-KNIT SQUAD',
    badgeClass: 'bg-[#D8F3DC] text-[#1B4332]',
    blurb: 'Everyone has each other’s back from first pitch to final out.',
  },
  steady: {
    label: '⚾ STEADY DUGOUT',
    badgeClass: 'bg-[#E0FBFC] text-[#1D3557]',
    blurb: 'Calm, focused vibes — win streaks and teammate chats will spark a surge!',
  },
  tense: {
    label: '🌧️ CHILLY CLUBHOUSE',
    badgeClass: 'bg-[#FFE5EC] text-[#9D0208]',
    blurb: 'A teammate chat or clutch win will get the dugout laughing again.',
  },
};

function formatInningsPitched(outs: number): string {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function getTopBatters(
  lines: Record<string, BatterBoxLine>,
  playersById: Readonly<Record<string, Player>>,
) {
  return Object.values(lines)
    .filter((b) => b.plateAppearances > 0)
    .sort((a, b) => {
      const scoreA = a.hits * 2 + a.homeRuns * 4 + a.rbis * 2 + a.runs + a.walks + a.stolenBases;
      const scoreB = b.hits * 2 + b.homeRuns * 4 + b.rbis * 2 + b.runs + b.walks + b.stolenBases;
      return scoreB - scoreA;
    })
    .slice(0, 3)
    .map((line) => ({
      line,
      name: playersById[line.playerId]?.name ?? line.playerId,
      pos: playersById[line.playerId]?.position ?? '',
    }));
}

function getTopPitchers(
  lines: Record<string, PitcherBoxLine>,
  playersById: Readonly<Record<string, Player>>,
) {
  return Object.values(lines)
    .filter((p) => p.pitchesThrown > 0 || p.outsRecorded > 0)
    .sort((a, b) => b.outsRecorded - a.outsRecorded || b.strikeouts - a.strikeouts)
    .slice(0, 2)
    .map((line) => ({
      line,
      name: playersById[line.playerId]?.name ?? line.playerId,
    }));
}

function TopPerformersCard({
  title,
  batters,
  pitchers,
  accentBg,
}: {
  title: string;
  batters: ReturnType<typeof getTopBatters>;
  pitchers: ReturnType<typeof getTopPitchers>;
  accentBg: string;
}) {
  return (
    <div className="rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] overflow-hidden">
      <div
        className="px-2.5 py-1.5 font-display text-[11px] text-[#FFFDF7] border-b-2 border-[#181B2C]"
        style={{ backgroundColor: accentBg }}
      >
        {title}
      </div>
      <div className="p-2.5 space-y-2 text-xs">
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A5068]">
            Top Bats
          </div>
          {batters.length > 0 ? (
            batters.map(({ line, name, pos }) => (
              <div
                key={line.playerId}
                className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#181B2C]"
              >
                <span className="truncate">
                  {name} <span className="text-[#4A5068]">({pos})</span>
                </span>
                <span className="font-mono-tabular shrink-0 text-[#1B4332]">
                  {line.hits}-{line.atBats}
                  {line.homeRuns > 0 ? `, ${line.homeRuns} HR` : ''}
                  {line.rbis > 0 ? `, ${line.rbis} RBI` : ''}
                  {line.stolenBases > 0 ? `, ${line.stolenBases} SB` : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="text-[11px] font-bold text-[#4A5068]">No plate appearances recorded.</div>
          )}
        </div>

        <div className="border-t border-[#181B2C]/15 pt-1.5 space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A5068]">
            Pitching
          </div>
          {pitchers.length > 0 ? (
            pitchers.map(({ line, name }) => (
              <div
                key={line.playerId}
                className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#181B2C]"
              >
                <span className="truncate">
                  {name}
                  {line.decision ? (
                    <span className="ml-1 px-1 py-0.2 rounded bg-[#181B2C] text-[#FFD166] font-display text-[9px]">
                      {line.decision}
                    </span>
                  ) : null}
                </span>
                <span className="font-mono-tabular shrink-0 text-[#1D3557]">
                  {formatInningsPitched(line.outsRecorded)} IP, {line.strikeouts} K, {line.earnedRuns} ER
                </span>
              </div>
            ))
          ) : (
            <div className="text-[11px] font-bold text-[#4A5068]">No pitching lines recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
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
  const keepMoment = useGameStore((s) => s.keepScorebookMoment);
  const [activeTab, setActiveTab] = useState<PostGameTabId>('highlights');

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

  const chemistry = evaluateClubhouseChemistry(humanClub.roster);
  const chemMeta = CHEMISTRY_TIER_META[chemistry.chemistryTier];
  const hobbyChatsReady = availableHobbyChats(humanClub);
  const leadMoment = summary.moments?.[0] ?? null;

  const finalState = summary.result.finalState;
  const humanSide = summary.isHomeGame ? finalState.home : finalState.away;
  const rivalSide = summary.isHomeGame ? finalState.away : finalState.home;
  const humanBatters = getTopBatters(
    summary.isHomeGame ? summary.result.boxScore.homeBatters : summary.result.boxScore.awayBatters,
    humanSide.playersById,
  );
  const humanPitchers = getTopPitchers(
    summary.isHomeGame ? summary.result.boxScore.homePitchers : summary.result.boxScore.awayPitchers,
    humanSide.playersById,
  );
  const rivalBatters = getTopBatters(
    summary.isHomeGame ? summary.result.boxScore.awayBatters : summary.result.boxScore.homeBatters,
    rivalSide.playersById,
  );
  const rivalPitchers = getTopPitchers(
    summary.isHomeGame ? summary.result.boxScore.awayPitchers : summary.result.boxScore.homePitchers,
    rivalSide.playersById,
  );

  const tabs: readonly { id: PostGameTabId; label: string; badge?: string }[] = [
    { id: 'highlights', label: '⭐ Highlights' },
    {
      id: 'clubhouse',
      label: '💬 Clubhouse',
      badge: hobbyChatsReady > 0 ? String(hobbyChatsReady) : undefined,
    },
    { id: 'box_score', label: '📊 Box Score' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/80 p-2 sm:p-5 flex items-start sm:items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Post-Game Box Score & MVP"
    >
      <div className="w-full max-w-3xl my-1 sm:my-auto">
        <ComicCard
          title={humanWon ? 'VICTORY! SANDLOT FINAL' : 'TOUGH LOSS — CLUBHOUSE RECAP'}
          subtitle={`${humanClub.city} ${humanClub.name} ${summary.isHomeGame ? 'vs' : '@'} ${summary.opponentName} • ${humanScore}-${rivalScore}`}
          headerBg={humanWon ? '#1B4332' : '#7A1C33'}
          badge={
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-[#FFC300] text-[#181B2C] border-2 border-[#181B2C] font-display text-xs">
                {humanWon ? 'WIN' : 'LOSS'}
              </span>
              <button
                type="button"
                aria-label="Close Post-Game Recap"
                onClick={onClose}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#FFFDF7] border-2 border-[#181B2C] flex items-center justify-center text-[#181B2C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          }
        >
          {/* Above-the-Fold Hero: Mascot + Headline/Keepsake Highlight + Primary CTAs */}
          <div
            data-testid="postgame-hero-bar"
            className="mb-3 space-y-2.5 border-b-2 border-[#d6bea0] pb-3"
          >
            <div className="flex items-center gap-2.5">
              <ClubMascotBuddy
                mascot={humanClub.mascot}
                primaryColor={humanClub.colors.primary}
                secondaryColor={humanClub.colors.secondary}
                accentColor={humanClub.colors.accent}
                mood={humanWon ? 'cheering' : 'determined'}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                {isHumanMvp || !summary.moments?.length ? (
                  <h3 className="font-display text-sm sm:text-base leading-tight text-[#173f3a]">
                    {story}
                  </h3>
                ) : (
                  <p className="font-display text-sm sm:text-base leading-tight text-[#173f3a]">
                    📸 {leadMoment!.playerName}: {leadMoment!.caption}
                  </p>
                )}
                <p className="text-[11px] font-bold text-[#4A5068] mt-0.5 truncate">
                  {isHumanMvp ? 'Game MVP' : `Rival MVP (${mvpClub.name})`}: {summary.mvp.playerName} •{' '}
                  {summary.mvp.summary}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {unopenedPackCount > 0 && onOpenFoilPacks ? (
                <ComicButton size="sm" variant="coral" onClick={onOpenFoilPacks}>
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

          {/* 3-Tab Mobile-Friendly Switcher (>=44px touch height) */}
          <div
            role="tablist"
            aria-label="Post-game recap sections"
            data-testid="postgame-tabs"
            className="grid grid-cols-3 gap-1.5 mb-3"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[44px] px-1 sm:px-2 py-1.5 rounded-xl border-2 border-[#181B2C] font-heading font-extrabold text-[11px] sm:text-xs tracking-tight flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                      : 'bg-[#FFFDF7] text-[#4A5068] hover:bg-[#FFF3BF]'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.badge ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FF4D6D] text-white text-[9px] font-extrabold leading-tight">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Highlights (Scorebook Moment + MVP Spotlight + XP/Cash) */}
          {activeTab === 'highlights' ? (
            <div
              role="tabpanel"
              aria-label="Highlights"
              data-testid="postgame-highlights-panel"
              className="space-y-3"
            >
              <ScorebookPrint
                moments={summary.moments ?? []}
                kept={humanClub.keepsakes}
                onKeep={keepMoment}
              />

              {summary.latestPolaroid ? (
                <PolaroidKeepsakeCard
                  polaroid={summary.latestPolaroid}
                  club={humanClub}
                  compact
                  testId="postgame-victory-polaroid"
                />
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3.5 items-start">
                <div
                  className={
                    isHumanMvp || !summary.moments?.length
                      ? 'mx-auto w-full max-w-[240px]'
                      : 'mx-auto w-full max-w-[195px]'
                  }
                >
                  <div className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B32]">
                    <Trophy className="w-4 h-4 text-[#FFC300]" />{' '}
                    {isHumanMvp ? 'Game MVP Spotlight' : 'Rival MVP Spotlight'}
                  </div>
                  {!isHumanMvp && Boolean(summary.moments?.length) ? (
                    <p className="mb-2 text-center text-xs font-bold text-[#181B2C]">{story}</p>
                  ) : null}
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

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A5068]">
                      {isHumanMvp
                        ? 'Player of the Game'
                        : `Rival Player of the Game (${mvpClub.name})`}
                    </div>
                    <div className="font-display text-sm sm:text-base text-[#181B2C] mt-0.5 truncate">
                      {summary.mvp.playerName}
                    </div>
                    <div className="text-xs font-bold text-[#1B4332] mt-0.5">
                      {summary.mvp.summary}
                    </div>
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

                  <div
                    data-testid="mvp-dugout-quote"
                    className="px-3 py-2 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] text-xs font-extrabold text-[#1D3557] italic"
                  >
                    💬 {mvpQuote}
                  </div>

                  {summary.bossShowdown ? (
                    <div
                      data-testid="postgame-boss-bounty-banner"
                      className={`px-3 py-2 rounded-xl border-2 border-[#181B2C] text-xs font-extrabold flex items-center justify-between gap-2 ${
                        summary.bossShowdown.bountyAwarded > 0
                          ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]'
                          : 'bg-[#F3ECE0] text-[#4A5068]'
                      }`}
                    >
                      <span className="truncate">
                        👑{' '}
                        {summary.bossShowdown.bountyAwarded > 0
                          ? `BOSS BOUNTY CLAIMED! Defeated ${summary.bossShowdown.bossTitle}`
                          : `Boss Showdown: ${summary.bossShowdown.bossTitle} held the crown`}
                      </span>
                      {summary.bossShowdown.bountyAwarded > 0 ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[11px]">
                          +${summary.bossShowdown.bountyAwarded.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                        <Coins className="w-3.5 h-3.5 text-[#F77F00]" /> Gate &amp; Bonus
                      </div>
                      <div className="font-display text-sm sm:text-base text-[#1B4332] mt-0.5">
                        +${summary.rewards.cashDelta.toLocaleString()}
                        {summary.sweepBonusAwarded ? ' 🧹' : ''}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                        <Users className="w-3.5 h-3.5 text-[#1D63B8]" /> Attendance
                      </div>
                      <div className="font-display text-sm sm:text-base text-[#181B2C] mt-0.5">
                        {summary.rewards.attendance.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#4A5068]">
                        <Sparkles className="w-3.5 h-3.5 text-[#9B5DE5]" /> Manager XP
                      </div>
                      <div className="font-display text-xs sm:text-sm text-[#181B2C] mt-0.5">
                        +{summary.rewards.managerXp} XP (LV.{managerLevel})
                      </div>
                    </div>

                    <div className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7]">
                      <div className="text-[10px] font-extrabold uppercase text-[#4A5068]">
                        Fan Hype Shift
                      </div>
                      <div className="font-display text-xs sm:text-sm text-[#181B2C] mt-0.5">
                        {summary.rewards.hypeDelta >= 0
                          ? `+${summary.rewards.hypeDelta} Hype`
                          : `${summary.rewards.hypeDelta} Hype`}
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
                </div>
              </div>
            </div>
          ) : null}

          {/* Tab 2: Clubhouse (Off the Clock Teammate Chat + Morale & Chemistry Charm) */}
          {activeTab === 'clubhouse' ? (
            <div
              role="tabpanel"
              aria-label="Clubhouse"
              data-testid="postgame-clubhouse-panel"
              className="space-y-3"
            >
              <HobbyConversation />
              {hobbyChatsReady === 0 ? (
                <div className="p-3 rounded-xl border-2 border-dashed border-[#624367]/50 bg-[#FFFDF7] text-xs font-bold text-[#4A5068]">
                  📒 Off the Clock: Play another game to unlock your next teammate hobby story &amp; morale boost!
                </div>
              ) : null}

              <div
                data-testid="postgame-clubhouse-chemistry"
                className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full border-2 border-[#181B2C] font-display text-[11px] ${chemMeta.badgeClass}`}
                  >
                    {chemMeta.label}
                  </span>
                  <span className="font-mono-tabular text-xs font-extrabold text-[#181B2C]">
                    Morale: {chemistry.moraleScore}/100
                  </span>
                </div>

                <div
                  className="h-3 rounded-full border-2 border-[#181B2C] bg-[#EFE6D2] overflow-hidden"
                  aria-label={`Clubhouse morale ${chemistry.moraleScore} out of 100`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#2FB356] to-[#FFC300]"
                    style={{ width: `${Math.max(6, Math.min(100, chemistry.moraleScore))}%` }}
                  />
                </div>

                <p className="text-xs font-bold text-[#1D3557]">{chemMeta.blurb}</p>

                {chemistry.activeBonds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {chemistry.activeBonds.map((bond) => (
                      <span
                        key={bond.id}
                        className="px-2 py-1 rounded-lg border-2 border-[#181B2C] bg-[#FFF3BF] text-[11px] font-extrabold text-[#181B2C]"
                      >
                        ✨ {bond.name} ({bond.memberNames.slice(0, 2).join(' & ')})
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-[#4A5068]">
                    Glue Leaders in dugout: {chemistry.glueLeaderCount} • Star Favorites &amp; build duo synergies in the Clubhouse!
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Tab 3: Box Score (Line Score + Top Performers) */}
          {activeTab === 'box_score' ? (
            <div
              role="tabpanel"
              aria-label="Box Score"
              data-testid="postgame-boxscore-panel"
              className="space-y-3"
            >
              <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#1B4332] text-[#FBF4E4]">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFD166] mb-1">
                  Line Score
                </div>
                <div className="font-mono-tabular text-xs overflow-x-auto">
                  <div className="flex gap-2">
                    <span className="w-16 font-bold shrink-0">INN</span>
                    {summary.result.boxScore.inningRuns.map((row) => (
                      <span key={row.inning} className="w-5 text-center text-[#89C2A5] shrink-0">
                        {row.inning}
                      </span>
                    ))}
                    <span className="w-7 text-right font-bold text-[#FFD166] shrink-0">R</span>
                    <span className="w-7 text-right font-bold text-[#89C2A5] shrink-0">H</span>
                    <span className="w-7 text-right font-bold text-[#89C2A5] shrink-0">E</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-16 font-bold shrink-0">AWAY</span>
                    {summary.result.boxScore.inningRuns.map((row) => (
                      <span key={row.inning} className="w-5 text-center shrink-0">
                        {row.away}
                      </span>
                    ))}
                    <span className="w-7 text-right font-bold text-[#FFD166] shrink-0">
                      {summary.awayScore}
                    </span>
                    <span className="w-7 text-right shrink-0">{finalState.away.hits}</span>
                    <span className="w-7 text-right shrink-0">{finalState.away.errors}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-16 font-bold shrink-0">HOME</span>
                    {summary.result.boxScore.inningRuns.map((row) => (
                      <span key={row.inning} className="w-5 text-center shrink-0">
                        {row.home}
                      </span>
                    ))}
                    <span className="w-7 text-right font-bold text-[#FFD166] shrink-0">
                      {summary.homeScore}
                    </span>
                    <span className="w-7 text-right shrink-0">{finalState.home.hits}</span>
                    <span className="w-7 text-right shrink-0">{finalState.home.errors}</span>
                  </div>
                </div>
              </div>

              <div
                data-testid="postgame-top-performers"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
              >
                <TopPerformersCard
                  title={`${humanClub.city} ${humanClub.name} Leaders`}
                  batters={humanBatters}
                  pitchers={humanPitchers}
                  accentBg={humanClub.colors.primary}
                />
                <TopPerformersCard
                  title={`${summary.opponentName} Leaders`}
                  batters={rivalBatters}
                  pitchers={rivalPitchers}
                  accentBg={opponentClub?.colors.primary ?? '#1D3557'}
                />
              </div>
            </div>
          ) : null}

          {/* Persistent Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t-2 border-[#d6bea0]">
            <div>
              {onSpendSkillPoints && totalUnspentSp > 0 ? (
                <ComicButton size="sm" variant="violet" onClick={onSpendSkillPoints}>
                  ⚡ Spend Skill Points ({totalUnspentSp} SP)
                </ComicButton>
              ) : null}
            </div>
            <ComicButton size="sm" variant="turf" onClick={onClose}>
              Back to Clubhouse
            </ComicButton>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
