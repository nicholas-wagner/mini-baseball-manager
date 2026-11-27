import { useState } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { simulateGameAttendance } from '../../engine/economy/attendance';
import {
  DISTRICT_BUILDINGS_CATALOG,
  evaluateDistrictBonuses,
  type DistrictBuildingId,
} from '../../engine/economy/districtBuilder';
import {
  computeSeriesLedger,
  evaluateFanPricingMood,
  PROMO_NIGHT_CATALOG,
  type PromoNightId,
} from '../../engine/economy/ledger';
import {
  MAX_ACTIVE_SPONSORS,
  PARODY_SPONSORS_CATALOG,
  TV_CONTRACTS_CATALOG,
} from '../../engine/economy/sponsorsTv';
import type { Club } from '../../engine/models/club';
import {
  buildHumanDistrictTile,
  scheduleHumanPromoNight,
  signHumanParodySponsor,
  signHumanTvContract,
  updateHumanEconomyPricing,
} from '../../store/clubHubActions';
import { ComicButton } from '../design-system/ComicButton';

interface BallparkEconomyPanelProps {
  club: Club;
  onNotice: (message: string) => void;
}

const MOOD_EMOJI = {
  ecstatic: '😍',
  happy: '😄',
  grumpy: '😠',
  furious: '🤬',
} as const;

export function BallparkEconomyPanel({ club, onNotice }: BallparkEconomyPanelProps) {
  const bookedPromoId = (club.economy.scheduledPromoId ?? null) as PromoNightId | null;
  const [selectedPromoId, setSelectedPromoId] = useState<PromoNightId | null>(bookedPromoId);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    club.stadium.districtTiles[0]?.slotId ?? 'north-1',
  );

  const districtBonuses = evaluateDistrictBonuses(club.stadium.districtTiles);
  const attendance = simulateGameAttendance(club, {
    promoNightId: selectedPromoId,
    districtAttendanceBonusPct: districtBonuses.attendanceBonusPct,
  });
  const fanMood = evaluateFanPricingMood(club.economy.ticketPrice, club.leagueTier);

  const activeSponsors = PARODY_SPONSORS_CATALOG.filter((s) =>
    (club.economy.activeSponsorIds ?? []).includes(s.id),
  );
  const activeTv = TV_CONTRACTS_CATALOG.find((t) => t.id === club.economy.tvContractId) ?? null;

  const seriesLedger = computeSeriesLedger(club, {
    homeGames: 3,
    avgAttendance: attendance.attendance,
    promoNightId: selectedPromoId,
    sponsorSeriesBonus: activeSponsors.reduce((s, sp) => s + sp.seriesPayout, 0),
    tvSeriesRevenue: activeTv?.seriesPayout ?? 0,
    districtRevenueBonus: districtBonuses.totalSeriesRevenueBonus,
    districtUpkeepCost: districtBonuses.totalSeriesUpkeep,
  });

  const activeTile =
    club.stadium.districtTiles.find((t) => t.slotId === selectedSlotId) ??
    club.stadium.districtTiles[0];

  return (
    <div data-testid="ballpark-economy-panel" className="space-y-4">
      {/* Live Pricing, Attendance & 3-Game Series Financial Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display text-sm text-[#181B2C]">
              Tickets, Concessions &amp; Fan Mood
            </div>
            <span className="px-2 py-0.5 rounded-lg border border-[#181B2C] bg-[#FFF3BF] text-xs font-extrabold text-[#181B2C]">
              {MOOD_EMOJI[fanMood.mood]} {fanMood.label}
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-[#181B2C]">
              Ticket Price: ${club.economy.ticketPrice}
              <input
                aria-label="Ticket Price"
                type="range"
                min={4}
                max={55}
                value={club.economy.ticketPrice}
                onChange={(e) =>
                  updateHumanEconomyPricing(
                    Number(e.target.value),
                    club.economy.concessionPrice,
                    club.economy.concessionQuality,
                  )
                }
                className="w-full accent-[#1B4332] mt-1"
              />
            </label>

            <label className="block text-xs font-extrabold text-[#181B2C]">
              Concessions Price: ${club.economy.concessionPrice}
              <input
                aria-label="Concessions Price"
                type="range"
                min={2}
                max={20}
                value={club.economy.concessionPrice}
                onChange={(e) =>
                  updateHumanEconomyPricing(
                    club.economy.ticketPrice,
                    Number(e.target.value),
                    club.economy.concessionQuality,
                  )
                }
                className="w-full accent-[#E63946] mt-1"
              />
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-[#4A5068]">Snack Quality:</span>
              {([1, 2, 3] as const).map((tier) => (
                <ComicButton
                  key={tier}
                  size="sm"
                  variant={club.economy.concessionQuality === tier ? 'gold' : 'cream'}
                  onClick={() => {
                    updateHumanEconomyPricing(
                      club.economy.ticketPrice,
                      club.economy.concessionPrice,
                      tier,
                    );
                    soundEngine.play('vendor_bell');
                  }}
                >
                  {tier === 1 ? 'Lv.1 Hot Dogs' : tier === 2 ? 'Lv.2 Nachos' : 'Lv.3 Helmet Bowls'}
                </ComicButton>
              ))}
            </div>
          </div>

          {/* Live Attendance Bar */}
          <div className="p-2.5 rounded-xl border border-[#181B2C] bg-[#FBF4E4] space-y-1">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#181B2C]">
              <span>Projected Crowd</span>
              <span className="font-mono-tabular">
                {attendance.attendance.toLocaleString()} / {attendance.capacity.toLocaleString()} (
                {Math.round(attendance.crowdFillRatio * 100)}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-white border border-[#181B2C] overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.round(attendance.crowdFillRatio * 100)}%`,
                  backgroundColor: attendance.sellout ? '#2D6A4F' : '#FFB703',
                }}
              />
            </div>
            <div className="text-[11px] font-bold text-[#1B4332]">{attendance.fanBuzzSummary}</div>
          </div>
        </div>

        {/* Series Financial Projection & Promo Night Selector */}
        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
          <div className="font-display text-sm text-[#181B2C]">
            3-Game Series Financial Projection
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-extrabold">
            <div className="p-2 rounded-lg bg-[#D8F3DC] border border-[#181B2C]">
              Tickets: <span className="font-mono-tabular">+${seriesLedger.ticketRevenue.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#D8F3DC] border border-[#181B2C]">
              Concessions: <span className="font-mono-tabular">+${seriesLedger.concessionRevenue.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E0FBFC] border border-[#181B2C]">
              Sponsors &amp; Plaza: <span className="font-mono-tabular">+${seriesLedger.sponsorRevenue.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#E0FBFC] border border-[#181B2C]">
              TV Broadcast: <span className="font-mono-tabular">+${seriesLedger.tvRevenue.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-[#FFE5E5] border border-[#181B2C]">
              Payroll &amp; Upkeep: <span className="font-mono-tabular">−${seriesLedger.operatingExpenses.toLocaleString()}</span>
            </div>
            <div
              className={`p-2 rounded-lg border-2 border-[#181B2C] ${
                seriesLedger.netProfit >= 0 ? 'bg-[#FFF3BF] text-[#1B4332]' : 'bg-[#FFD6D6] text-[#9D0208]'
              }`}
            >
              Net Profit:{' '}
              <span className="font-mono-tabular">
                {seriesLedger.netProfit >= 0 ? '+' : '−'}$
                {Math.abs(seriesLedger.netProfit).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold uppercase text-[#4A5068]">
              Preview Promo Night Boost
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ComicButton
                size="sm"
                variant={selectedPromoId === null ? 'gold' : 'cream'}
                onClick={() => setSelectedPromoId(null)}
              >
                Regular Game
              </ComicButton>
              {PROMO_NIGHT_CATALOG.map((promo) => (
                <ComicButton
                  key={promo.id}
                  size="sm"
                  variant={selectedPromoId === promo.id ? 'gold' : 'cream'}
                  onClick={() => {
                    setSelectedPromoId(promo.id);
                    soundEngine.play('vendor_bell');
                  }}
                >
                  {promo.name} (+{Math.round(promo.attendanceBoostPct * 100)}%)
                </ComicButton>
              ))}
            </div>
            {bookedPromoId ? (
              <div data-testid="ballpark-promo-booked" className="text-xs font-extrabold text-[#1B4332]">
                Booked for Next Home Game!
              </div>
            ) : null}
            <ComicButton
              size="sm"
              variant="gold"
              disabled={!selectedPromoId || selectedPromoId === bookedPromoId}
              onClick={() => {
                if (!selectedPromoId) return;
                const res = scheduleHumanPromoNight(selectedPromoId);
                const promo = PROMO_NIGHT_CATALOG.find((item) => item.id === selectedPromoId);
                onNotice(
                  res.booked
                    ? `${promo?.name ?? 'Promo'} booked for the next home game!`
                    : (res.reason ?? 'Promo unavailable.'),
                );
                soundEngine.play(res.booked ? 'cash_chime' : 'ui_pop');
              }}
            >
              Book for Next Home Game
            </ComicButton>
          </div>
        </div>
      </div>

      {/* 90s Parody Sponsors & Tier-Gated TV Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-sm text-[#181B2C]">
              90s Outfield Wall Sponsors ({activeSponsors.length}/{MAX_ACTIVE_SPONSORS})
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PARODY_SPONSORS_CATALOG.map((sponsor) => {
              const isSigned = (club.economy.activeSponsorIds ?? []).includes(sponsor.id);
              return (
                <div
                  key={sponsor.id}
                  className={`p-2.5 rounded-xl border-2 border-[#181B2C] flex flex-col justify-between gap-1.5 ${
                    isSigned ? 'bg-[#D8F3DC]' : 'bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display text-xs text-[#181B2C]">{sponsor.name}</span>
                      <span
                        className="w-3 h-3 rounded-full border border-[#181B2C] shrink-0"
                        style={{ backgroundColor: sponsor.billboardColor }}
                      />
                    </div>
                    <div className="text-[10px] font-bold text-[#4A5068]">{sponsor.tagline}</div>
                    <div className="text-[10px] font-extrabold text-[#1B4332] mt-0.5">
                      +${sponsor.seriesPayout.toLocaleString()}/series • Unlocks {sponsor.minTier.toUpperCase()}
                    </div>
                  </div>
                  <ComicButton
                    size="sm"
                    variant={isSigned ? 'turf' : 'sky'}
                    disabled={isSigned}
                    onClick={() => {
                      const res = signHumanParodySponsor(sponsor.id);
                      onNotice(
                        res.signed
                          ? `Mounted ${sponsor.name} on the outfield wall (+$${sponsor.seriesPayout}/series)!`
                          : (res.reason ?? 'Unavailable.'),
                      );
                      soundEngine.play(res.signed ? 'cash_chime' : 'ui_pop');
                    }}
                  >
                    {isSigned ? 'On Wall ✓' : `Sign ${sponsor.name}`}
                  </ComicButton>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
          <div className="font-display text-sm text-[#181B2C]">
            TV Broadcast Contracts ({activeTv ? activeTv.networkName : 'No Deal Yet'})
          </div>
          <div className="space-y-2">
            {TV_CONTRACTS_CATALOG.map((deal) => {
              const isCurrent = club.economy.tvContractId === deal.id;
              return (
                <div
                  key={deal.id}
                  className={`p-2.5 rounded-xl border-2 border-[#181B2C] flex flex-wrap items-center justify-between gap-2 ${
                    isCurrent ? 'bg-[#D8F3DC]' : 'bg-white'
                  }`}
                >
                  <div>
                    <div className="font-display text-xs text-[#181B2C]">{deal.networkName}</div>
                    <div className="text-[10px] font-bold text-[#4A5068]">
                      +${deal.seriesPayout.toLocaleString()}/series • +{deal.fanExposureBonus} Fan Buzz •{' '}
                      {deal.minTier.toUpperCase()}+
                    </div>
                  </div>
                  <ComicButton
                    size="sm"
                    variant={isCurrent ? 'turf' : 'gold'}
                    disabled={isCurrent}
                    onClick={() => {
                      const res = signHumanTvContract(deal.id);
                      onNotice(
                        res.signed
                          ? `Signed broadcast deal: ${deal.networkName}!`
                          : (res.reason ?? 'Unavailable.'),
                      );
                      soundEngine.play(res.signed ? 'cash_chime' : 'ui_pop');
                    }}
                  >
                    {isCurrent ? 'Active Network ✓' : `Sign ${deal.networkName}`}
                  </ComicButton>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sim-City Ballpark District Builder Grid */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C]">
              Sim-City Ballpark District Grid
            </div>
            <div className="text-xs font-bold text-[#4A5068]">
              Select one of your 4 plaza lots, then construct or upgrade buildings for adjacency synergies!
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold">
            <span className="px-2 py-0.5 rounded bg-[#D8F3DC] border border-[#181B2C]">
              +${districtBonuses.totalSeriesRevenueBonus.toLocaleString()}/series
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C]">
              +{Math.round(districtBonuses.attendanceBonusPct * 100)}% Crowd
            </span>
            <span className="px-2 py-0.5 rounded bg-[#E0FBFC] border border-[#181B2C]">
              ⚡ {districtBonuses.adjacencySynergyCount} Plaza Synergies
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {club.stadium.districtTiles.map((tile) => {
            const building = DISTRICT_BUILDINGS_CATALOG.find((b) => b.id === tile.buildingId);
            const selected = tile.slotId === activeTile?.slotId;
            return (
              <button
                key={tile.slotId}
                type="button"
                onClick={() => setSelectedSlotId(tile.slotId)}
                className={`min-h-[64px] p-2.5 rounded-xl border-2 border-[#181B2C] text-left transition-all ${
                  selected
                    ? 'bg-[#FFC300] shadow-[3px_3px_0_#181B2C]'
                    : building
                      ? 'bg-[#D8F3DC]'
                      : 'bg-[#FBF4E4]'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase text-[#4A5068]">
                  Lot {tile.slotId}
                </div>
                <div className="font-display text-xs text-[#181B2C]">
                  {building ? `${building.name} (Lv.${tile.tier})` : 'Empty Plaza Lot'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {DISTRICT_BUILDINGS_CATALOG.map((b) => {
            const isSameOnTile = activeTile?.buildingId === b.id;
            const cost = isSameOnTile
              ? Math.round(b.buildCost * ((activeTile?.tier ?? 1) + 0.5))
              : b.buildCost;
            return (
              <div
                key={b.id}
                className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="font-display text-xs text-[#181B2C]">{b.name}</div>
                  <div className="text-[10px] font-bold text-[#4A5068] mt-0.5">{b.description}</div>
                  <div className="text-[10px] font-extrabold text-[#1B4332] mt-1">
                    +${b.seriesRevenueBonus}/sr • +{Math.round(b.attendanceBonusPct * 100)}% Crowd
                  </div>
                </div>
                <ComicButton
                  size="sm"
                  variant={isSameOnTile ? 'gold' : 'turf'}
                  onClick={() => {
                    const targetSlot = activeTile?.slotId ?? 'north-1';
                    const res = buildHumanDistrictTile(targetSlot, b.id as DistrictBuildingId);
                    onNotice(
                      res.built
                        ? `Built ${b.name} on Lot ${targetSlot}!`
                        : (res.reason ?? 'Could not build.'),
                    );
                    soundEngine.play(res.built ? 'cash_chime' : 'ui_pop');
                  }}
                >
                  {isSameOnTile ? `Upgrade ${b.name}` : `Build ${b.name}`} (${cost.toLocaleString()})
                </ComicButton>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
