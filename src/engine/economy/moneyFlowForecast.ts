import { computeClubStaffPayroll } from '../gm/coaches';
import type { Club } from '../models/club';
import { simulateGameAttendance } from './attendance';
import {
  evaluateSalaryCapStatus,
  GAME_LOSS_CASH_BONUS,
  GAME_WIN_CASH_BONUS,
} from './clubLedgerSettlement';
import { evaluateDistrictBonuses } from './districtBuilder';
import type { PromoNightId } from './ledger';
import { PARODY_SPONSORS_CATALOG, TV_CONTRACTS_CATALOG } from './sponsorsTv';

export interface MoneyFlowLineItem {
  id: string;
  label: string;
  detail: string;
  perSeries: number;
  perSeason: number;
}

export interface ClubMoneyFlowSummary {
  avgHomeAttendance: number;
  incomeLines: MoneyFlowLineItem[];
  expenseLines: MoneyFlowLineItem[];
  totalIncomePerSeries: number;
  totalExpensePerSeries: number;
  netPerSeries: number;
  totalIncomePerSeason: number;
  totalExpensePerSeason: number;
  netPerSeason: number;
  cfoTips: string[];
}

const SERIES_PER_SEASON = 7;
const HOME_GAMES_PER_SERIES_AVG = 1.5;
const ROAD_GAMES_PER_SERIES_AVG = 1.5;

function sumLines(lines: readonly MoneyFlowLineItem[], key: 'perSeries' | 'perSeason'): number {
  return lines.reduce((sum, item) => sum + item[key], 0);
}

function buildCfoTips(
  netPerSeries: number,
  tvPerSeries: number,
  sponsorPerSeries: number,
  luxuryTaxPerSeries: number,
): string[] {
  const tips: string[] = [];
  if (tvPerSeries === 0) {
    tips.push('Sign a Local TV / Radio Broadcast Deal in Ballpark Economy for steady guaranteed cash every series.');
  }
  if (sponsorPerSeries === 0) {
    tips.push('Sign an Outfield Fence Sponsor to earn extra bonus payouts every 3-game series.');
  }
  if (luxuryTaxPerSeries > 0) {
    tips.push(`Club is over the Hard Salary Cap — paying $${luxuryTaxPerSeries.toLocaleString()}/series in Luxury Tax.`);
  }
  if (netPerSeries < 0 && tips.length < 2) {
    tips.push('Upgrade stadium seating, book Promo Nights, or trim high payroll deals to turn cash-flow positive.');
  }
  if (tips.length === 0) {
    tips.push(
      `Healthy cash flow (+$${netPerSeries.toLocaleString()}/series avg)! Reinvest into Power-Up Camp, Relics, or Stadium Upgrades.`,
    );
  }
  return tips.slice(0, 2);
}

/**
 * Builds a crystal-clear breakdown of how a club earns and spends cash per 3-game series
 * and across a full 21-game season (7 series).
 */
export function buildClubMoneyFlowSummary(club: Club): ClubMoneyFlowSummary {
  const district = evaluateDistrictBonuses(club.stadium.districtTiles);
  const crowd = simulateGameAttendance(club, {
    promoNightId: (club.economy.scheduledPromoId as PromoNightId | null) ?? null,
    districtAttendanceBonusPct: district.attendanceBonusPct,
  });
  const cap = evaluateSalaryCapStatus(club);
  const staffAnnual = computeClubStaffPayroll(club.coaches.activeStaff ?? []);

  const homeGatePerGame = Math.round(
    crowd.attendance * (club.economy.ticketPrice + 2.5 + club.stadium.seatingTier * 0.75),
  );
  const roadGatePerGame = Math.round(homeGatePerGame * 0.25);
  const gatePerSeries = Math.round(
    homeGatePerGame * HOME_GAMES_PER_SERIES_AVG + roadGatePerGame * ROAD_GAMES_PER_SERIES_AVG,
  );
  const activeSponsors = new Set(club.economy.activeSponsorIds ?? []);
  const sponsorPerSeries = PARODY_SPONSORS_CATALOG.reduce(
    (sum, s) => sum + (activeSponsors.has(s.id) ? s.seriesPayout : 0),
    0,
  );
  const tvDeal = TV_CONTRACTS_CATALOG.find((t) => t.id === club.economy.tvContractId);
  const tvPerSeries = tvDeal?.seriesPayout ?? 0;
  const districtRevPerSeries = district.totalSeriesRevenueBonus;
  // Average ~1.5 wins + 1.5 losses per 3-game series baseline
  const gameBonusPerSeries = Math.round((GAME_WIN_CASH_BONUS + GAME_LOSS_CASH_BONUS) * 1.5);

  const incomeLines: MoneyFlowLineItem[] = [
    {
      id: 'gate',
      label: '🎟️ Tickets & Concessions',
      detail: `~${crowd.attendance.toLocaleString()} fans/home game @ $${club.economy.ticketPrice} + 25% road share`,
      perSeries: gatePerSeries,
      perSeason: gatePerSeries * SERIES_PER_SEASON,
    },
    {
      id: 'win_bonus',
      label: '🏆 Game & Win Payouts',
      detail: `+$${GAME_WIN_CASH_BONUS.toLocaleString()} per Win / +$${GAME_LOSS_CASH_BONUS.toLocaleString()} per Loss (+$2,500 on 3-0 Sweeps)`,
      perSeries: gameBonusPerSeries,
      perSeason: gameBonusPerSeries * SERIES_PER_SEASON,
    },
    {
      id: 'tv',
      label: '📺 Broadcast TV Deal',
      detail: tvDeal ? tvDeal.networkName : 'No active TV deal yet',
      perSeries: tvPerSeries,
      perSeason: tvPerSeries * SERIES_PER_SEASON,
    },
    {
      id: 'sponsors',
      label: '📣 Outfield Sponsors',
      detail: `${activeSponsors.size} active sponsor${activeSponsors.size === 1 ? '' : 's'}`,
      perSeries: sponsorPerSeries,
      perSeason: sponsorPerSeries * SERIES_PER_SEASON,
    },
    {
      id: 'district',
      label: '🎡 Ballpark District Shops',
      detail: `${club.stadium.districtTiles.filter((t) => Boolean(t.buildingId)).length} built district venues`,
      perSeries: districtRevPerSeries,
      perSeason: districtRevPerSeries * SERIES_PER_SEASON,
    },
  ];

  const playerPayrollPerSeries = Math.round(cap.payroll / SERIES_PER_SEASON);
  const staffPayrollPerSeries = Math.round(staffAnnual / SERIES_PER_SEASON);
  const districtUpkeepPerSeries = district.totalSeriesUpkeep;

  const expenseLines: MoneyFlowLineItem[] = [
    {
      id: 'player_payroll',
      label: '⚾ Player Payroll',
      detail: `${club.roster.length} active players ($${cap.payroll.toLocaleString()}/season)`,
      perSeries: playerPayrollPerSeries,
      perSeason: cap.payroll,
    },
    {
      id: 'staff_payroll',
      label: '📋 Coaches & Medical Staff',
      detail: `${(club.coaches.activeStaff ?? []).length} hired staff ($${staffAnnual.toLocaleString()}/season)`,
      perSeries: staffPayrollPerSeries,
      perSeason: staffAnnual,
    },
    {
      id: 'district_upkeep',
      label: '🏟️ Stadium & District Upkeep',
      detail: 'Facility maintenance & staff operations',
      perSeries: districtUpkeepPerSeries,
      perSeason: districtUpkeepPerSeries * SERIES_PER_SEASON,
    },
    ...(cap.luxuryTaxPerSeries > 0
      ? [
          {
            id: 'luxury_tax',
            label: '💸 Luxury Tax Penalty',
            detail: '15% tax on payroll above Hard Salary Cap',
            perSeries: cap.luxuryTaxPerSeries,
            perSeason: cap.luxuryTaxPerSeries * SERIES_PER_SEASON,
          },
        ]
      : []),
  ];

  const totalIncomePerSeries = sumLines(incomeLines, 'perSeries');
  const totalExpensePerSeries = sumLines(expenseLines, 'perSeries');
  const netPerSeries = totalIncomePerSeries - totalExpensePerSeries;
  const totalIncomePerSeason = sumLines(incomeLines, 'perSeason');
  const totalExpensePerSeason = sumLines(expenseLines, 'perSeason');

  return {
    avgHomeAttendance: crowd.attendance,
    incomeLines,
    expenseLines,
    totalIncomePerSeries,
    totalExpensePerSeries,
    netPerSeries,
    totalIncomePerSeason,
    totalExpensePerSeason,
    netPerSeason: totalIncomePerSeason - totalExpensePerSeason,
    cfoTips: buildCfoTips(netPerSeries, tvPerSeries, sponsorPerSeries, cap.luxuryTaxPerSeries),
  };
}
