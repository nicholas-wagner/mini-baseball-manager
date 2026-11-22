import { Gift, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { FOIL_PACK_TIER_LABELS } from '../../engine/events/foilPacks';
import { useFoilPackStore } from '../../store/foilPackStore';
import { ComicButton } from '../design-system/ComicButton';

interface FoilPackModalProps {
  open: boolean;
  onClose: () => void;
}

const RARITY_STYLES: Readonly<Record<'common' | 'rare' | 'legendary', string>> = {
  common: 'bg-[#FFFDF7] border-[#181B2C]',
  rare: 'bg-gradient-to-br from-[#E0FBFC] via-[#FFFDF7] to-[#D8F3DC] border-[#1D3557]',
  legendary: 'bg-gradient-to-br from-[#FFF3BF] via-[#FFD166] to-[#FFADAD] border-[#9D0208]',
};

export function FoilPackModal({ open, onClose }: FoilPackModalProps) {
  const unopenedPacks = useFoilPackStore((s) => s.unopenedPacks);
  const openedCount = useFoilPackStore((s) => s.openedCount);
  const lastOpened = useFoilPackStore((s) => s.lastOpened);
  const ripNextPack = useFoilPackStore((s) => s.ripNextPack);
  const clearLastOpened = useFoilPackStore((s) => s.clearLastOpened);

  if (!open) return null;
  const nextPack = unopenedPacks[0] ?? null;

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
                3 Guaranteed Cards: 90s Relic + Clubhouse Boost + Rare Foil Wildcard!
              </div>
              <ComicButton
                variant="gold"
                size="lg"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={() => {
                  const res = ripNextPack();
                  if (res) {
                    soundEngine.play('trophy_fanfare');
                    soundEngine.play('cash_chime');
                  }
                }}
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
                Win any live 3D game, Rivalry matchup, or Playoff clash on Game Day to earn a shiny 1994 Foil Booster Pack!
              </div>
            </div>
          )}

          {lastOpened ? (
            <div className="space-y-3">
              <div className="font-display text-xs uppercase text-[#7209B7]">
                ✨ Pulls from {lastOpened.pack.tierLabel} (Applied Directly to Your Club!)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {lastOpened.pack.cards.map((card) => (
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
                        CARD #{card.slot}/3
                      </span>
                    </div>
                    <div className="font-display text-xs text-[#181B2C] leading-snug">
                      {card.title}
                    </div>
                    <div className="text-[11px] font-bold text-[#4A5068]">{card.subtitle}</div>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold space-y-0.5">
                {lastOpened.summaryLines.map((line) => (
                  <div key={line}>✓ {line}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
