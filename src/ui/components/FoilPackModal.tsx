import { useState } from 'react';
import { Gift, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { FOIL_PACK_TIER_LABELS, type FoilCardKind } from '../../engine/events/foilPacks';
import { useFoilPackStore } from '../../store/foilPackStore';
import { ComicButton } from '../design-system/ComicButton';

interface FoilPackModalProps {
  open: boolean;
  onClose: () => void;
  onBackToGame?: () => void;
  onViewRelics?: () => void;
  backLabel?: string;
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
}: FoilPackModalProps) {
  const unopenedPacks = useFoilPackStore((s) => s.unopenedPacks);
  const openedCount = useFoilPackStore((s) => s.openedCount);
  const lastOpened = useFoilPackStore((s) => s.lastOpened);
  const ripNextPack = useFoilPackStore((s) => s.ripNextPack);
  const clearLastOpened = useFoilPackStore((s) => s.clearLastOpened);
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

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="1994 Foil Card Booster Packs"
    >
      <div
        data-testid="foil-pack-modal"
        className="w-full max-w-2xl min-w-0 max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
      >
        <div className="px-3 sm:px-4 py-3 bg-gradient-to-r from-[#7209B7] via-[#B5179E] to-[#F72585] text-white border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Gift className="w-5 h-5 text-[#FFD166] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm sm:text-base tracking-wide truncate">
                1994 FOIL CARD SHOP &amp; BOOSTER PACKS
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] truncate">
                Unopened: {unopenedPacks.length} • Packs Ripped: {openedCount} • Win games &amp; playoffs to earn more!
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Foil Packs"
            onClick={() => {
              clearLastOpened();
              setRevealedSlots([1]);
              onClose();
            }}
            className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-4 min-h-0 flex-1 overflow-y-auto">
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
            <div className="p-4 rounded-2xl border-2 border-dashed border-[#181B2C]/40 bg-[#FFFDF7] text-center space-y-1">
              <div className="font-display text-sm text-[#181B2C]">
                No Unopened Foil Packs Right Now!
              </div>
              <div className="text-xs font-bold text-[#4A5068]">
                Win any live 3D game, Instant Sim, 3-0 Sweep, or Playoff clash to earn a shiny 1994 Foil Booster Pack!
              </div>
            </div>
          )}

          {lastOpened ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-xs uppercase text-[#7209B7]">
                  ✨ Pulls from {lastOpened.pack.tierLabel}
                </div>
                {!allRevealed ? (
                  <ComicButton size="sm" variant="gold" onClick={handleRevealAll}>
                    ✨ Reveal All 3 Cards
                  </ComicButton>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {lastOpened.pack.cards.map((card) => {
                  const isRevealed = revealedSlots.includes(card.slot);
                  if (!isRevealed) {
                    return (
                      <button
                        key={card.slot}
                        type="button"
                        data-testid="foil-pack-card"
                        onClick={() => handleRevealSlot(card.slot)}
                        className="p-4 rounded-xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#7209B7] via-[#F72585] to-[#FFC300] text-white shadow-[3px_3px_0_#181B2C] flex flex-col items-center justify-center gap-2 min-h-[126px] cursor-pointer hover:scale-[1.02] transition-transform"
                      >
                        <span className="px-2 py-0.5 rounded-full bg-[#181B2C] text-[#FFD166] font-display text-[10px]">
                          FOIL CARD #{card.slot}/3
                        </span>
                        <span className="font-display text-sm drop-shadow-[1px_1px_0_#181B2C]">
                          ✨ TAP TO PEEL!
                        </span>
                        <span className="text-[10px] font-extrabold text-[#FFFDF7]">
                          {card.rarity === 'legendary' ? '🌟 HOLO GLOW!' : 'Shiny 1994 Foil'}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={card.slot}
                      data-testid="foil-pack-card"
                      className={`p-3 rounded-xl border-2 shadow-[3px_3px_0_#181B2C] space-y-1.5 ${RARITY_STYLES[card.rarity]}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-[#181B2C] text-[#FFD166] font-display text-[9px] uppercase">
                          {card.rarity}
                        </span>
                        <span className="font-mono-tabular text-[10px] font-extrabold text-[#4A5068]">
                          {CARD_KIND_ICONS[card.kind]}
                        </span>
                      </div>
                      <div className="font-display text-xs text-[#181B2C] leading-snug">
                        {card.title}
                      </div>
                      <div className="text-[11px] font-bold text-[#4A5068]">{card.subtitle}</div>
                    </div>
                  );
                })}
              </div>

              {allRevealed ? (
                <div className="space-y-2.5">
                  <div
                    data-testid="foil-pack-summary"
                    className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold space-y-0.5"
                  >
                    {lastOpened.summaryLines.map((line) => (
                      <div key={line}>✓ {line}</div>
                    ))}
                  </div>
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
                </div>
              ) : (
                <div className="text-center text-[11px] font-extrabold text-[#4A5068]">
                  Tap each shimmering foil card to peel it open (all 3 rewards apply automatically to your club)!
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
