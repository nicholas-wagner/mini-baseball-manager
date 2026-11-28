import type { Club } from '../../engine/models/club';
import type { PolaroidKeepsake, PolaroidOccasion } from '../../engine/gm/polaroidKeepsakes';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { PlayerPortraitBadge } from './PlayerPortraitBadge';

export interface PolaroidKeepsakeCardProps {
  polaroid: PolaroidKeepsake;
  club: Pick<Club, 'roster' | 'mascot' | 'colors' | 'name'>;
  compact?: boolean;
  testId?: string;
}

const OCCASION_RIBBON_STYLES: Readonly<Record<PolaroidOccasion, string>> = {
  championship: 'bg-[#FFC300] text-[#181B2C]',
  playoff_clinch: 'bg-[#7209B7] text-[#FFFDF7]',
  walk_off: 'bg-[#FF4D6D] text-[#FFFDF7]',
  boss_victory: 'bg-[#F77F00] text-[#181B2C]',
  shutout_gem: 'bg-[#00B4D8] text-[#181B2C]',
  opening_win: 'bg-[#2FB356] text-[#FFFDF7]',
};

/**
 * Tactile 90s cream-bordered Victory Polaroid photo card showcasing up to 3 manga teammates,
 * the club mascot stamp, occasion ribbon, score/stadium footer, and handwritten caption.
 */
export function PolaroidKeepsakeCard({
  polaroid,
  club,
  compact = false,
  testId = 'polaroid-keepsake-card',
}: PolaroidKeepsakeCardProps) {
  const rosterById = new Map(club.roster.map((player) => [player.id, player]));
  const featuredPlayers = polaroid.playerIds.slice(0, 3).map((id, idx) => {
    const found = rosterById.get(id);
    if (found) return found;
    return {
      id,
      name: polaroid.playerNames[idx] ?? 'Club Star',
      jerseyNumber: idx + 1,
      position: 'CF' as const,
    };
  });

  const ribbonStyle = OCCASION_RIBBON_STYLES[polaroid.occasion];

  return (
    <article
      data-testid={testId}
      data-polaroid-occasion={polaroid.occasion}
      className={`rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] shadow-[3px_3px_0_#181B2C] ${
        compact ? 'p-2 pb-2.5' : 'p-2.5 pb-3.5'
      }`}
    >
      {/* Polaroid Photo Window */}
      <div
        className={`relative rounded-lg border-2 border-[#181B2C] overflow-hidden ${
          compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
        }`}
        style={{
          background: `linear-gradient(135deg, ${club.colors.primary} 0%, ${club.colors.secondary} 62%, ${club.colors.accent} 100%)`,
        }}
      >
        {/* Top Ribbon + Season Stamp */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span
            data-testid="polaroid-occasion-ribbon"
            className={`px-2 py-0.5 rounded-md border-2 border-[#181B2C] font-display text-[9.5px] sm:text-[10px] tracking-wide shadow-[1px_1px_0_#181B2C] ${ribbonStyle}`}
          >
            📸 {polaroid.badgeLabel}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#181B2C]/85 text-[#FFD166] font-mono-tabular text-[9px] font-extrabold shrink-0">
            S{polaroid.season} · G{polaroid.createdAtGameNumber}
          </span>
        </div>

        {/* Smiling Manga Teammate Trio + Club Mascot Stamp */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {featuredPlayers.map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-0.5">
                <PlayerPortraitBadge
                  player={player}
                  primaryColor={club.colors.primary}
                  accentColor={club.colors.accent}
                  size={compact ? 'sm' : 'md'}
                  testId="polaroid-player-portrait"
                />
                <span className="max-w-[54px] truncate rounded bg-[#181B2C]/85 px-1 text-[8.5px] font-extrabold text-[#FFFDF7]">
                  {player.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          <div className="shrink-0 -rotate-3">
            <ClubMascotBuddy
              mascot={club.mascot}
              primaryColor={club.colors.primary}
              secondaryColor={club.colors.secondary}
              accentColor={club.colors.accent}
              mood="cheering"
              size="sm"
              testId="polaroid-mascot-stamp"
            />
          </div>
        </div>
      </div>

      {/* Polaroid Cream Handwritten Chin */}
      <div className="mt-2 space-y-0.5 px-0.5">
        <div className="font-display text-xs text-[#181B2C] leading-tight">
          {polaroid.headline}
        </div>
        <p className="text-[11px] font-extrabold italic text-[#1D3557] leading-snug">
          “{polaroid.caption}”
        </p>
        <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono-tabular font-bold text-[#4A5068] border-t border-dashed border-[#181B2C]/20">
          <span>⚾ {polaroid.scoreLine}</span>
          <span className="truncate">🏟️ {polaroid.stadiumName}</span>
        </div>
      </div>
    </article>
  );
}
