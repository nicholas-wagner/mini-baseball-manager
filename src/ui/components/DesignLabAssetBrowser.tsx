import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Search, X } from 'lucide-react';
import { getHealthConditionArtworkUrl } from '../../art/health/healthConditionPrint';
import { hobbyPrint } from '../../art/hobbies/hobbyPrint';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import ballparkArt from '../../art/portraits/illustrations/ballpark.webp';
import { getRelicArtworkUrl } from '../../art/relics/relicPrint';
import { getStickerArtworkUrl } from '../../art/stickers/stickerPrint';
import { BALLPARK_CATALOG } from '../../engine/ballparks/stadiumCatalog';
import { PLAYER_CATALOG } from '../../engine/catalog/playerCatalog';
import { CREST_EMBLEMS } from '../../engine/customization/uniformDesigner';
import { CELEBRATION_STICKER_CATALOG } from '../../engine/gm/celebrationStickers';
import { HEALTH_CONDITIONS_CATALOG } from '../../engine/health/conditionsCatalog';
import { getPlayerHobby } from '../../engine/rpg/playerHobbies';
import { RELIC_CATALOG } from '../../engine/rpg/relics';
import { ComicButton } from '../design-system/ComicButton';
import { ClubCrestIcon } from './UniformDesignerPanel';

export type DesignLabQaTab = 'players_hobbies' | 'health_art' | 'relics_world';

const PAGE_SIZE = 24;

export function DesignLabAssetBrowser({ tab }: { tab: DesignLabQaTab }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [healthFilter, setHealthFilter] = useState<'all' | 'injury' | 'illness' | 'female' | 'male'>('all');
  const [zoomItem, setZoomItem] = useState<{ title: string; subtitle: string; imgUrl: string } | null>(null);

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PLAYER_CATALOG;
    return PLAYER_CATALOG.filter((entry) => {
      const hobby = getPlayerHobby(entry);
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q) ||
        hobby.title.toLowerCase().includes(q) ||
        hobby.id.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const filteredHealth = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HEALTH_CONDITIONS_CATALOG.filter((item) => {
      if (healthFilter === 'injury' && item.kind !== 'injury') return false;
      if (healthFilter === 'illness' && item.kind !== 'illness') return false;
      if (healthFilter === 'female' && item.applicableTo !== 'female') return false;
      if (healthFilter === 'male' && item.applicableTo !== 'male') return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    });
  }, [query, healthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pagePlayers = filteredPlayers.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

  return (
    <div data-testid={`design-lab-qa-${tab}`} className="space-y-4">
      {tab === 'players_hobbies' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFFDF7] p-3 rounded-xl border-2 border-[#181B2C]">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#4A5068] shrink-0" />
              <input
                type="search"
                aria-label="Search 3,000 players or hobbies"
                placeholder="Search 3,000 players, IDs, or hobbies (e.g. bonsai, jazz, mbm-0042)..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                className="w-full min-h-[38px] px-2.5 rounded-lg border-2 border-[#181B2C] bg-[#FBF4E4] text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <ComicButton
                size="sm"
                variant="cream"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </ComicButton>
              <span className="text-xs font-display text-[#181B2C]">
                Page {clampedPage + 1}/{totalPages} ({filteredPlayers.length.toLocaleString()} players)
              </span>
              <ComicButton
                size="sm"
                variant="cream"
                disabled={clampedPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </ComicButton>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pagePlayers.map((entry) => {
              const hobby = getPlayerHobby(entry);
              const portraitUrl = playerIllustration(entry.id);
              const hobbyUrl = hobbyPrint({
                playerId: entry.id,
                playerName: entry.name,
                hobbyId: hobby.id,
                title: hobby.title,
                quote: hobby.quote,
              });
              return (
                <div
                  key={entry.id}
                  data-testid={`qa-player-hobby-${entry.id}`}
                  className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-xs text-[#181B2C] truncate">
                      {entry.name} ({entry.position})
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#4A5068] shrink-0">
                      {entry.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        portraitUrl &&
                        setZoomItem({
                          title: `${entry.name} — Portrait (${entry.id})`,
                          subtitle: `${entry.position} • ${entry.hometown}`,
                          imgUrl: portraitUrl,
                        })
                      }
                      className="rounded-lg border-2 border-[#181B2C] overflow-hidden bg-[#FBF4E4] aspect-square cursor-pointer relative group"
                    >
                      {portraitUrl ? (
                        <img src={portraitUrl} alt={entry.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : null}
                      <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-[#181B2C]/80 text-white text-[9px] font-bold">
                        Portrait
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        hobbyUrl &&
                        setZoomItem({
                          title: `${entry.name} — Hobby: ${hobby.title}`,
                          subtitle: hobby.quote,
                          imgUrl: hobbyUrl,
                        })
                      }
                      className="rounded-lg border-2 border-[#181B2C] overflow-hidden bg-[#FFF8E7] aspect-square cursor-pointer relative group"
                    >
                      {hobbyUrl ? (
                        <img src={hobbyUrl} alt={`${entry.name} ${hobby.title}`} loading="lazy" className="w-full h-full object-cover" />
                      ) : null}
                      <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-[#1D3557]/85 text-[#FFD166] text-[9px] font-bold">
                        Hobby
                      </span>
                    </button>
                  </div>
                  <div className="text-[10.5px]">
                    <div className="font-display text-[#1D3557]">🎨 {hobby.title}</div>
                    <p className="text-[10px] font-bold text-[#4A5068] line-clamp-2">&ldquo;{hobby.quote}&rdquo;</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === 'health_art' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFFDF7] p-3 rounded-xl border-2 border-[#181B2C]">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${HEALTH_CONDITIONS_CATALOG.length})` },
                  { id: 'injury', label: 'Injuries' },
                  { id: 'illness', label: 'Illnesses' },
                  { id: 'female', label: 'Female-Specific' },
                  { id: 'male', label: 'Male-Specific' },
                ] as const
              ).map((f) => (
                <ComicButton
                  key={f.id}
                  size="sm"
                  variant={healthFilter === f.id ? 'gold' : 'cream'}
                  onClick={() => setHealthFilter(f.id)}
                >
                  {f.label}
                </ComicButton>
              ))}
            </div>
            <input
              type="search"
              aria-label="Filter injuries and illnesses"
              placeholder="Filter conditions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[38px] px-2.5 rounded-lg border-2 border-[#181B2C] bg-[#FBF4E4] text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredHealth.map((cond) => {
              const artUrl = getHealthConditionArtworkUrl(cond.id);
              return (
                <div
                  key={cond.id}
                  data-testid={`qa-health-card-${cond.id}`}
                  className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex gap-2.5 items-start"
                >
                  <button
                    type="button"
                    onClick={() =>
                      artUrl &&
                      setZoomItem({
                        title: `${cond.name} (${cond.kind.toUpperCase()} · ${cond.rarity})`,
                        subtitle: cond.description,
                        imgUrl: artUrl,
                      })
                    }
                    className="w-20 h-20 rounded-xl border-2 border-[#181B2C] bg-[#FFF8E7] overflow-hidden shrink-0 cursor-pointer relative"
                  >
                    {artUrl ? (
                      <img src={artUrl} alt={cond.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🩺</span>
                    )}
                    <Maximize2 className="w-3 h-3 absolute bottom-1 right-1 text-[#181B2C] bg-white/80 rounded p-0.5" />
                  </button>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-display text-xs text-[#181B2C] leading-tight">{cond.name}</div>
                    <div className="flex flex-wrap gap-1 text-[9px] font-extrabold uppercase">
                      <span className="px-1.5 py-0.5 rounded bg-[#FFE5EC] text-[#9D0208]">{cond.kind}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#FFF3BF] text-[#7A4F01]">{cond.rarity}</span>
                      {cond.applicableTo !== 'all' ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#E0FBFC] text-[#1D3557]">{cond.applicableTo}</span>
                      ) : null}
                    </div>
                    <div className="text-[10px] font-bold text-[#4A5068]">{cond.description}</div>
                    <div className="text-[9.5px] font-mono text-[#1B4332]">
                      {cond.minGamesOut}–{cond.maxGamesOut}g · {cond.canPlayThrough ? 'Playable' : 'Mandatory IL'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === 'relics_world' ? (
        <div className="space-y-4">
          {/* All 26 90s Relics */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">
              🏺 All {RELIC_CATALOG.length} Collectible 90s Relics (Tap to Zoom)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {RELIC_CATALOG.map((relic) => {
                const artUrl = getRelicArtworkUrl(relic.id);
                return (
                  <button
                    key={relic.id}
                    type="button"
                    onClick={() =>
                      artUrl &&
                      setZoomItem({
                        title: `${relic.name} (${relic.rarity.toUpperCase()})`,
                        subtitle: relic.flavor,
                        imgUrl: artUrl,
                      })
                    }
                    className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] text-left space-y-1 cursor-pointer hover:bg-[#FFF3BF]"
                  >
                    <div className="aspect-square rounded-lg border border-[#181B2C] bg-[#FFF8E7] overflow-hidden">
                      {artUrl ? <img src={artUrl} alt={relic.name} loading="lazy" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="font-display text-[10px] text-[#181B2C] truncate">{relic.name}</div>
                    <div className="text-[9px] font-bold uppercase text-[#4A5068]">{relic.rarity} · {relic.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All 18 Club Crest Emblems */}
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
            <div className="font-display text-xs uppercase text-[#181B2C]">
              🛡️ All {CREST_EMBLEMS.length} Club Crest Emblems
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CREST_EMBLEMS.map((crest) => (
                <div
                  key={crest.id}
                  className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] flex flex-col items-center gap-1 text-center"
                >
                  <svg viewBox="0 0 100 100" className="w-10 h-10" aria-hidden="true">
                    <ClubCrestIcon emblem={crest.id} accent="#E63946" primary="#1D3557" />
                  </svg>
                  <span className="text-[10px] font-extrabold text-[#181B2C]">{crest.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Celebration Stickers & 10 Retro Ballparks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">
                ✨ Celebration Stickers ({CELEBRATION_STICKER_CATALOG.length})
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CELEBRATION_STICKER_CATALOG.map((sticker) => {
                  const artUrl = getStickerArtworkUrl(sticker.id);
                  return (
                    <button
                      key={sticker.id}
                      type="button"
                      onClick={() =>
                        artUrl &&
                        setZoomItem({
                          title: sticker.title,
                          subtitle: sticker.detail,
                          imgUrl: artUrl,
                        })
                      }
                      className="p-2 rounded-xl border border-[#181B2C] bg-[#FFF8E7] text-center space-y-1 cursor-pointer"
                    >
                      {artUrl ? (
                        <img src={artUrl} alt={sticker.title} loading="lazy" className="w-16 h-16 mx-auto object-contain" />
                      ) : (
                        <div className="text-2xl">{sticker.emoji}</div>
                      )}
                      <div className="text-[10px] font-display text-[#181B2C] truncate">{sticker.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
              <div className="font-display text-xs uppercase text-[#181B2C]">
                🏟️ All {BALLPARK_CATALOG.length} Retro Ballparks (Tap to Zoom)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BALLPARK_CATALOG.map((park) => (
                  <button
                    key={park.id}
                    type="button"
                    onClick={() =>
                      setZoomItem({
                        title: `🏟️ ${park.name}`,
                        subtitle: `${park.tagline} • LF ${park.factors.leftWallFt} / CF ${park.factors.centerWallFt} / RF ${park.factors.rightWallFt} • HR ${park.factors.hrFactor.toFixed(2)}×`,
                        imgUrl: ballparkArt,
                      })
                    }
                    className="p-2 rounded-xl border border-[#181B2C] bg-[#FBF4E4] text-left flex items-center gap-2 cursor-pointer hover:bg-[#FFF3BF]"
                  >
                    <img src={ballparkArt} alt={park.name} className="w-12 h-12 rounded-lg border border-[#181B2C] object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="font-display text-[10.5px] text-[#181B2C] truncate">{park.name}</div>
                      <div className="text-[9px] font-bold text-[#4A5068] truncate">
                        HR {park.factors.hrFactor.toFixed(2)}× · {park.baseCapacity.toLocaleString()} cap
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Full-Size Artwork QA Zoom Lightbox */}
      {zoomItem ? (
        <div
          className="fixed inset-0 z-50 bg-[#181B2C]/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={zoomItem.title}
          onClick={() => setZoomItem(null)}
        >
          <div
            data-testid="qa-zoom-lightbox"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
          >
            <div className="px-3 py-2 bg-[#1D3557] text-white border-b-2 border-[#181B2C] flex items-center justify-between gap-2">
              <span className="font-display text-xs truncate">{zoomItem.title}</span>
              <button
                type="button"
                aria-label="Close QA Zoom"
                onClick={() => setZoomItem(null)}
                className="w-9 h-9 rounded-lg bg-[#FBF4E4] text-[#181B2C] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-center">
              <img
                src={zoomItem.imgUrl}
                alt={zoomItem.title}
                className="max-h-[60dvh] mx-auto rounded-xl border-2 border-[#181B2C] object-contain bg-[#FFF8E7]"
              />
              <p className="text-xs font-bold text-[#181B2C]">{zoomItem.subtitle}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
