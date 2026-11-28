import { useState } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { buildStadiumUpgradeCards } from '../../engine/ballparks/stadiumProgression';
import {
  evaluateSalaryCapStatus,
  FOIL_CASH_SHOP,
  type SalaryCapHealth,
} from '../../engine/economy/clubLedgerSettlement';
import { buildClubMoneyFlowSummary } from '../../engine/economy/moneyFlowForecast';
import { DISTRICT_BUILDINGS_CATALOG, evaluateDistrictBonuses } from '../../engine/economy/districtBuilder';
import { simulateGameAttendance } from '../../engine/economy/attendance';
import { computeSeriesLedger, PROMO_NIGHT_CATALOG, type PromoNightId } from '../../engine/economy/ledger';
import { PARODY_SPONSORS_CATALOG, TV_CONTRACTS_CATALOG } from '../../engine/economy/sponsorsTv';
import {
  computeClubStaffPayroll,
  STAFF_SALARY_BUDGET_BY_TIER,
} from '../../engine/gm/coaches';
import type { Club } from '../../engine/models/club';
import { computePlayerOverall } from '../../engine/models/player';
import {
  evaluatePowerUpPurchase,
  getPowerUpStatOptions,
  POWER_UP_STAT_LABELS,
  type PowerUpStatKey,
} from '../../engine/rpg/powerUpCamp';
import {
  buyHumanFoilPack,
  hostHumanClubhouseFeast,
  purchaseHumanPowerUp,
  scheduleHumanPromoNight,
} from '../../store/clubHubActions';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';

const CHEAPEST_STAFF_DEPOSIT = 275;

const CAP_DOT: Record<SalaryCapHealth, string> = {
  healthy: '#2D6A4F',
  tight: '#FFB703',
  luxury_tax: '#E85D04',
  over_max: '#E63946',
};

const CAP_LABEL: Record<SalaryCapHealth, string> = {
  healthy: 'Cap healthy',
  tight: 'Cap getting tight',
  luxury_tax: 'Luxury tax',
  over_max: 'Over soft cap',
};

export type TreasuryJumpTarget = 'stadiums' | 'district' | 'staff' | 'free_agency';

interface ClubTreasuryPanelProps {
  club: Club;
  seriesIndex: number;
  onNotice: (message: string) => void;
  onJump: (target: TreasuryJumpTarget) => void;
}

function money(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toLocaleString()}`;
}

function AffordBadge({ cash, cost }: { cash: number; cost: number }) {
  if (cost <= 0 || cash >= cost) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#D8F3DC] text-[#1B4332] border border-[#1B4332]/25">
        Affordable!
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FFE5EC] text-[#9D0208] border border-[#9D0208]/25">
      Need {money(cost - cash)} more
    </span>
  );
}

function Meter({
  label,
  value,
  max,
  testId,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  testId: string;
  tone: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div data-testid={testId} className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#181B2C]">
        <span>{label}</span>
        <span className="font-mono-tabular">
          {money(value)} / {money(max)}
        </span>
      </div>
      <div className="h-3 rounded-full bg-white border border-[#181B2C] overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
}

export function ClubTreasuryPanel({ club, seriesIndex, onNotice, onJump }: ClubTreasuryPanelProps) {
  const freeAgents = useGameStore((state) => state.freeAgents);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const [flowHorizon, setFlowHorizon] = useState<'series' | 'season'>('series');
  const [selectedPowerUpPlayerId, setSelectedPowerUpPlayerId] = useState<string>(
    () => club.roster[0]?.id ?? '',
  );
  const moneyFlow = buildClubMoneyFlowSummary(club);
  const selectedPowerUpPlayer =
    club.roster.find((player) => player.id === selectedPowerUpPlayerId) ?? club.roster[0] ?? null;
  const powerUpStats = selectedPowerUpPlayer ? getPowerUpStatOptions(selectedPowerUpPlayer) : [];
  const powerUpPreviews = selectedPowerUpPlayer
    ? powerUpStats.map((stat) => ({
        stat,
        eval: evaluatePowerUpPurchase(club, selectedPowerUpPlayer.id, stat),
      }))
    : [];
  const powerUpBudgetFull = powerUpPreviews.some((item) => item.eval.willTrimSecondary);
  const cap = evaluateSalaryCapStatus(club);
  const staffPayroll = computeClubStaffPayroll(club.coaches.activeStaff ?? []);
  const staffBudget = STAFF_SALARY_BUDGET_BY_TIER[club.leagueTier];
  const district = evaluateDistrictBonuses(club.stadium.districtTiles);
  const crowd = simulateGameAttendance(club, {
    promoNightId: (club.economy.scheduledPromoId as PromoNightId | null) ?? null,
    districtAttendanceBonusPct: district.attendanceBonusPct,
  });
  const activeSponsors = PARODY_SPONSORS_CATALOG.filter((sponsor) =>
    (club.economy.activeSponsorIds ?? []).includes(sponsor.id),
  );
  const activeTv = TV_CONTRACTS_CATALOG.find((deal) => deal.id === club.economy.tvContractId);
  const projection = computeSeriesLedger(club, {
    homeGames: 3,
    avgAttendance: crowd.attendance,
    promoNightId: (club.economy.scheduledPromoId as PromoNightId | null) ?? null,
    sponsorSeriesBonus: activeSponsors.reduce((sum, sponsor) => sum + sponsor.seriesPayout, 0),
    tvSeriesRevenue: activeTv?.seriesPayout ?? 0,
    districtRevenueBonus: district.totalSeriesRevenueBonus,
    districtUpkeepCost: district.totalSeriesUpkeep,
  });
  const stadiumCost =
    buildStadiumUpgradeCards(club)
      .map((card) => card.cost)
      .filter((cost) => cost > 0)
      .sort((a, b) => a - b)[0] ?? 0;
  const districtCost = Math.min(...DISTRICT_BUILDINGS_CATALOG.map((building) => building.buildCost));
  const faCost =
    freeAgents.length === 0
      ? 500
      : Math.min(...freeAgents.map((player) => player.contract.signingBonus));
  const receipts = club.economy.recentLedgerEntries ?? [];
  const feastUsed = club.economy.spaUsedInSeriesIndex === seriesIndex;
  const bookedPromo = PROMO_NIGHT_CATALOG.find((promo) => promo.id === club.economy.scheduledPromoId);

  const buyPack = (tier: (typeof FOIL_CASH_SHOP)[number]['tier'], label: string) => {
    const res = buyHumanFoilPack(tier);
    onNotice(res.bought ? `Bought a ${label}! Rip it from Foil Packs.` : (res.reason ?? 'Pack unavailable.'));
    soundEngine.play(res.bought ? 'cash_chime' : 'ui_pop');
  };

  const hostFeast = () => {
    const res = hostHumanClubhouseFeast();
    onNotice(res.hosted ? 'Clubhouse Recovery Feast! Fatigue -18, morale +8.' : (res.reason ?? 'Feast unavailable.'));
    soundEngine.play(res.hosted ? 'cash_chime' : 'ui_pop');
  };

  const bookPromo = (promoId: PromoNightId, name: string) => {
    const res = scheduleHumanPromoNight(promoId);
    onNotice(res.booked ? `${name} booked for the next home game!` : (res.reason ?? 'Promo unavailable.'));
    soundEngine.play(res.booked ? 'vendor_bell' : 'ui_pop');
  };

  const buyPowerUp = (stat: PowerUpStatKey) => {
    if (!selectedPowerUpPlayer) return;
    const res = purchaseHumanPowerUp(selectedPowerUpPlayer.id, stat);
    onNotice(res.summary);
    soundEngine.play(res.purchased ? 'level_up' : 'ui_pop');
  };

  return (
    <div data-testid="club-treasury-panel" className="space-y-3">
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#4A5068]">Club Cash</div>
            <div data-testid="treasury-cash" className="font-display text-2xl text-[#1B4332]">
              {money(club.economy.cash)}
            </div>
          </div>
          <div
            data-testid="treasury-projected-net"
            className={`px-2 py-1 rounded-lg border-2 border-[#181B2C] text-xs font-extrabold ${
              projection.netProfit >= 0 ? 'bg-[#D8F3DC] text-[#1B4332]' : 'bg-[#FFD6D6] text-[#9D0208]'
            }`}
          >
            Projected series net {projection.netProfit >= 0 ? '+' : '−'}
            {money(Math.abs(projection.netProfit))}
          </div>
        </div>
        <Meter
          testId="treasury-cap-meter"
          label={`${CAP_LABEL[cap.status]}${cap.luxuryTaxPerSeries > 0 ? ` · tax ${money(cap.luxuryTaxPerSeries)}/series` : ''}`}
          value={cap.payroll}
          max={cap.softCapMax}
          tone={CAP_DOT[cap.status]}
        />
        <Meter
          testId="treasury-staff-meter"
          label="Staff budget"
          value={staffPayroll}
          max={staffBudget}
          tone="#4CC3FF"
        />
      </div>

      {/* Transparent Money Flow Breakdown (TASK-143) */}
      <div
        data-testid="money-flow-breakdown"
        className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-xs sm:text-sm text-[#181B2C]">
              💵 How Your Club Earns &amp; Spends Cash
            </div>
            <div className="text-[10.5px] font-bold text-[#4A5068]">
              Avg crowd ~{moneyFlow.avgHomeAttendance.toLocaleString()} fans • Net{' '}
              {(flowHorizon === 'series' ? moneyFlow.netPerSeries : moneyFlow.netPerSeason) >= 0 ? '+' : '−'}
              {money(Math.abs(flowHorizon === 'series' ? moneyFlow.netPerSeries : moneyFlow.netPerSeason))}{' '}
              / {flowHorizon === 'series' ? '3-Game Series' : '21-Game Season'}
            </div>
          </div>
          <div className="inline-flex rounded-lg border-2 border-[#181B2C] bg-[#FBF4E4] p-0.5 gap-0.5">
            <button
              type="button"
              data-testid="money-flow-horizon-series"
              aria-pressed={flowHorizon === 'series'}
              onClick={() => setFlowHorizon('series')}
              className={`px-2 py-1 rounded text-[10px] font-display cursor-pointer ${
                flowHorizon === 'series' ? 'bg-[#1D3557] text-[#FFD166]' : 'text-[#181B2C]'
              }`}
            >
              Per Series (3g)
            </button>
            <button
              type="button"
              data-testid="money-flow-horizon-season"
              aria-pressed={flowHorizon === 'season'}
              onClick={() => setFlowHorizon('season')}
              className={`px-2 py-1 rounded text-[10px] font-display cursor-pointer ${
                flowHorizon === 'season' ? 'bg-[#1D3557] text-[#FFD166]' : 'text-[#181B2C]'
              }`}
            >
              Full Season (21g)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl border border-[#1B4332]/40 bg-[#F2FBF4] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-display text-[#1B4332]">
              <span>📈 Cash Earned (Income)</span>
              <span className="font-mono-tabular">
                +{money(flowHorizon === 'series' ? moneyFlow.totalIncomePerSeries : moneyFlow.totalIncomePerSeason)}
              </span>
            </div>
            {moneyFlow.incomeLines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-2 text-[10.5px]">
                <div className="min-w-0">
                  <div className="font-extrabold text-[#181B2C]">{line.label}</div>
                  <div className="text-[9.5px] font-bold text-[#4A5068]">{line.detail}</div>
                </div>
                <span className="font-mono-tabular font-extrabold text-[#1B4332] shrink-0">
                  +{money(flowHorizon === 'series' ? line.perSeries : line.perSeason)}
                </span>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-xl border border-[#9D0208]/35 bg-[#FFF5F7] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-display text-[#9D0208]">
              <span>📉 Cash Spent (Expenses)</span>
              <span className="font-mono-tabular">
                −{money(flowHorizon === 'series' ? moneyFlow.totalExpensePerSeries : moneyFlow.totalExpensePerSeason)}
              </span>
            </div>
            {moneyFlow.expenseLines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-2 text-[10.5px]">
                <div className="min-w-0">
                  <div className="font-extrabold text-[#181B2C]">{line.label}</div>
                  <div className="text-[9.5px] font-bold text-[#4A5068]">{line.detail}</div>
                </div>
                <span className="font-mono-tabular font-extrabold text-[#9D0208] shrink-0">
                  −{money(flowHorizon === 'series' ? line.perSeries : line.perSeason)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#FFF3BF] border border-[#181B2C]/30 text-[10.5px] font-extrabold text-[#181B2C] space-y-0.5">
          {moneyFlow.cfoTips.map((tip) => (
            <div key={tip}>💡 {tip}</div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5" data-testid="power-up-camp">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C]">💪 Power-Up Camp</div>
            <p className="text-[11px] font-bold text-[#4A5068]">
              Spend club cash for permanent +1 boosts inside stat caps.
            </p>
          </div>
          {selectedPowerUpPlayer ? (
            <select
              data-testid="power-up-player-select"
              aria-label="Select player for Power-Up Camp"
              value={selectedPowerUpPlayer.id}
              onChange={(event) => setSelectedPowerUpPlayerId(event.target.value)}
              className="min-h-[44px] max-w-full px-2.5 py-1 rounded-lg border-2 border-[#181B2C] bg-[#FBF4E4] text-xs font-extrabold text-[#181B2C]"
            >
              {club.roster.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.position} · OVR {computePlayerOverall(player)})
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {powerUpBudgetFull ? (
          <p
            data-testid="power-up-budget-note"
            className="text-[11px] font-extrabold text-[#9D0208] bg-[#FFE5EC] border border-[#9D0208]/30 rounded-lg px-2 py-1"
          >
            Budget full: +1 trims -1 from a secondary skill
          </p>
        ) : null}
        {selectedPowerUpPlayer ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {powerUpPreviews.map(({ stat, eval: preview }) => {
              const maxed = preview.currentValue >= preview.capValue || preview.currentValue >= 99;
              const affordable = !maxed && club.economy.cash >= preview.cost;
              return (
                <button
                  key={stat}
                  type="button"
                  data-testid={`power-up-stat-${stat}`}
                  disabled={!preview.allowed}
                  onClick={() => buyPowerUp(stat)}
                  className={`min-h-[44px] p-2 rounded-xl border-2 border-[#181B2C] text-left flex flex-col justify-between gap-1 transition ${
                    preview.allowed
                      ? 'bg-[#FFF3BF] hover:bg-[#FFD86B] cursor-pointer shadow-[2px_2px_0_#181B2C]'
                      : 'bg-[#F3EFE6] opacity-70 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[11px] text-[#181B2C] truncate">
                      {POWER_UP_STAT_LABELS[stat]}
                    </span>
                    <span className="font-mono-tabular text-[10.5px] font-extrabold text-[#1D3557] shrink-0">
                      {preview.currentValue} / {preview.capValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-mono-tabular text-[11px] font-extrabold text-[#181B2C]">
                      {maxed ? 'MAX' : money(preview.cost)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                        maxed
                          ? 'bg-[#E5E7EB] text-[#374151] border-[#374151]/25'
                          : affordable
                            ? 'bg-[#D8F3DC] text-[#1B4332] border-[#1B4332]/25'
                            : 'bg-[#FFE5EC] text-[#9D0208] border-[#9D0208]/25'
                      }`}
                    >
                      {maxed ? 'Maxed' : affordable ? 'Affordable!' : 'Short'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2">
        <div className="font-display text-sm text-[#181B2C]">Recent Ledger Receipts</div>
        {receipts.length === 0 ? (
          <p className="text-xs font-bold text-[#4A5068]">Play a game to print your first P&amp;L receipt.</p>
        ) : (
          receipts.slice(0, 4).map((entry) => {
            const open = openReceipt === entry.id;
            return (
              <div key={entry.id} className="rounded-lg border border-[#181B2C] bg-white">
                <button
                  type="button"
                  className="w-full min-h-[44px] px-2 py-1.5 flex items-center justify-between gap-2 text-left text-xs font-extrabold"
                  onClick={() => setOpenReceipt(open ? null : entry.id)}
                >
                  <span className="truncate">{entry.gameLabel}</span>
                  <span className={entry.netDelta >= 0 ? 'text-[#1B4332]' : 'text-[#9D0208]'}>
                    {entry.netDelta >= 0 ? '+' : '−'}
                    {money(Math.abs(entry.netDelta))}
                  </span>
                </button>
                {open ? (
                  <ul className="px-2 pb-2 space-y-0.5 text-[11px] font-bold">
                    {entry.lines.map((item) => (
                      <li key={`${entry.id}-${item.label}`} className="flex justify-between gap-2">
                        <span>{item.label}</span>
                        <span>
                          {item.kind === 'income' ? '+' : '−'}
                          {money(item.amount)}
                        </span>
                      </li>
                    ))}
                    {entry.bailoutTriggered ? <li>Bake-sale bailout kept the lights on.</li> : null}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {FOIL_CASH_SHOP.map((pack) => (
          <div key={pack.tier} className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] flex flex-col justify-between gap-2">
            <div>
              <div className="font-display text-xs text-[#181B2C]">{pack.label}</div>
              <div className="text-[11px] font-extrabold text-[#4A5068]">{money(pack.cost)}</div>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
              <AffordBadge cash={club.economy.cash} cost={pack.cost} />
              <ComicButton size="sm" variant="gold" data-testid={`buy-foil-${pack.tier}`} onClick={() => buyPack(pack.tier, pack.label)}>
                Buy Pack
              </ComicButton>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-white flex flex-col justify-between gap-2">
          <div className="space-y-1">
            <div className="font-display text-sm text-[#181B2C]">Clubhouse Recovery Feast</div>
            <p className="text-[11px] font-bold text-[#4A5068]">$750 once per series. Fatigue -18, morale +8.</p>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <AffordBadge cash={club.economy.cash} cost={750} />
            <ComicButton size="sm" variant="turf" data-testid="host-feast" disabled={feastUsed} onClick={hostFeast}>
              {feastUsed ? 'Already feasted this series' : 'Host Feast'}
            </ComicButton>
          </div>
        </div>
        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-white space-y-2">
          <div className="font-display text-sm text-[#181B2C]">Promo Night</div>
          {bookedPromo ? (
            <p data-testid="promo-booked" className="text-xs font-extrabold text-[#1B4332]">
              {bookedPromo.name}: Booked for Next Home Game!
            </p>
          ) : (
            <p className="text-[11px] font-bold text-[#4A5068]">Pay now. The bonus hits the next home gate.</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {PROMO_NIGHT_CATALOG.map((promo) => (
              <ComicButton
                key={promo.id}
                size="sm"
                variant={club.economy.scheduledPromoId === promo.id ? 'gold' : 'cream'}
                data-testid={`book-promo-${promo.id}`}
                onClick={() => bookPromo(promo.id, promo.name)}
              >
                {promo.name} ({money(promo.cost)})
              </ComicButton>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <JumpCard title="Stadium Upgrades" cost={stadiumCost} cash={club.economy.cash} onClick={() => onJump('stadiums')} />
        <JumpCard title="District Plaza" cost={districtCost} cash={club.economy.cash} onClick={() => onJump('district')} />
        <JumpCard title="Coaching Staff" cost={CHEAPEST_STAFF_DEPOSIT} cash={club.economy.cash} onClick={() => onJump('staff')} />
        <JumpCard title="Free Agency" cost={faCost} cash={club.economy.cash} onClick={() => onJump('free_agency')} />
      </div>
    </div>
  );
}

function JumpCard({
  title,
  cost,
  cash,
  onClick,
}: {
  title: string;
  cost: number;
  cash: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[44px] p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] text-left space-y-1"
    >
      <div className="font-display text-xs text-[#181B2C]">{title}</div>
      <div className="text-[11px] font-extrabold">
        <AffordBadge cash={cash} cost={cost} />
      </div>
    </button>
  );
}
