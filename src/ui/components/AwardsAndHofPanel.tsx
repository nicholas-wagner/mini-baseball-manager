import { useMemo, useState } from 'react';
import { Award, Crown } from 'lucide-react';
import {
  evaluateHallOfFameCandidate,
  voteSeasonAwards,
} from '../../engine/league/awards';
import type { Club, LeagueTierId } from '../../engine/models/club';

interface AwardsAndHofPanelProps {
  tierClubs: readonly Club[];
  humanClub: Club;
  seasonNumber: number;
  activeTier: LeagueTierId;
  managerName: string;
}

export function AwardsAndHofPanel({
  tierClubs,
  humanClub,
  seasonNumber,
  activeTier,
  managerName,
}: AwardsAndHofPanelProps) {
  const [selectedHofPlayerId, setSelectedHofPlayerId] = useState<string>(
    humanClub.roster[0]?.id ?? '',
  );

  const awards = useMemo(
    () => voteSeasonAwards(tierClubs, seasonNumber, activeTier, managerName),
    [tierClubs, seasonNumber, activeTier, managerName],
  );

  const inspectedPlayer =
    humanClub.roster.find((p) => p.id === selectedHofPlayerId) ?? humanClub.roster[0];

  const hofEval = useMemo(() => {
    if (!inspectedPlayer) return null;
    const clubAwardHits = awards.filter((a) => a.winnerId === inspectedPlayer.id).length;
    return evaluateHallOfFameCandidate(
      inspectedPlayer,
      humanClub.stadium.championshipPennants.length,
      clubAwardHits,
    );
  }, [inspectedPlayer, humanClub.stadium.championshipPennants.length, awards]);

  return (
    <div
      data-testid="awards-and-hof-panel"
      className="grid grid-cols-1 lg:grid-cols-2 gap-3"
    >
      {/* Live Tier Season Awards Race */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
        <div className="font-display text-xs uppercase text-[#181B2C] flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#E63946]" />
          Season {seasonNumber} Award Leaders ({activeTier.toUpperCase()})
        </div>
        <div className="space-y-1.5">
          {awards.map((award) => (
            <div
              key={award.award}
              className="p-2 rounded-lg border border-[#181B2C]/30 bg-[#FBF4E4] flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="font-display text-[11px] text-[#1B4332]">{award.label}</div>
                <div className="font-extrabold text-[#181B2C]">
                  {award.winnerName} <span className="text-[#4A5068]">({award.clubName})</span>
                </div>
              </div>
              <span className="font-mono-tabular text-[10px] font-extrabold text-[#1D3557]">
                {award.summary}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Club Hall of Fame Ballot & Trophy Room */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5">
        <div className="font-display text-xs uppercase text-[#181B2C] flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-[#FFC300]" />
          Club Hall of Fame Ballot &amp; Pennants ({humanClub.stadium.championshipPennants.length})
        </div>

        {inspectedPlayer && hofEval ? (
          <div className="space-y-2">
            <select
              aria-label="Inspect Hall of Fame Candidate"
              value={inspectedPlayer.id}
              onChange={(e) => setSelectedHofPlayerId(e.target.value)}
              className="w-full min-h-[44px] px-2.5 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
            >
              {humanClub.roster.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} {p.position} — {p.name} (Age {p.age}, {p.careerService.seasonsPlayed} Yrs)
                </option>
              ))}
            </select>

            <div
              className={`p-2.5 rounded-xl border-2 border-[#181B2C] space-y-1 ${
                hofEval.eligible ? 'bg-[#D8F3DC]' : 'bg-[#FFF3BF]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs text-[#181B2C]">{hofEval.tierLabel}</span>
                <span className="px-2 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-mono-tabular text-[11px] font-extrabold">
                  HOF Score {hofEval.hofScore}
                </span>
              </div>
              <div className="text-[11px] font-bold text-[#181B2C]">{hofEval.summary}</div>
            </div>
          </div>
        ) : null}

        <div className="text-[11px] font-bold text-[#4A5068]">
          Retired Wall Plaques: {humanClub.stadium.retiredNumbers.length} • Pennants:{' '}
          {humanClub.stadium.championshipPennants.length > 0
            ? humanClub.stadium.championshipPennants
                .map((p) => `S${p.season} ${p.leagueTier.toUpperCase()}`)
                .join(', ')
            : 'Win a playoff crown to hoist your first 3D ballpark pennant!'}
        </div>
      </div>
    </div>
  );
}
