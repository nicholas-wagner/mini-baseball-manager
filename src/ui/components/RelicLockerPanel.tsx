import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getRelicArtworkUrl } from '../../art/relics/relicPrint';
import { soundEngine } from '../../audio/soundEngine';
import type { Club } from '../../engine/models/club';
import type { Player } from '../../engine/models/player';
import {
  getRelicById,
  RELIC_CATALOG,
  RELIC_FOIL_MULTIPLIERS,
  type BaseballRelic,
} from '../../engine/rpg/relics';
import {
  checkRelicRoleCompatibility,
  getRelicOwnershipUsage,
  getRotatingVintageRelicShop,
  RELIC_RECYCLE_VALUE_BY_RARITY,
  resolveClubRelicInventory,
  resolveDiscoveredRelicIds,
} from '../../engine/rpg/relicLocker';
import {
  buyHumanVintageRelic,
  equipHumanPlayerRelic,
  fuseHumanClubRelic,
  recycleHumanClubRelic,
  unequipHumanPlayerRelic,
} from '../../store/clubHubActions';
import { ComicButton } from '../design-system/ComicButton';

interface RelicLockerPanelProps {
  club: Club;
  selectedPlayer: Player;
  worldSeed: number;
  seriesIndex: number;
  relicMultiplier: number;
  onSelectPlayer: (playerId: string) => void;
  onNotice: (message: string) => void;
}

const RARITY_BADGE: Readonly<Record<'common' | 'rare' | 'legendary', string>> = {
  common: 'bg-[#E2E8F0] text-[#181B2C]',
  rare: 'bg-[#D8F3DC] text-[#1B4332]',
  legendary: 'bg-[#FFC300] text-[#181B2C]',
};

function formatScaledBonuses(
  relic: BaseballRelic,
  relicMultiplier: number,
  foilTier: 1 | 2 | 3,
): string[] {
  const totalScale = Math.max(1, relicMultiplier) * RELIC_FOIL_MULTIPLIERS[foilTier];
  return Object.entries(relic.bonuses)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .map(([k, v]) => `+${Math.round((v as number) * totalScale)} ${k.slice(0, 3).toUpperCase()}`);
}

function RelicThumb({ relic }: { relic: BaseballRelic }) {
  const [failed, setFailed] = useState(false);
  const url = getRelicArtworkUrl(relic.id);
  return (
    <div className="w-14 h-14 rounded-xl border-2 border-[#181B2C] bg-[#FFF8E7] overflow-hidden shrink-0 flex items-center justify-center">
      {url && !failed ? (
        <img
          src={url}
          alt={relic.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xl" aria-hidden="true">🏺</span>
      )}
    </div>
  );
}

export function RelicLockerPanel({
  club,
  selectedPlayer,
  worldSeed,
  seriesIndex,
  relicMultiplier,
  onSelectPlayer,
  onNotice,
}: RelicLockerPanelProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const inventory = resolveClubRelicInventory(club);
  const discoveredIds = new Set(resolveDiscoveredRelicIds(club));
  const shopOffers = getRotatingVintageRelicShop(worldSeed, seriesIndex, club.leagueTier);

  return (
    <div data-testid="relic-locker-panel" className="space-y-4">
      {/* Owned Club Relic Locker */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label htmlFor="relic-player-select" className="text-xs font-display uppercase text-[#181B2C] block">
              🏺 Club 90s Relic Locker ({inventory.length} Owned • {discoveredIds.size}/{RELIC_CATALOG.length} Discovered)
            </label>
            <div className="text-[10.5px] font-bold text-[#4A5068]">
              Equipping on {selectedPlayer.name} ({selectedPlayer.position} · {selectedPlayer.equippedRelicIds.length}/2 slots) • Role-matched gear &amp; Foil Fusion!
            </div>
          </div>
          <select
            id="relic-player-select"
            value={selectedPlayer.id}
            onChange={(e) => onSelectPlayer(e.target.value)}
            className="min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
          >
            {club.roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.position} — {p.name} ({p.equippedRelicIds.length}/2 Relics)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {inventory.map((entry) => {
            const relic = getRelicById(entry.relicId);
            if (!relic) return null;
            const equipped = selectedPlayer.equippedRelicIds.includes(relic.id);
            const usage = getRelicOwnershipUsage(club, relic.id);
            const compat = checkRelicRoleCompatibility(selectedPlayer, relic.id);
            const statPills = formatScaledBonuses(relic, relicMultiplier, entry.foilTier);
            const foilStars = '★'.repeat(entry.foilTier);
            const canFuse = usage.owned >= 2 && usage.spare >= 1 && entry.foilTier < 3;
            const recycleVal = RELIC_RECYCLE_VALUE_BY_RARITY[relic.rarity];

            return (
              <div
                key={relic.id}
                data-testid={`owned-relic-card-${relic.id}`}
                className={`p-2.5 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-2 ${
                  equipped ? 'bg-[#FFF3BF] shadow-[2px_2px_0_#181B2C]' : 'bg-white'
                }`}
              >
                <div className="flex gap-2.5 items-start">
                  <RelicThumb relic={relic} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-display text-xs text-[#181B2C] leading-tight">
                        {relic.name}
                      </span>
                      <span className={`px-1 py-0.5 rounded border border-[#181B2C] text-[9px] font-display uppercase ${RARITY_BADGE[relic.rarity]}`}>
                        {relic.rarity} {foilStars}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-[#4A5068] leading-snug">
                      {relic.flavor}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {statPills.map((pill) => (
                        <span
                          key={pill}
                          className="px-1.5 py-0.5 rounded bg-[#D8F3DC] border border-[#1B4332]/30 text-[9.5px] font-extrabold text-[#1B4332]"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                    <div className="text-[9.5px] font-extrabold text-[#1D3557]">
                      Owned ×{usage.owned} ({usage.spare} spare)
                      {usage.equippedBy.length > 0
                        ? ` • Held by ${usage.equippedBy.map((p) => p.name.split(' ')[0]).join(', ')}`
                        : ''}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <ComicButton
                    size="sm"
                    variant={equipped ? 'coral' : compat.compatible ? 'turf' : 'cream'}
                    disabled={!equipped && !compat.compatible}
                    title={compat.reason}
                    onClick={() => {
                      if (equipped) {
                        unequipHumanPlayerRelic(selectedPlayer.id, relic.id);
                        onNotice(`Unequipped ${relic.name} from ${selectedPlayer.name}.`);
                      } else {
                        const res = equipHumanPlayerRelic(selectedPlayer.id, relic.id, {
                          swapFromHolder: true,
                        });
                        onNotice(
                          res.equipped
                            ? res.swappedFromName
                              ? `Swapped ${relic.name} from ${res.swappedFromName} to ${selectedPlayer.name}!`
                              : `Equipped ${relic.name} on ${selectedPlayer.name}!`
                            : (res.reason ?? 'Cannot equip.'),
                        );
                      }
                      soundEngine.play('ui_pop');
                    }}
                  >
                    {equipped
                      ? 'Unequip'
                      : !compat.compatible
                        ? `${relic.category.toUpperCase()} Only`
                        : usage.spare > 0
                          ? 'Equip Relic'
                          : 'Swap & Equip'}
                  </ComicButton>

                  {canFuse ? (
                    <ComicButton
                      size="sm"
                      variant="gold"
                      icon={<Sparkles className="w-3 h-3" />}
                      onClick={() => {
                        const res = fuseHumanClubRelic(relic.id);
                        onNotice(
                          res.fused
                            ? `Fused ${relic.name} to ${'★'.repeat(res.newFoilTier ?? 2)} Foil (+${res.newFoilTier === 3 ? 50 : 25}% stats)!`
                            : (res.reason ?? 'Cannot fuse.'),
                        );
                        soundEngine.play(res.fused ? 'level_up' : 'ui_pop');
                      }}
                    >
                      Fuse {foilStars}→{'★'.repeat(entry.foilTier + 1)}
                    </ComicButton>
                  ) : null}

                  {usage.spare > 0 ? (
                    <ComicButton
                      size="sm"
                      variant="cream"
                      onClick={() => {
                        const res = recycleHumanClubRelic(relic.id);
                        onNotice(
                          res.recycled
                            ? `Recycled spare ${relic.name} for +$${res.cashAwarded.toLocaleString()}!`
                            : (res.reason ?? 'Cannot recycle.'),
                        );
                        soundEngine.play(res.recycled ? 'cash_chime' : 'ui_pop');
                      }}
                    >
                      Sell +${recycleVal}
                    </ComicButton>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rotating 3-Item Vintage 90s Gear Shop */}
      <div
        data-testid="vintage-relic-shop"
        className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-xs uppercase text-[#181B2C]">
            🏪 Rotating Vintage Gear Shop (Series #{seriesIndex + 1} Stock)
          </div>
          <span className="font-mono-tabular text-xs font-extrabold text-[#1B4332]">
            Club Cash: ${club.economy.cash.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {shopOffers.map(({ relic, price }) => {
            const statPills = formatScaledBonuses(relic, relicMultiplier, 1);
            const canAfford = club.economy.cash >= price;
            return (
              <div
                key={relic.id}
                className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] flex flex-col justify-between gap-2"
              >
                <div className="flex gap-2 items-start">
                  <RelicThumb relic={relic} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-display text-xs text-[#181B2C]">{relic.name}</div>
                    <span className={`inline-block px-1 py-0.5 rounded border border-[#181B2C] text-[9px] font-display uppercase ${RARITY_BADGE[relic.rarity]}`}>
                      {relic.rarity} · {relic.category}
                    </span>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {statPills.map((pill) => (
                        <span key={pill} className="px-1 py-0.5 rounded bg-[#D8F3DC] text-[9px] font-extrabold text-[#1B4332]">
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <ComicButton
                  size="sm"
                  variant={canAfford ? 'gold' : 'cream'}
                  disabled={!canAfford}
                  onClick={() => {
                    const res = buyHumanVintageRelic(relic.id);
                    onNotice(
                      res.purchased
                        ? `Bought ${relic.name} for $${res.price.toLocaleString()} — added to your Locker!`
                        : (res.reason ?? 'Not enough cash.'),
                    );
                    soundEngine.play(res.purchased ? 'cash_chime' : 'ui_pop');
                  }}
                >
                  Buy ${price.toLocaleString()}
                </ComicButton>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible 26-Relic Collector's Checklist */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-xs text-[#181B2C]">
            📖 1994 Relic Collector Checklist ({discoveredIds.size} / {RELIC_CATALOG.length} Discovered)
          </div>
          <ComicButton size="sm" variant="cream" onClick={() => setShowChecklist((v) => !v)}>
            {showChecklist ? 'Hide Checklist' : 'Browse All 26'}
          </ComicButton>
        </div>
        {showChecklist ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
            {RELIC_CATALOG.map((relic) => {
              const found = discoveredIds.has(relic.id);
              return (
                <div
                  key={relic.id}
                  className={`p-2 rounded-lg border border-[#181B2C] flex items-center gap-2 ${
                    found ? 'bg-[#D8F3DC]' : 'bg-[#EFECE4] opacity-75'
                  }`}
                >
                  <RelicThumb relic={relic} />
                  <div className="min-w-0">
                    <div className="font-display text-[10.5px] text-[#181B2C] truncate">{relic.name}</div>
                    <div className="text-[9px] font-extrabold uppercase text-[#4A5068]">
                      {relic.rarity} · {relic.category} {found ? '✓' : '· Unfound'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
