import { useState } from 'react';
import { Gift, ShoppingBag, Sparkles, X } from 'lucide-react';
import { getRelicArtworkUrl, type RelicArtworkMap } from '../../art/relics/relicPrint';
import { soundEngine } from '../../audio/soundEngine';
import { FOIL_CASH_SHOP } from '../../engine/economy/clubLedgerSettlement';
import {
  FOIL_PACK_TIER_LABELS,
  LEGENDARY_PITY_THRESHOLD,
  type FoilCardKind,
  type FoilPackCard,
} from '../../engine/events/foilPacks';
import { RELIC_CATALOG } from '../../engine/rpg/relics';
import {
  checkRelicRoleCompatibility,
  resolveDiscoveredRelicIds,
} from '../../engine/rpg/relicLocker';
import { buyHumanFoilPack } from '../../store/clubHubActions';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
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
  const bg =
    card.rarity === 'legendary'
      ? '#FFE08A'
      : card.rarity === 'rare'
        ? '#D8F3DC'
        : '#FFF3D6';

  return (
    <div
      data-testid="foil-card-artwork"
      className="w-full h-24 rounded-lg border-2 border-[#181B2C] flex items-center justify-center overflow-hidden"
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
          ) : card.kind === 'staff_clinic_pass' ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <rect x="26" y="16" width="44" height="32" rx="6" fill="#38BDF8" />
              <path d="M36 28 H60 M36 36 H54" stroke="#181B2C" strokeWidth="2.4" />
            </g>
          ) : card.kind === 'holo_upgrade' ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <polygon points="48,8 58,28 78,32 58,38 48,56 38,38 18,32 38,28" fill="#FFC300" />
              <circle cx="48" cy="32" r="7" fill="#FF4D6D" />
            </g>
          ) : card.kind === 'hype_ticket' ? (
            <g stroke="#181B2C" strokeWidth="2.2">
              <path d="M20 20 H76 V28 A4 4 0 0 0 76 36 V44 H20 V36 A4 4 0 0 0 20 28 Z" fill="#FF4D6D" />
              <text x="48" y="36" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFDF7" stroke="none">
                VIP FAN
              </text>
            </g>
          ) : (
            <g stroke="#181B2C" strokeWidth="2.2">
              <circle cx="48" cy="32" r="15" fill="#FFFDF7" />
              <path d="M39 22 Q45 32 39 42 M57 22 Q51 32 57 42" fill="none" stroke="#E63946" strokeWidth="2" />
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
  staff_clinic_pass: '🎓 Clinic Pass',
  holo_upgrade: '🌟 Holo Stamp',
};

export function FoilPackModal({
  open,
  onClose,
  onBackToGame,
  onViewRelics,
  backLabel = '⚾ Back to Opening Day',
  relicArtworkMap,
}: FoilPackModalProps) {
  const humanClub = useGameStore((s) => s.getHumanClub());
  const unopenedPacks = useFoilPackStore((s) => s.unopenedPacks);
  const openedCount = useFoilPackStore((s) => s.openedCount);
  const packsSinceLegendary = useFoilPackStore((s) => s.packsSinceLegendary);
  const lastOpened = useFoilPackStore((s) => s.lastOpened);
  const ripNextPack = useFoilPackStore((s) => s.ripNextPack);
  const claimCardForTarget = useFoilPackStore((s) => s.claimCardForTarget);
  const clearLastOpened = useFoilPackStore((s) => s.clearLastOpened);
  const reducedMotion = useUserPreferencesStore((s) => s.reducedMotion);
  const [revealedSlots, setRevealedSlots] = useState<number[]>([1]);
  const [selectedTargets, setSelectedTargets] = useState<Record<number, string>>({});
  const [shopNotice, setShopNotice] = useState<string | null>(null);

  if (!open) return null;
  const nextPack = unopenedPacks[0] ?? null;
  const allRevealed = lastOpened ? revealedSlots.length >= lastOpened.pack.cards.length : false;
  const discoveredCount = humanClub ? resolveDiscoveredRelicIds(humanClub).length : 0;
  const pityPct = Math.min(100, Math.round((packsSinceLegendary / LEGENDARY_PITY_THRESHOLD) * 100));

  const handleRipPack = () => {
    const res = ripNextPack();
    if (res) {
      setRevealedSlots([1]);
      setSelectedTargets({});
      setShopNotice(null);
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

  const handleBuyPackInShop = (tier: (typeof FOIL_CASH_SHOP)[number]['tier'], label: string) => {
    const res = buyHumanFoilPack(tier);
    setShopNotice(
      res.bought ? `Bought ${label}! Rip it open right above!` : (res.reason ?? 'Need more Club Cash.'),
    );
    soundEngine.play(res.bought ? 'cash_chime' : 'ui_pop');
  };

  const closeAndReset = () => {
    clearLastOpened();
    setRevealedSlots([1]);
    setSelectedTargets({});
    setShopNotice(null);
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
                Unopened: {unopenedPacks.length} • Ripped: {openedCount} • Relics: {discoveredCount}/{RELIC_CATALOG.length}
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
          {/* Collection Progress & Legendary Pity Meter */}
          <div
            data-testid="foil-pack-pity-strip"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-extrabold"
          >
            <div className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex items-center justify-between">
              <span className="text-[#181B2C]">📖 Relic Collection</span>
              <span className="text-[#1B4332]">
                {discoveredCount} / {RELIC_CATALOG.length} Found
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] space-y-0.5">
              <div className="flex items-center justify-between text-[#7A4F01]">
                <span>🌟 Legendary Pity Meter</span>
                <span>
                  {packsSinceLegendary >= LEGENDARY_PITY_THRESHOLD
                    ? 'NEXT PACK GUARANTEED!'
                    : `${packsSinceLegendary}/${LEGENDARY_PITY_THRESHOLD}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white border border-[#181B2C] overflow-hidden">
                <div className="h-full bg-[#E63946]" style={{ width: `${pityPct}%` }} />
              </div>
            </div>
          </div>

          {/* Newly Ripped Cards ALWAYS appear FIRST so the prize owns the screen! */}
          {lastOpened ? (
            <div data-testid="foil-pack-pulls-section" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-xs uppercase text-[#7209B7]">
                  ✨ Pulls from {lastOpened.pack.tierLabel}
                  {lastOpened.pack.pityTriggered ? ' · 🌟 PITY LEGENDARY!' : ''}
                </div>
                <span className="px-2 py-0.5 rounded-full border border-[#181B2C] bg-[#FFFDF7] text-[10px] font-extrabold text-[#181B2C]">
                  {revealedSlots.length}/{lastOpened.pack.cards.length} Peeled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {lastOpened.pack.cards.map((card) => {
                  const isRevealed = revealedSlots.includes(card.slot);
                  const claimedText = lastOpened.claimedSlots[card.slot];
                  if (!isRevealed) {
                    return (
                      <div key={card.slot} className="foil-card-stage">
                        <button
                          type="button"
                          data-testid="foil-pack-card"
                          data-peel-state="sealed"
                          aria-label={`Peel foil card ${card.slot} of 3`}
                          onClick={() => handleRevealSlot(card.slot)}
                          className="foil-card-sealed w-full p-4 rounded-xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#7209B7] via-[#F72585] to-[#FFC300] text-white shadow-[3px_3px_0_#181B2C] flex flex-col items-center justify-center gap-2 min-h-[146px] cursor-pointer"
                        >
                          <span className="foil-shimmer-sheen" aria-hidden="true" />
                          <span data-testid="foil-corner-peel" className="foil-corner-peel" aria-hidden="true" />
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

                  const needsPlayerPick =
                    card.kind === 'relic' || card.kind === 'training_xp' || card.kind === 'holo_upgrade';
                  const needsStaffPick = card.kind === 'staff_clinic_pass';
                  const eligiblePlayers = humanClub
                    ? humanClub.roster.filter((p) =>
                        card.kind === 'relic' && card.relicId
                          ? checkRelicRoleCompatibility(p, card.relicId).compatible
                          : true,
                      )
                    : [];
                  const staffList = humanClub?.coaches.activeStaff ?? [];
                  const defaultTarget = needsStaffPick
                    ? (staffList[0]?.id ?? '')
                    : (eligiblePlayers[0]?.id ?? '');
                  const activeTarget = selectedTargets[card.slot] ?? defaultTarget;

                  return (
                    <div key={card.slot} className="foil-card-stage">
                      <div
                        data-testid="foil-pack-card"
                        data-peel-state="revealed"
                        className={`foil-card-revealed p-2.5 rounded-xl border-2 shadow-[3px_3px_0_#181B2C] flex flex-col justify-between gap-2 h-full ${RARITY_STYLES[card.rarity]}`}
                      >
                        <div className="space-y-1.5">
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
                          <div className="text-[10.5px] font-bold text-[#4A5068]">{card.subtitle}</div>
                        </div>

                        {/* Player Agency Assignment Controls */}
                        {claimedText ? (
                          <div className="px-2 py-1 rounded-lg bg-[#D8F3DC] border border-[#1B4332]/40 text-[10px] font-extrabold text-[#1B4332]">
                            ✓ {claimedText}
                          </div>
                        ) : needsPlayerPick && eligiblePlayers.length > 0 ? (
                          <div className="space-y-1 pt-1 border-t border-dashed border-[#181B2C]/25">
                            <select
                              aria-label={`Choose player for ${card.title}`}
                              value={activeTarget}
                              onChange={(e) =>
                                setSelectedTargets((prev) => ({ ...prev, [card.slot]: e.target.value }))
                              }
                              className="w-full min-h-[34px] px-1.5 rounded-lg border border-[#181B2C] bg-white text-[10.5px] font-bold"
                            >
                              {eligiblePlayers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.position} {p.name}
                                </option>
                              ))}
                            </select>
                            <ComicButton
                              size="sm"
                              variant={card.kind === 'relic' ? 'turf' : 'gold'}
                              className="w-full"
                              onClick={() => {
                                const res = claimCardForTarget(card.slot, activeTarget);
                                soundEngine.play(res.claimed ? 'level_up' : 'ui_pop');
                              }}
                            >
                              {card.kind === 'relic'
                                ? 'Equip Now (or Keep in Locker)'
                                : card.kind === 'holo_upgrade'
                                  ? '🌟 Stamp Holo!'
                                  : '⚡ Assign Pass'}
                            </ComicButton>
                          </div>
                        ) : needsStaffPick ? (
                          <div className="space-y-1 pt-1 border-t border-dashed border-[#181B2C]/25">
                            {staffList.length > 0 ? (
                              <select
                                aria-label={`Choose staff for ${card.title}`}
                                value={activeTarget}
                                onChange={(e) =>
                                  setSelectedTargets((prev) => ({ ...prev, [card.slot]: e.target.value }))
                                }
                                className="w-full min-h-[34px] px-1.5 rounded-lg border border-[#181B2C] bg-white text-[10.5px] font-bold"
                              >
                                {staffList.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} (R{s.level})
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            <ComicButton
                              size="sm"
                              variant="sky"
                              className="w-full"
                              onClick={() => {
                                const res = claimCardForTarget(card.slot, activeTarget);
                                soundEngine.play(res.claimed ? 'level_up' : 'ui_pop');
                              }}
                            >
                              {staffList.length > 0 ? '🎓 Boost Staff' : '💰 Redeem $900'}
                            </ComicButton>
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded-lg bg-[#D8F3DC] text-[10px] font-extrabold text-[#1B4332]">
                            ✓ Auto-Banked to Club!
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 1994 Wax-Pack Bubblegum Trivia Strip */}
              <div
                data-testid="foil-pack-gum-trivia"
                className="px-3 py-1.5 rounded-xl border border-[#181B2C]/40 bg-[#FFE5EC] text-[#9D0208] text-[11px] font-extrabold text-center"
              >
                {lastOpened.pack.gumTrivia}
              </div>

              {allRevealed ? (
                <div
                  data-testid="foil-pack-summary"
                  className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-[#1B4332] text-xs font-extrabold space-y-0.5"
                >
                  {lastOpened.summaryLines.map((line, idx) => (
                    <div key={`${line}-${idx}`}>✓ {line}</div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[11px] font-extrabold text-[#4A5068]">
                  Tap each shimmering corner to peel — Relics go safely into your Locker &amp; you choose who gets every boost!
                </div>
              )}
            </div>
          ) : null}

          {/* Next Pack Ripper OR Empty State */}
          {nextPack ? (
            <div className="p-4 rounded-2xl border-[3px] border-[#181B2C] bg-gradient-to-br from-[#FFC300] via-[#FF4D6D] to-[#7209B7] text-center space-y-2.5 shadow-[4px_4px_0_#181B2C]">
              <div className="inline-block px-3 py-0.5 rounded-full bg-[#181B2C] text-[#FFD166] font-display text-[11px]">
                {FOIL_PACK_TIER_LABELS[nextPack.tier]}
              </div>
              <div className="font-display text-lg text-white drop-shadow-[2px_2px_0_#181B2C]">
                ✨ {nextPack.reason} ✨
              </div>
              <div className="text-xs font-extrabold text-[#FFFDF7]">
                3 Guaranteed Foil Cards: 90s Relic + Prospect/Clinic Boost + Rare Holo Wildcard!
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
                Win games &amp; sweeps to earn free packs, or grab a fresh 1994 Booster Pack from the Card Shop below!
              </div>
            </div>
          )}

          {/* In-Modal 1994 Card Shop */}
          {humanClub ? (
            <div
              data-testid="foil-pack-card-shop"
              className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-xs uppercase text-[#181B2C] flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#7209B7]" />
                  1994 Corner Card Shop
                </div>
                <span className="font-mono-tabular text-xs font-extrabold text-[#1B4332]">
                  Club Cash: ${humanClub.economy.cash.toLocaleString()}
                </span>
              </div>
              {shopNotice ? (
                <div className="px-2.5 py-1 rounded-lg bg-[#FFF3BF] border border-[#181B2C] text-[11px] font-extrabold text-[#181B2C]">
                  {shopNotice}
                </div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {FOIL_CASH_SHOP.map((offer) => {
                  const canAfford = humanClub.economy.cash >= offer.cost;
                  return (
                    <div
                      key={offer.tier}
                      className="p-2 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] flex flex-col justify-between gap-1.5"
                    >
                      <div>
                        <div className="font-display text-[11px] text-[#181B2C]">{offer.label}</div>
                        <div className="text-[10px] font-bold text-[#4A5068]">
                          {offer.tier === 'championship_holo'
                            ? 'Rare/Legendary relics + Holo chase'
                            : offer.tier === 'rivalry_chrome'
                              ? 'Boosted Rare/Holo odds + passes'
                              : 'Classic 3-card 1994 booster'}
                        </div>
                      </div>
                      <ComicButton
                        size="sm"
                        variant={canAfford ? 'gold' : 'cream'}
                        disabled={!canAfford}
                        onClick={() => handleBuyPackInShop(offer.tier, offer.label)}
                      >
                        Buy ${offer.cost.toLocaleString()}
                      </ComicButton>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky Thumb-Zone Footer Bar */}
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
                <ComicButton size="md" variant="gold" onClick={handleRevealAll} className="shrink-0">
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
