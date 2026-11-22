import { useMemo, useState } from 'react';
import { Globe, History, Share2, Swords, Trophy } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  buildGuestBossClub,
  GUEST_BOSS_PRESETS,
  type ExhibitionDuelResult,
  type GuestBossPresetId,
} from '../../engine/events/exhibitionDuel';
import {
  evaluateTimeCapsuleChallenges,
  type TimeCapsuleChallengeId,
} from '../../engine/events/timeCapsuleChallenges';
import { evaluateUnlockablesProgress } from '../../engine/events/unlockables';
import { runGlobalChibiCup, type GlobalCupResult } from '../../engine/league/globalCup';
import { runHomeRunDerby, type HomeRunDerbyResult } from '../../engine/league/homeRunDerby';
import type { Club, LeagueTierId } from '../../engine/models/club';
import type { GameLengthInnings } from '../../engine/models/player';
import { createSeededRng } from '../../engine/rng/seededRng';
import { decodeClubExportCode, encodeClubExportCode } from '../../store/clubCode';
import {
  claimHumanTimeCapsuleReward,
  launchHumanJuneMiracleScenario,
  runHumanFriendExhibitionDuel,
} from '../../store/clubHubActions';
import { ComicButton } from '../design-system/ComicButton';

interface WorldSpectaclesPanelProps {
  club: Club;
  leagues: Record<LeagueTierId, Club[]>;
  worldSeed: number;
  seasonNumber: number;
  onNotice: (message: string) => void;
}

export function WorldSpectaclesPanel({
  club,
  leagues,
  worldSeed,
  seasonNumber,
  onNotice,
}: WorldSpectaclesPanelProps) {
  const [derbyResult, setDerbyResult] = useState<HomeRunDerbyResult | null>(null);
  const [globalCupResult, setGlobalCupResult] = useState<GlobalCupResult | null>(null);
  const [exportCode, setExportCode] = useState<string>('');
  const [challengerCodeInput, setChallengerCodeInput] = useState<string>('');
  const [duelInnings, setDuelInnings] = useState<GameLengthInnings>(5);
  const [duelResult, setDuelResult] = useState<ExhibitionDuelResult | null>(null);
  const [claimedChallengeIds, setClaimedChallengeIds] = useState<TimeCapsuleChallengeId[]>([]);

  const decodedChallenger = useMemo(() => {
    if (!challengerCodeInput.trim()) return null;
    return decodeClubExportCode(challengerCodeInput);
  }, [challengerCodeInput]);

  const handleLoadBossCode = (presetId: GuestBossPresetId) => {
    const boss = buildGuestBossClub(presetId, club.leagueTier, worldSeed + seasonNumber * 409);
    const code = encodeClubExportCode(boss);
    setChallengerCodeInput(code);
    setDuelResult(null);
    onNotice(`Loaded ${boss.city} ${boss.name} MBM1 Boss Code — ready for Exhibition Duel!`);
    soundEngine.play('ui_pop');
  };

  const challengeSummary = evaluateTimeCapsuleChallenges(club, {
    wonHomeRunDerby: Boolean(derbyResult),
    wonGlobalCup: Boolean(globalCupResult),
  });

  const unlockStatus = evaluateUnlockablesProgress({
    leagueTier: club.leagueTier,
    careerWins: club.wins,
    championshipsWon: club.stadium.championshipPennants.length,
    retiredNumbersCount: club.stadium.retiredNumbers.length,
    wonHomeRunDerby: Boolean(derbyResult),
    wonGlobalCup: Boolean(globalCupResult),
  });

  const allWorldClubs = Object.values(leagues).flat();

  return (
    <div data-testid="world-spectacles-panel" className="space-y-4">
      {/* All-Star Home Run Derby, Global Chibi Cup & Serverless Sharing */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C]">
              All-Star Home Run Derby, Global Chibi Cup &amp; Offline Sharing
            </div>
            <div className="text-xs font-bold text-[#4A5068]">
              Launch world spectacles across all 48 clubs or export your dynasty offline!
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ComicButton
              size="sm"
              variant="gold"
              icon={<Trophy className="w-3.5 h-3.5" />}
              onClick={() => {
                const tierClubs = leagues[club.leagueTier] ?? [club];
                const res = runHomeRunDerby(
                  createSeededRng(worldSeed + seasonNumber * 997),
                  tierClubs,
                  club.stadium.ballparkId ?? 'high_altitude_mesa',
                );
                setDerbyResult(res);
                onNotice(
                  `HR Derby Champion: ${res.championName}! Longest bomb: ${res.longestHomeRunFt} ft!`,
                );
                soundEngine.play('trophy_fanfare');
              }}
            >
              Run Home Run Derby
            </ComicButton>
            <ComicButton
              size="sm"
              variant="turf"
              icon={<Globe className="w-3.5 h-3.5" />}
              onClick={() => {
                const res = runGlobalChibiCup(
                  createSeededRng(worldSeed + seasonNumber * 1217),
                  allWorldClubs.length > 0 ? allWorldClubs : [club],
                  seasonNumber,
                );
                setGlobalCupResult(res);
                onNotice(
                  `Global Chibi Cup Champion: ${res.championNationName}! Tournament MVP: ${res.mvpPlayerName}!`,
                );
                soundEngine.play('trophy_fanfare');
              }}
            >
              Run Global Chibi Cup
            </ComicButton>
            <ComicButton
              size="sm"
              variant="sky"
              icon={<Share2 className="w-3.5 h-3.5" />}
              onClick={() => {
                const code = encodeClubExportCode(club);
                setExportCode(code);
                onNotice('Generated serverless MBM1 Club Export Code — copy and share offline!');
                soundEngine.play('ui_pop');
              }}
            >
              Generate Club Export Code
            </ComicButton>
          </div>
        </div>

        {derbyResult ? (
          <div className="p-2.5 rounded-xl border border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
            🏆 Derby Champ: {derbyResult.championName} • Longest HR: {derbyResult.longestHomeRunFt} ft •
            Prize: ${derbyResult.cashPrize.toLocaleString()}
          </div>
        ) : null}

        {globalCupResult ? (
          <div
            data-testid="global-cup-result"
            className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] space-y-1 text-xs text-[#181B2C]"
          >
            <div className="font-display">
              🌍 Global Chibi Cup Champion: {globalCupResult.championNationName} • MVP:{' '}
              {globalCupResult.mvpPlayerName}
            </div>
            <div className="text-[11px] font-bold text-[#1B4332]">
              Final: {globalCupResult.matches[globalCupResult.matches.length - 1]?.headline}
            </div>
            <div className="text-[10px] font-extrabold text-[#4A5068]">
              {globalCupResult.medals.length} Gold/Silver/Bronze Global Cup Medals awarded across{' '}
              {globalCupResult.squads.length} nations!
            </div>
          </div>
        ) : null}

        {exportCode ? (
          <div className="space-y-1">
            <label htmlFor="club-export-code" className="text-[10px] font-extrabold uppercase text-[#4A5068]">
              Serverless Club Export Code (Share Offline)
            </label>
            <input
              id="club-export-code"
              readOnly
              value={exportCode}
              className="w-full px-2.5 py-2 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] font-mono-tabular text-[11px]"
            />
          </div>
        ) : null}
      </div>

      {/* Serverless Pass-and-Play Friend Boss Exhibition Duel (MBM1:) */}
      <div
        data-testid="friend-duel-panel"
        className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C] flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-[#7209B7]" />
              Pass-and-Play Friend Boss Exhibition Duel (MBM1: Codes)
            </div>
            <div className="text-xs font-bold text-[#4A5068]">
              Paste a friend’s MBM1: Club Export Code — or load a built-in 90s Boss Club — for an instant Exhibition Duel!
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([5, 7, 9] as const).map((inn) => (
              <ComicButton
                key={inn}
                size="sm"
                variant={duelInnings === inn ? 'gold' : 'cream'}
                onClick={() => setDuelInnings(inn)}
              >
                {inn} Inn
              </ComicButton>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {GUEST_BOSS_PRESETS.map((boss) => (
            <ComicButton
              key={boss.id}
              size="sm"
              variant="cream"
              onClick={() => handleLoadBossCode(boss.id)}
            >
              Load {boss.name} Code
            </ComicButton>
          ))}
          <ComicButton
            size="sm"
            variant="sky"
            onClick={() => {
              setChallengerCodeInput(encodeClubExportCode(club));
              setDuelResult(null);
              onNotice('Loaded your own club mirror MBM1 code for an intrasquad exhibition!');
              soundEngine.play('ui_pop');
            }}
          >
            Load My Mirror Code
          </ComicButton>
        </div>

        <textarea
          aria-label="Paste Friend MBM1 Club Export Code"
          rows={2}
          value={challengerCodeInput}
          onChange={(e) => setChallengerCodeInput(e.target.value)}
          placeholder="Paste a friend's MBM1:... Club Export Code here, or pick a 90s Boss Club above!"
          className="w-full p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] font-mono-tabular text-[11px]"
        />

        {decodedChallenger ? (
          decodedChallenger.ok ? (
            <div
              data-testid="decoded-challenger-preview"
              className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#E0FBFC] flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <div className="font-display text-xs text-[#181B2C]">
                  Challenger Ready: {decodedChallenger.club.city} {decodedChallenger.club.name} (
                  {decodedChallenger.club.colors.monogram})
                </div>
                <div className="text-[11px] font-bold text-[#1D3557]">
                  Tier {decodedChallenger.club.leagueTier.toUpperCase()} •{' '}
                  {decodedChallenger.club.roster.length} players • Record{' '}
                  {decodedChallenger.club.wins}-{decodedChallenger.club.losses}
                </div>
              </div>
              <ComicButton
                size="sm"
                variant="coral"
                icon={<Swords className="w-3.5 h-3.5" />}
                onClick={() => {
                  const res = runHumanFriendExhibitionDuel(decodedChallenger.club, duelInnings);
                  if (res.played && res.result) {
                    setDuelResult(res.result);
                    onNotice(
                      `Exhibition Duel Final: ${res.result.awayClubName} ${res.result.awayScore} @ ${res.result.homeClubName} ${res.result.homeScore} (+$${res.result.rewardCash.toLocaleString()})!`,
                    );
                    soundEngine.play(res.result.humanWon ? 'trophy_fanfare' : 'crowd_gasp');
                  }
                }}
              >
                Play Boss Exhibition Duel
              </ComicButton>
            </div>
          ) : (
            <div className="p-2 rounded-xl border border-[#9D0208] bg-[#FFE5E5] text-xs font-extrabold text-[#9D0208]">
              {decodedChallenger.error}
            </div>
          )
        ) : null}

        {duelResult ? (
          <div
            data-testid="exhibition-duel-result"
            className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] space-y-1.5 text-xs text-[#181B2C]"
          >
            <div className="font-display text-sm">
              {duelResult.humanWon ? '🏆 VICTORY! ' : '🔥 TOUGH BATTLE! '}
              {duelResult.awayClubName} {duelResult.awayScore} @ {duelResult.homeClubName}{' '}
              {duelResult.homeScore} ({duelResult.inningsPlayed} Inn)
            </div>
            <div className="font-extrabold text-[#1B4332]">
              Game MVP: {duelResult.mvpName} ({duelResult.mvpLine}) • Bonus +$
              {duelResult.rewardCash.toLocaleString()} &amp; +{duelResult.hypeDelta} Hype
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-bold text-[#4A5068]">
              {duelResult.highlights.slice(0, 4).map((hl, i) => (
                <li key={`${i}-${hl}`}>{hl}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* 199X Time Capsule Challenge Scenarios */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#E63946]" />
              199X Time Capsule Challenge Scenarios ({challengeSummary.completedCount}/
              {challengeSummary.totalCount})
            </div>
            <div className="text-xs font-bold text-[#4A5068]">
              Tackle iconic 90s dynasty scenarios and claim one-time Cash &amp; Hype bonuses!
            </div>
          </div>
          <ComicButton
            size="sm"
            variant="coral"
            onClick={() => {
              const res = launchHumanJuneMiracleScenario();
              onNotice(res.summary);
              soundEngine.play('organ_charge');
            }}
          >
            Launch 1994 June Miracle (1–10)
          </ComicButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {challengeSummary.items.map(({ challenge, completed, progressPct, statusDetail }) => {
            const alreadyClaimed = claimedChallengeIds.includes(challenge.id);
            return (
              <div
                key={challenge.id}
                className={`p-2.5 rounded-xl border-2 border-[#181B2C] space-y-1.5 ${
                  completed ? 'bg-[#D8F3DC]' : 'bg-[#FBF4E4]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-xs text-[#181B2C]">
                    {challenge.badgeEmoji} {challenge.title}
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166]">
                    {progressPct}%
                  </span>
                </div>
                <div className="text-[11px] font-bold text-[#181B2C]">{challenge.goalText}</div>
                <div className="w-full h-2 rounded-full bg-white border border-[#181B2C] overflow-hidden">
                  <div
                    className="h-full bg-[#2D6A4F]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] font-extrabold text-[#4A5068]">{statusDetail}</span>
                  <ComicButton
                    size="sm"
                    variant={alreadyClaimed ? 'cream' : completed ? 'gold' : 'cream'}
                    disabled={!completed || alreadyClaimed}
                    onClick={() => {
                      const res = claimHumanTimeCapsuleReward(challenge.id, claimedChallengeIds, {
                        wonHomeRunDerby: Boolean(derbyResult),
                        wonGlobalCup: Boolean(globalCupResult),
                      });
                      if (res.claimed) {
                        setClaimedChallengeIds(res.claimedIds);
                        onNotice(
                          `Claimed ${challenge.title} reward: +$${challenge.rewardCash.toLocaleString()} & +${challenge.rewardHype} Hype!`,
                        );
                        soundEngine.play('trophy_fanfare');
                      } else if (res.reason) {
                        onNotice(res.reason);
                      }
                    }}
                  >
                    {alreadyClaimed
                      ? 'Reward Claimed ✓'
                      : `Claim +$${challenge.rewardCash.toLocaleString()}`}
                  </ComicButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cosmetics & Throwbacks Gallery */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
        <div className="font-display text-xs text-[#181B2C]">
          Cosmetics &amp; Throwbacks Gallery ({unlockStatus.unlocked.length}/
          {unlockStatus.unlocked.length + unlockStatus.locked.length} Unlocked •{' '}
          {unlockStatus.completionPct}%)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[...unlockStatus.unlocked, ...unlockStatus.locked].slice(0, 6).map((item) => {
            const earned = unlockStatus.unlocked.some((u) => u.id === item.id);
            return (
              <div
                key={item.id}
                className={`p-2 rounded-xl border-2 border-[#181B2C] text-xs ${
                  earned ? 'bg-[#D8F3DC]' : 'bg-white opacity-80'
                }`}
              >
                <div className="font-display text-[#181B2C]">
                  {earned ? '★ ' : '🔒 '}
                  {item.name}
                </div>
                <div className="text-[10px] font-bold text-[#4A5068]">{item.requirementText}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
