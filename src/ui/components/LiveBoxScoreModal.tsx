import { ClipboardList, X } from 'lucide-react';
import type { Club } from '../../engine/models/club';
import type {
  BatterBoxLine,
  GameSessionState,
  PitcherBoxLine,
} from '../../engine/simulation/gameState';

interface LiveBoxScoreModalProps {
  open: boolean;
  onClose: () => void;
  session: GameSessionState;
  awayClub: Club;
  homeClub: Club;
  onInspectPlayer?: (playerId: string) => void;
}

function formatInningsPitched(outs: number): string {
  const full = Math.floor(outs / 3);
  const rem = outs % 3;
  return `${full}.${rem}`;
}

function BattingTable({
  title,
  club,
  lines,
  onInspectPlayer,
}: {
  title: string;
  club: Club;
  lines: Record<string, BatterBoxLine>;
  onInspectPlayer?: (playerId: string) => void;
}) {
  const nameById = new Map(club.roster.map((p) => [p.id, `${p.name} (${p.position})`]));
  const rows = Object.values(lines);
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="font-display text-xs uppercase text-[#181B2C]">{title}</div>
      <div className="overflow-x-auto rounded-xl border-2 border-[#181B2C] bg-white">
        <table className="w-full text-left text-[11px] font-bold text-[#181B2C]">
          <thead className="bg-[#181B2C] text-[#FFD166] font-display text-[10px]">
            <tr>
              <th className="px-2 py-1.5">Batter</th>
              <th className="px-1.5 py-1.5 text-right">AB</th>
              <th className="px-1.5 py-1.5 text-right">H</th>
              <th className="px-1.5 py-1.5 text-right">R</th>
              <th className="px-1.5 py-1.5 text-right">HR</th>
              <th className="px-1.5 py-1.5 text-right">RBI</th>
              <th className="px-1.5 py-1.5 text-right">BB</th>
              <th className="px-1.5 py-1.5 text-right">K</th>
              <th className="px-1.5 py-1.5 text-right">SB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.playerId} className="border-t border-[#181B2C]/15">
                <td className="px-2 py-1 truncate max-w-[145px]">
                  {onInspectPlayer ? (
                    <button
                      type="button"
                      onClick={() => onInspectPlayer(r.playerId)}
                      className="text-left underline decoration-dotted hover:text-[#E63946] cursor-pointer"
                    >
                      {nameById.get(r.playerId) ?? r.playerId}
                    </button>
                  ) : (
                    (nameById.get(r.playerId) ?? r.playerId)
                  )}
                </td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.atBats}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.hits}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.runs}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.homeRuns}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.rbis}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.walks}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.strikeouts}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{r.stolenBases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PitchingTable({
  title,
  club,
  lines,
  onInspectPlayer,
}: {
  title: string;
  club: Club;
  lines: Record<string, PitcherBoxLine>;
  onInspectPlayer?: (playerId: string) => void;
}) {
  const nameById = new Map(club.roster.map((p) => [p.id, p.name]));
  const rows = Object.values(lines);
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="font-display text-xs uppercase text-[#181B2C]">{title}</div>
      <div className="overflow-x-auto rounded-xl border-2 border-[#181B2C] bg-white">
        <table className="w-full text-left text-[11px] font-bold text-[#181B2C]">
          <thead className="bg-[#1D3557] text-[#FFD166] font-display text-[10px]">
            <tr>
              <th className="px-2 py-1.5">Pitcher</th>
              <th className="px-1.5 py-1.5 text-right">IP</th>
              <th className="px-1.5 py-1.5 text-right">H</th>
              <th className="px-1.5 py-1.5 text-right">ER</th>
              <th className="px-1.5 py-1.5 text-right">BB</th>
              <th className="px-1.5 py-1.5 text-right">K</th>
              <th className="px-1.5 py-1.5 text-right">PC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.playerId} className="border-t border-[#181B2C]/15">
                <td className="px-2 py-1 truncate max-w-[145px]">
                  {onInspectPlayer ? (
                    <button
                      type="button"
                      onClick={() => onInspectPlayer(p.playerId)}
                      className="text-left underline decoration-dotted hover:text-[#E63946] cursor-pointer"
                    >
                      {nameById.get(p.playerId) ?? p.playerId}
                    </button>
                  ) : (
                    (nameById.get(p.playerId) ?? p.playerId)
                  )}
                </td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">
                  {formatInningsPitched(p.outsRecorded)}
                </td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{p.hitsAllowed}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{p.earnedRuns}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{p.walks}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{p.strikeouts}</td>
                <td className="px-1.5 py-1 text-right font-mono-tabular">{p.pitchesThrown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LiveBoxScoreModal({
  open,
  onClose,
  session,
  awayClub,
  homeClub,
  onInspectPlayer,
}: LiveBoxScoreModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Live Box Score"
    >
      <div
        data-testid="live-box-score-modal"
        className="w-full max-w-4xl min-w-0 max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden"
      >
        <div className="px-3 sm:px-4 py-3 bg-[#1B4332] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ClipboardList className="w-5 h-5 text-[#FFD166] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-xs sm:text-base tracking-wide truncate">
                LIVE BOX SCORE — {awayClub.name} {session.away.score} @ {homeClub.name}{' '}
                {session.home.score}
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] truncate">
                Inning Line Score • {session.half} {session.inning} ({session.outs} Out
                {session.outs === 1 ? '' : 's'})
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Live Box Score"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-4 min-h-0 flex-1 overflow-y-auto">
          {/* Inning-by-Inning Line Score */}
          <div className="overflow-x-auto rounded-xl border-2 border-[#181B2C] bg-[#181B2C] text-[#FBF4E4]">
            <table className="w-full text-center text-xs font-mono-tabular font-extrabold">
              <thead className="text-[#FFD166] border-b border-white/20">
                <tr>
                  <th className="px-3 py-1.5 text-left font-display">Club</th>
                  {session.boxScore.inningRuns.map((inn) => (
                    <th key={inn.inning} className="px-2 py-1.5">
                      {inn.inning}
                    </th>
                  ))}
                  <th className="px-3 py-1.5 bg-[#2FB356]/30">R</th>
                  <th className="px-2.5 py-1.5 bg-[#1D3557]/60">H</th>
                  <th className="px-2.5 py-1.5 bg-[#1D3557]/60">E</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="px-3 py-1.5 text-left font-display">{awayClub.colors.monogram}</td>
                  {session.boxScore.inningRuns.map((inn) => (
                    <td key={inn.inning} className="px-2 py-1.5">
                      {inn.away}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[#FFD166]">{session.away.score}</td>
                  <td className="px-2.5 py-1.5 text-[#E0FBFC]">{session.away.hits}</td>
                  <td className="px-2.5 py-1.5 text-white/80">{session.away.errors}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-left font-display">{homeClub.colors.monogram}</td>
                  {session.boxScore.inningRuns.map((inn) => (
                    <td key={inn.inning} className="px-2 py-1.5">
                      {inn.home}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-[#FFD166]">{session.home.score}</td>
                  <td className="px-2.5 py-1.5 text-[#E0FBFC]">{session.home.hits}</td>
                  <td className="px-2.5 py-1.5 text-white/80">{session.home.errors}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <BattingTable
              title={`${awayClub.city} ${awayClub.name} Batting`}
              club={awayClub}
              lines={session.boxScore.awayBatters}
              onInspectPlayer={onInspectPlayer}
            />
            <BattingTable
              title={`${homeClub.city} ${homeClub.name} Batting`}
              club={homeClub}
              lines={session.boxScore.homeBatters}
              onInspectPlayer={onInspectPlayer}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <PitchingTable
              title={`${awayClub.name} Pitching`}
              club={awayClub}
              lines={session.boxScore.awayPitchers}
              onInspectPlayer={onInspectPlayer}
            />
            <PitchingTable
              title={`${homeClub.name} Pitching`}
              club={homeClub}
              lines={session.boxScore.homePitchers}
              onInspectPlayer={onInspectPlayer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
