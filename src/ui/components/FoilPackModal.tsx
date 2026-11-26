import { useState } from 'react';
import { Gift, Sparkles, X } from 'lucide-react';
import { getRelicArtworkUrl, type RelicArtworkMap } from '../../art/relics/relicPrint';
import { soundEngine } from '../../audio/soundEngine';
import {
  FOIL_PACK_TIER_LABELS,
  type FoilCardKind,
  type FoilPackCard,
} from '../../engine/events/foilPacks';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ComicButton } from '../design-system/ComicButton';
import './foilPack.css';

function FoilCardArtwork({
  card,
  relicArtworkMap,
}: {
  card: FoilPackCard;
  relicArtworkMap?: RelicArtworkMap;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const artUrl = card.kind === 'relic' ? getRelicArtworkUrl(card.relicId, relicArtworkMap) : undefined;
  const lower = card.title.toLowerCase();
  const isBat =
    lower.includes('bat') || lower.includes('grip') || lower.includes('tape') || lower.includes('pine') || lower.includes('barrel') || lower.includes('donut');
  const isMitt = lower.includes('mitt') || lower.includes('glove') || lower.includes('leather') || lower.includes('lace') || lower.includes('wrist');
  const isShades = lower.includes('shade') || lower.includes('visor') || lower.includes('goggle') || lower.includes('eye black');
  const isCleats = lower.includes('cleat') || lower.includes('spike') || lower.includes('stirrup') || lower.includes('high-top');
  const isPitchGear = lower.includes('rosin') || lower.includes('radar') || lower.includes('balm') || lower.includes('sleeve') || lower.includes('chalk');
  const isRallyCap = lower.includes('cap') || lower.includes('bubblegum') || lower.includes('seed') || lower.includes('medallion');

  const bg =
    card.rarity === 'legendary'
      ? '#FFE08A'
      : card.rarity === 'rare'
        ? '#D8F3DC'
        : '#FFF3D6';

  return (
    <div
      data-testid="foil-card-artwork"
      className="w-full h-20 rounded-lg border-2 border-[#181B2C] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {artUrl && !imgFailed ? (
        <img
          src={artUrl}
          alt={`${card.title} relic artwork`}
          data-testid="foil-relic-artwork-img"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <svg viewBox="0 0 96 64" className="w-24 h-16" aria-hidden="true">
          <circle
            cx="48"
            cy="32"
            r="24"
            fill="#FFFFFF"
            fillOpacity="0.68"
            stroke="#181B2C"
            strokeWidth="1.8"
            strokeDasharray="3 3"
          />
          {card.rarity === 'legendary' ? (
            <g fill="#FFC300" stroke="#181B2C" strokeWidth="1">
              <polygon points="15,12 17,16 21,17 17,19 15,23 13,19 9,17 13,16" />
              <polygon points="82,42 84,46 88,47 84,49 82,53 80,49 76,47 80,46" />
            </g>
          ) : null}
          {card.kind === 'cash_windfall' ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <rect x="24" y="18" width="48" height="28" rx="6" fill="#2FB356" />
              <circle cx="48" cy="32" r="9" fill="#FFCC49" />
              <text x="48" y="36" textAnchor="middle" fontSize="12" fontWeight="900" fill="#181B2C" stroke="none">
                $
              </text>
            </g>
          ) : card.kind === 'training_xp' ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <polygon points="48,10 55,25 71,27 59,38 62,54 48,46 34,54 37,38 25,27 41,25" fill="#FFCC49" />
              <circle cx="48" cy="33" r="6" fill="#FFFDF7" />
            </g>
          ) : card.kind === 'hype_ticket' ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <path d="M20 20 H76 V28 A4 4 0 0 0 76 36 V44 H20 V36 A4 4 0 0 0 20 28 Z" fill="#FF4D6D" />
              <text x="48" y="36" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFDF7" stroke="none">
                VIP FAN
              </text>
            </g>
          ) : isBat ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <path d="M24 46 L64 14 Q70 10 73 15 Q75 19 69 24 L29 50 Z" fill="#F4A261" />
              <circle cx="64" cy="44" r="8" fill="#FFFDF7" />
              <path d="M60 39 Q64 44 60 49 M68 39 Q64 44 68 49" fill="none" stroke="#E63946" strokeWidth="1.4" />
            </g>
          ) : isMitt ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <path d="M32 48 C24 38 26 18 42 16 C56 14 70 24 66 40 C62 50 42 54 32 48 Z" fill="#C67D3B" />
              <circle cx="48" cy="34" r="7" fill="#FFFDF7" />
            </g>
          ) : isShades ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <rect x="20" y="24" width="24" height="16" rx="5" fill="#1D3557" />
              <rect x="52" y="24" width="24" height="16" rx="5" fill="#1D3557" />
              <line x1="44" y1="30" x2="52" y2="30" />
              <line x1="24" y1="28" x2="34" y2="36" stroke="#00E5FF" strokeWidth="2" />
              <line x1="56" y1="28" x2="66" y2="36" stroke="#00E5FF" strokeWidth="2" />
            </g>
          ) : isCleats ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <path d="M24 42 L32 22 H46 L52 32 H70 C74 32 76 38 72 42 Z" fill="#E63946" />
              <line x1="30" y1="44" x2="30" y2="48" />
              <line x1="46" y1="44" x2="46" y2="48" />
              <line x1="64" y1="44" x2="64" y2="48" />
            </g>
          ) : isPitchGear ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <rect x="28" y="18" width="40" height="30" rx="8" fill="#4CC3FF" />
              <circle cx="48" cy="33" r="9" fill="#FFFDF7" />
              <path d="M43 33 L47 28 L53 38" fill="none" stroke="#FF4D6D" strokeWidth="2.2" />
            </g>
          ) : isRallyCap ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <path d="M26 38 C26 22 40 16 52 18 C64 20 68 28 68 38 Z" fill="#9B5DE5" />
              <path d="M22 38 H74 C76 42 70 46 62 44 H22 Z" fill="#FFC300" />
              <circle cx="48" cy="27" r="4.5" fill="#FFFDF7" />
            </g>
          ) : (
            <g stroke="#181B2C" strokeWidth="2.2">
              <circle cx="48" cy="32" r="15" fill="#FFFDF7" />
              <path d="M39 22 Q45 32 39 42 M57 22 Q51 32 57 42" fill="none" stroke="#E63946" strokeWidth="2" />
              <polygon points="72,14 74,19 79,20 74,22 72,27 70,22 65,20 70,19" fill="#FFCC49" strokeWidth="1.2" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export interface FoilPackModalProps {
  open: boolean;
  onClose: () => void;
  onBackToGame?: () => void;
  onViewRelics?: () => void;
  backLabel?: string;
  /** Optional map of `relicId -> WebP URL` (ready for Sprint B relic prints; falls back to SVG badges). */
  relicArtworkMap?: RelicArtworkMap;
}

const RARITY_STYLES: Readonly<Record<'common' | 'rare' | 'legendary', string>> = {
  common: 'bg-[#FFFDF7] border-[#181B2C]',
  rare: 'bg-gradient-to-br from-[#E0FBFC] via-[#FFFDF7] to-[#D8F3DC] border-[#1D3557]',
  legendary: 'bg-gradient-to-br from-[#FFF3BF] via-[#FFD166] to-[#FFADAD] border-[#9D0208]',
};

const CARD_KIND_ICONS: Readonly<Record<FoilCardKind, string>> = {
  relic: '🏺 90s Relic',
  cash_windfall: '💰 Cash Bonus',
  training_xp: '⚾ Prospect Pass',
  hype_ticket: '📣 Fan Hype',
};

export function FoilPackModal({
  open,
  onClose,
  onBackToGame,
  onViewRelics,
  backLabel = '⚾ Back to Opening Day',
  relicArtworkMap,
}: FoilPackModalProps) {
  const unopenedPacks = useFoilPackStore((s) => s.unopenedPacks);
  const openedCount = useFoilPackStore((s) => s.openedCount);
  const lastOpened = useFoilPackStore((s) => s.lastOpened);
  const ripNextPack = useFoilPackStore((s) => s.ripNextPack);
  const clearLastOpened = useFoilPackStore((s) => s.clearLastOpened);
  const reducedMotion = useUserPreferencesStore((s) => s.reducedMotion);
  const [revealedSlots, setRevealedSlots] = useState<number[]>([1]);

  if (!open) return null;
  const nextPack = unopenedPacks[0] ?? null;
  const allRevealed = lastOpened ? revealedSlots.length >= lastOpened.pack.cards.length : false;

  const handleRipPack = () => {
    const res = ripNextPack();
    if (res) {
      // Pop Card #1 right away; Cards #2 & #3 shimmer in foil for tactile tap-to-peel fun!
      setRevealedSlots([1]);
      soundEngine.play('trophy_fanfare');
      soundEngine.play('card_flip');
    }
  };

  const handleRevealSlot = (slot: number) => {
    setRevealedSlots((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
    soundEngine.play(slot === 3 ? 'cash_chime' : 'card_flip');
  };

  const handleRevealAll = () => {
    setRevealedSlots([1, 2, 3]);
    soundEngine.play('cash_chime');
  };

  const closeAndReset = () => {
    clearLastOpened();
    setRevealedSlots([1]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="1994 Foil Card Booster Packs"
    >
      <div
        data-testid="foil-pack-modal"
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        className="w-full max-w-2xl min-w-0 max-h-[92dvh] flex flex-col rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
      >
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[#173D37] text-[#FFF7E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Gift className="w-5 h-5 text-[#FFCC49] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm sm:text-base tracking-wide truncate">
                1994 FOIL CARD SHOP &amp; BOOSTER PACKS
              </div>
              <div className="text-[11px] font-bold text-[#FFDC90] truncate">
                Unopened: {unopenedPacks.length} • Packs Ripped: {openedCount} • Win games &amp; playoffs to earn more!
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Foil Packs"
            onClick={closeAndReset}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3.5 min-h-0 flex-1 overflow-y-auto">
          {/* Newly Ripped Cards ALWAYS appear FIRST so the prize owns the screen even on your last pack! */}
          {lastOpened ? (
            <div data-testid="foil-pack-pulls-section" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-xs uppercase text-[#7209B7]">
                  ✨ Pulls from {lastOpened.pack.tierLabel}
                </div>
                <span className="px-2 py-0.5 rounded-full border border-[#181B2C] bg-[#FFFDF7] text-[10px] font-extrabold text-[#181B2C]">
                  {revealedSlots.length}/{lastOpened.pack.cards.length} Peeled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {lastOpened.pack.cards.map((card) => {
                  const isRevealed = revealedSlots.includes(card.slot);
                  if (!isRevealed) {
                    return (
                      <div key={card.slot} className="foil-card-stage">
                        <button
                          type="button"
                          data-testid="foil-pack-card"
                          data-peel-state="sealed"
                          aria-label={`Peel foil card ${card.slot} of 3`}
                          onClick={() => handleRevealSlot(card.slot)}
                          className="foil-card-sealed w-full p-4 rounded-xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#7209B7] via-[#F72585] to-[#FFC300] text-white shadow-[3px_3px_0_#181B2C] flex flex-col items-center justify-center gap-2 min-h-[126px] cursor-pointer"
                        >
                          <span className="foil-shimmer-sheen" aria-hidden="true" />
                          <span
                            data-testid="foil-corner-peel"
                            className="foil-corner-peel"
                            aria-hidden="true"
                          />
                          <span className="relative z-10 px-2 py-0.5 rounded-full bg-[#181B2C] text-[#FFD166] font-display text-[10px]">
                            FOIL CARD #{card.slot}/3
                          </span>
                          <span className="relative z-10 font-display text-sm drop-shadow-[1px_1px_0_#181B2C]">
                            ✨ TAP TO PEEL!
                          </span>
                          <span className="relative z-10 text-[10px] font-extrabold text-[#FFFDF7]">
                            {card.rarity === 'legendary' ? '🌟 HOLO GLOW!' : 'Shiny 1994 Foil'}
                          </span>
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div key={card.slot} className="foil-card-stage">
                      <div
                        data-testid="foil-pack-card"
                        data-peel-state="revealed"
                        className={`foil-card-revealed p-3 rounded-xl border-2 shadow-[3px_3px_0_#181B2C] space-y-2 ${RARITY_STYLES[card.rarity]}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[9px] uppercase">
                            {card.rarity}
                          </span>
                          <span className="font-mono-tabular text-[10px] font-extrabold text-[#4A5068]">
                            {CARD_KIND_ICONS[card.kind]}
                          </span>
                        </div>
                        <FoilCardArtwork card={card} relicArtworkMap={relicArtworkMap} />
                        <div className="font-display text-xs text-[#181B2C] leading-snug">
                          {card.title}
                        </div>
                        <div className="text-[11px] font-bold text-[#4A5068]">{card.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {allRevealed ? (
                <div
                  data-testid="foil-pack-summary"
                  className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold space-y-0.5"
                >
                  {lastOpened.summaryLines.map((line) => (
                    <div key={line}>✓ {line}</div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[11px] font-extrabold text-[#4A5068]">
                  Tap each shimmering corner to peel (all 3 rewards apply automatically to your club)!
                </div>
              )}
            </div>
          ) : null}

          {/* Next Pack Ripper OR Empty State (positioned cleanly below newly ripped prize cards!) */}
          {nextPack ? (
            <div className="p-4 rounded-2xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#FFC300] via-[#FF4D6D] to-[#7209B7] text-center space-y-2.5 shadow-[4px_4px_0_#181B2C]">
              <div className="inline-block px-3 py-0.5 rounded-full bg-[#181B2C] text-[#FFD166] font-display text-[11px]">
                {FOIL_PACK_TIER_LABELS[nextPack.tier]}
              </div>
              <div className="font-display text-lg text-white drop-shadow-[2px_2px_0_#181B2C]">
                ✨ {nextPack.reason} ✨
              </div>
              <div className="text-xs font-extrabold text-[#FFFDF7]">
                3 Guaranteed Foil Cards: 90s Relic + Prospect/Clubhouse Boost + Rare Wildcard!
              </div>
              <ComicButton
                variant="gold"
                size="lg"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleRipPack}
              >
                Rip Open 1994 Foil Pack!
              </ComicButton>
            </div>
          ) : (
            <div
              data-testid="foil-pack-empty-state"
              className="p-3.5 rounded-2xl border-2 border-dashed border-[#181B2C]/40 bg-[#FFFDF7] text-center space-y-1"
            >
              <div className="font-display text-sm text-[#181B2C]">
                No Unopened Foil Packs Right Now!
              </div>
              <div className="text-xs font-bold text-[#4A5068]">
                Win any live 3D game, Instant Sim, 3-0 Sweep, or Playoff clash to earn a shiny 1994 Foil Booster Pack!
              </div>
            </div>
          )}
        </div>

        {/* Sticky Thumb-Zone Footer Bar (keeps Reveal All & Follow-Through CTAs effortless on 360x640!) */}
        {lastOpened ? (
          <div
            data-testid="foil-pack-thumb-bar"
            className="px-3 sm:px-4 py-2.5 border-t-[3px] border-[#181B2C] bg-[#FFFDF7] shrink-0"
          >
            {!allRevealed ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-[#4A5068] truncate">
                  {lastOpened.pack.cards.length - revealedSlots.length} foil card
                  {lastOpened.pack.cards.length - revealedSlots.length === 1 ? '' : 's'} left to peel
                </span>
                <ComicButton
                  size="md"
                  variant="gold"
                  onClick={handleRevealAll}
                  className="shrink-0"
                >
                  ✨ Reveal All 3 Cards
                </ComicButton>
              </div>
            ) : (
              <div
                data-testid="foil-pack-next-actions"
                className="flex flex-wrap items-center justify-end gap-2"
              >
                {onViewRelics ? (
                  <ComicButton
                    size="sm"
                    variant="sky"
                    onClick={() => {
                      clearLastOpened();
                      setRevealedSlots([1]);
                      soundEngine.play('ui_pop');
                      onViewRelics();
                    }}
                  >
                    🏺 View My Relics
                  </ComicButton>
                ) : null}
                <ComicButton
                  size="md"
                  variant="turf"
                  onClick={() => {
                    clearLastOpened();
                    setRevealedSlots([1]);
                    soundEngine.play('ui_pop');
                    if (onBackToGame) {
                      onBackToGame();
                    } else {
                      onClose();
                    }
                  }}
                >
                  {backLabel}
                </ComicButton>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
