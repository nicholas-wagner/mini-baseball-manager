import { useState } from 'react';
import { Heart, Sparkles, Trophy, X } from 'lucide-react';
import { getStickerArtworkUrl, type StickerArtworkMap } from '../../art/stickers/stickerPrint';
import { soundEngine } from '../../audio/soundEngine';
import { buildStickerAlbumShelf } from '../../engine/gm/celebrationStickers';
import { evaluateTrophyCaseProgress } from '../../engine/gm/openingDayHook';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { ComicCard } from '../design-system/ComicCard';
import { ClubMascotBuddy } from './ClubMascotBuddy';
import { HobbyAlbum } from './OffTheClock';
import { PlayerPortraitBadge } from './PlayerPortraitBadge';
import { ScorebookPrint } from './ScorebookPrint';

export interface TrophyCaseModalProps {
  open: boolean;
  onClose: () => void;
  onInspectPlayerId?: (playerId: string) => void;
  /** Optional map of `stickerId -> WebP URL` (falls back gracefully to emoji badges when absent). */
  stickerArtworkMap?: StickerArtworkMap;
}

function StickerAlbumBadge({
  stickerId,
  title,
  emoji,
  unlocked,
  stickerArtworkMap,
}: {
  stickerId: string;
  title: string;
  emoji: string;
  unlocked: boolean;
  stickerArtworkMap?: StickerArtworkMap;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const artUrl = unlocked ? getStickerArtworkUrl(stickerId, stickerArtworkMap) : undefined;

  if (unlocked && artUrl && failedUrl !== artUrl) {
    return (
      <img
        src={artUrl}
        alt={`${title} sticker`}
        data-testid="album-sticker-artwork"
        onError={() => setFailedUrl(artUrl)}
        className="w-10 h-10 object-contain drop-shadow-[1px_2px_0_#181B2C]"
      />
    );
  }

  return <span className="text-lg leading-none">{unlocked ? emoji : '🔒'}</span>;
}

export function TrophyCaseModal({
  open,
  onClose,
  onInspectPlayerId,
  stickerArtworkMap,
}: TrophyCaseModalProps) {
  const club = useGameStore((s) => s.getHumanClub());
  const favoritePlayerIds = useGameStore((s) => s.favoritePlayerIds);
  const derbyWins = useGameStore((s) => s.derbyWins);
  const seriesResults = useGameStore((s) => s.seriesResults);
  const packsOpenedCount = useFoilPackStore((s) => s.openedCount);

  if (!open || !club) return null;

  const sweepsCount = Object.values(seriesResults).filter(
    (rec) => rec && rec.wins >= 3 && rec.losses === 0,
  ).length;
  const progress = evaluateTrophyCaseProgress({
    club,
    packsOpenedCount,
    derbyWins,
    sweepsCount,
    favoriteCount: favoritePlayerIds.length,
  });
  const liveStickers = buildStickerAlbumShelf(club.earnedStickerIds ?? []);
  const totalStickersUnlocked = progress.unlockedCount + liveStickers.unlockedCount;
  const totalStickersCount = progress.badges.length + liveStickers.totalCount;
  const favoritePlayers = club.roster.filter((p) => favoritePlayerIds.includes(p.id));

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/80 p-3 sm:p-5 flex items-start sm:items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Clubhouse Trophy and Sticker Album"
    >
      <div data-testid="trophy-case-modal" className="w-full max-w-3xl my-2 sm:my-auto">
        <ComicCard
          title={`🏆 ${club.name.toUpperCase()} TROPHY & STICKER ALBUM`}
          subtitle={`${totalStickersUnlocked}/${totalStickersCount} Stickers Collected • ${progress.packsOpenedCount} Foil Packs Ripped • ${progress.relicsOwnedCount} Relics Equipped`}
          headerBg="#7209B7"
          badge={
            <button
              type="button"
              aria-label="Close Trophy Album"
              onClick={onClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#FFFDF7] border-2 border-[#181B2C] flex items-center justify-center text-[#181B2C] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <ScorebookPrint moments={club.keepsakes ?? []} />
            <HobbyAlbum club={club} />
            {/* Mascot Header & Counters */}
            <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FFF8E7] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ClubMascotBuddy
                  mascot={club.mascot}
                  primaryColor={club.colors.primary}
                  secondaryColor={club.colors.secondary}
                  accentColor={club.colors.accent}
                  mood="cheering"
                  size="md"
                />
                <div>
                  <div className="font-display text-sm text-[#181B2C]">
                    {club.city} {club.name} Sticker Book
                  </div>
                  <div className="text-xs font-bold text-[#4A5068]">
                    Collect stickers by winning games, ripping Foil Packs, starring favorites &amp; conquering the Derby!
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                <span className="px-2 py-1 rounded-lg border-2 border-[#181B2C] bg-[#FFC300] text-[#181B2C]">
                  <Trophy className="w-3.5 h-3.5 inline mr-1" />
                  {totalStickersUnlocked}/{totalStickersCount} Stickers
                </span>
                <span className="px-2 py-1 rounded-lg border-2 border-[#181B2C] bg-[#FFE5EC] text-[#9D0208]">
                  <Heart className="w-3.5 h-3.5 inline mr-1" />
                  {progress.favoriteCount} Favorites
                </span>
              </div>
            </div>

            {/* Live Diamond Moment Stickers (6 Collectible Pop-Up Stamps!) */}
            <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-xs text-[#7209B7] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#F77F00] shrink-0" />
                  LIVE DIAMOND STICKERS ({liveStickers.unlockedCount}/{liveStickers.totalCount})
                </div>
                <span className="text-[10px] font-extrabold text-[#4A5068]">
                  Earned live on the field &amp; in HR Derby!
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {liveStickers.stickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    data-testid="live-moment-sticker"
                    style={sticker.unlocked ? { backgroundColor: sticker.accentBg } : undefined}
                    className={`p-2 rounded-xl border-2 border-[#181B2C] transition ${
                      sticker.unlocked
                        ? 'shadow-[2px_2px_0_#181B2C]'
                        : 'bg-[#F1E4C8]/65 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <StickerAlbumBadge
                        stickerId={sticker.id}
                        title={sticker.title}
                        emoji={sticker.emoji}
                        unlocked={sticker.unlocked}
                        stickerArtworkMap={stickerArtworkMap}
                      />
                      <span
                        className={`px-1.5 py-0.5 rounded font-display text-[8.5px] border border-[#181B2C] ${
                          sticker.unlocked
                            ? 'bg-[#2FB356] text-white'
                            : 'bg-[#FFFDF7] text-[#4A5068]'
                        }`}
                      >
                        {sticker.unlocked ? 'EARNED ✓' : 'LOCKED'}
                      </span>
                    </div>
                    <div className="font-display text-[11px] text-[#181B2C] mt-1 leading-tight">
                      {sticker.title}
                    </div>
                    <div className="text-[10px] font-bold text-[#4A5068] leading-snug">
                      {sticker.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 9-Sticker Collectible Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {progress.badges.map((badge) => (
                <div
                  key={badge.id}
                  data-testid="trophy-sticker-badge"
                  className={`p-3 rounded-2xl border-2 border-[#181B2C] transition ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-[#FFF3BF] to-[#D8F3DC] shadow-[3px_3px_0_#181B2C]'
                      : 'bg-[#F1E4C8]/65 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xl">{badge.unlocked ? badge.emoji : '🔒'}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-display text-[9px] border border-[#181B2C] ${
                        badge.unlocked
                          ? 'bg-[#2FB356] text-white'
                          : 'bg-[#FFFDF7] text-[#4A5068]'
                      }`}
                    >
                      {badge.unlocked ? 'EARNED ✓' : 'LOCKED'}
                    </span>
                  </div>
                  <div className="font-display text-xs text-[#181B2C] mt-1">{badge.title}</div>
                  <div className="text-[11px] font-bold text-[#4A5068]">{badge.detail}</div>
                </div>
              ))}
            </div>

            {/* Starred Favorite Squad Showcase */}
            <div className="p-3 rounded-2xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="font-display text-xs text-[#1D3557] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#F77F00]" />
                ⭐ YOUR FAVORITE PLAYERS ({favoritePlayers.length})
              </div>
              {favoritePlayers.length === 0 ? (
                <div className="text-xs font-bold text-[#4A5068]">
                  Tap ⭐ Star on any player’s Baseball Card to pin your favorite squad members right here!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {favoritePlayers.map((fav) => (
                    <button
                      key={fav.id}
                      type="button"
                      onClick={() => {
                        soundEngine.play('card_flip');
                        onInspectPlayerId?.(fav.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] hover:bg-[#FFC300] flex items-center gap-2 text-left cursor-pointer"
                    >
                      <PlayerPortraitBadge
                        player={fav}
                        primaryColor={club.colors.primary}
                        accentColor={club.colors.accent}
                        size="xs"
                      />
                      <div>
                        <div className="font-display text-xs text-[#181B2C]">
                          ⭐ {fav.name} #{fav.jerseyNumber}
                        </div>
                        <div className="text-[10px] font-bold text-[#4A5068]">
                          “{fav.nickname}” • {fav.position}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ComicCard>
      </div>
    </div>
  );
}
