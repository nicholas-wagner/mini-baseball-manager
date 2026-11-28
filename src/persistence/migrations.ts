import type { ClubEconomy } from '../engine/models/club';

const LEDGER_HISTORY_CAP = 12;

/** Fills living-economy fields missing from saves written before TASK-108. */
export function migrateClubEconomy(economy: ClubEconomy): ClubEconomy {
  const history = Array.isArray(economy.recentLedgerEntries) ? economy.recentLedgerEntries : [];
  return {
    ...economy,
    scheduledPromoId: economy.scheduledPromoId ?? null,
    recentLedgerEntries: history.slice(0, LEDGER_HISTORY_CAP),
    ...(typeof economy.spaUsedInSeriesIndex === 'number'
      ? { spaUsedInSeriesIndex: economy.spaUsedInSeriesIndex }
      : {}),
  };
}
