import { useState } from 'react';
import { Handshake, X } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { evaluateSalaryCapStatus } from '../../engine/economy/clubLedgerSettlement';
import {
  buildPlayerExtensionDemand,
  evaluateContractOffer,
  type ContractNegotiationOutcome,
  type ContractOfferInput,
} from '../../engine/gm/contractNegotiation';
import type { Club } from '../../engine/models/club';
import { computePlayerOverall, type Player } from '../../engine/models/player';
import { signNegotiatedHumanContractExtension } from '../../store/clubHubActions';
import { ComicButton } from '../design-system/ComicButton';
import { PlayerPortraitBadge } from './PlayerPortraitBadge';

interface ContractNegotiationModalProps {
  club: Club;
  player: Player | null;
  onClose: () => void;
  onSigned: (summary: string) => void;
}

export function ContractNegotiationModal({
  club,
  player,
  onClose,
  onSigned,
}: ContractNegotiationModalProps) {
  if (!player) return null;
  return (
    <ContractNegotiationInner
      key={player.id}
      club={club}
      player={player}
      onClose={onClose}
      onSigned={onSigned}
    />
  );
}

function ContractNegotiationInner({
  club,
  player,
  onClose,
  onSigned,
}: {
  club: Club;
  player: Player;
  onClose: () => void;
  onSigned: (summary: string) => void;
}) {
  const demand = buildPlayerExtensionDemand(player);
  const cap = evaluateSalaryCapStatus(club);
  const [years, setYears] = useState<1 | 2 | 3 | 4>(demand.preferredYears);
  const [salary, setSalary] = useState<number>(demand.askingSalary);
  const [round, setRound] = useState<1 | 2 | 3>(1);
  const [outcome, setOutcome] = useState<ContractNegotiationOutcome | null>(null);

  const minSalary = Math.max(300, Math.round((demand.floorSalary * 0.7) / 50) * 50);
  const maxSalary = Math.max(demand.askingSalary + 1_000, Math.round((demand.askingSalary * 1.45) / 50) * 50);
  const projectedPayroll = cap.payroll - player.contract.salaryPerSeason + salary;
  const overSoftCap = projectedPayroll > cap.softCapMax;
  const ovr = computePlayerOverall(player);

  const submitOffer = (offer: ContractOfferInput) => {
    const res = evaluateContractOffer(club, player, demand, offer, round);
    setOutcome(res);
    if (res.status === 'accepted') {
      const applied = signNegotiatedHumanContractExtension(player.id, offer);
      if (applied.applied) {
        soundEngine.play('cash_chime');
        onSigned(
          `Signed ${player.name} to a +${offer.years}-yr extension @ $${offer.salaryPerSeason.toLocaleString()}/yr!`,
        );
        onClose();
      }
      return;
    }
    if (res.status === 'counter') {
      soundEngine.play('ui_pop');
      setRound((r) => Math.min(3, r + 1) as 1 | 2 | 3);
      return;
    }
    soundEngine.play('ump_strike_call');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#181B2C]/75 flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Negotiate Contract Extension with ${player.name}`}
    >
      <div
        data-testid="contract-negotiation-modal"
        className="w-full max-w-lg rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[6px_6px_0_#181B2C] overflow-hidden flex flex-col max-h-[92dvh]"
      >
        <div className="px-4 py-3 bg-[#1D3557] text-[#FBF4E4] border-b-[3px] border-[#181B2C] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Handshake className="w-5 h-5 text-[#FFD166] shrink-0" />
            <div className="min-w-0">
              <div className="font-display text-sm truncate">
                Contract Negotiation — {player.name}
              </div>
              <div className="text-[11px] font-bold text-[#FFD166] truncate">
                {player.position} · Age {player.age} · OVR {ovr} · Round {round}/3
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Contract Negotiation"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-[#FBF4E4] text-[#181B2C] border-2 border-[#181B2C] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] flex items-start gap-3">
            <PlayerPortraitBadge
              player={player}
              primaryColor={club.colors.primary}
              accentColor={club.colors.accent}
              size="sm"
            />
            <div className="space-y-1 min-w-0">
              <span className="inline-block px-2 py-0.5 rounded bg-[#FFF3BF] border border-[#181B2C] text-[10px] font-display text-[#181B2C]">
                {demand.archetypeLabel}
              </span>
              <p className="text-xs font-bold text-[#181B2C]">
                &ldquo;{outcome ? outcome.playerReply : demand.openingQuote}&rdquo;
              </p>
              <div className="text-[10.5px] font-extrabold text-[#4A5068]">
                Target Ask: +{demand.preferredYears} yr @ ${demand.askingSalary.toLocaleString()}/yr (Current: ${player.contract.salaryPerSeason.toLocaleString()}/yr, {player.contract.yearsRemaining} yr left)
              </div>
            </div>
          </div>

          {outcome ? (
            <div
              data-testid="negotiation-mood-bar"
              className={`p-2.5 rounded-xl border-2 border-[#181B2C] space-y-1 ${
                outcome.status === 'walked'
                  ? 'bg-[#FFE5EC] text-[#9D0208]'
                  : outcome.status === 'counter'
                    ? 'bg-[#FFF3BF] text-[#181B2C]'
                    : 'bg-[#D8F3DC] text-[#1B4332]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-display">
                <span>Player Mood Meter</span>
                <span>{outcome.moodScore}/100</span>
              </div>
              <div className="h-2 rounded-full border border-[#181B2C] bg-white overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${outcome.moodScore}%`,
                    backgroundColor: outcome.moodScore >= 75 ? '#2FB356' : outcome.moodScore >= 50 ? '#FFB703' : '#E63946',
                  }}
                />
              </div>
              {outcome.counterOffer ? (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold">
                    Counter: +{outcome.counterOffer.years} yr @ ${outcome.counterOffer.salaryPerSeason.toLocaleString()}/yr
                  </span>
                  <ComicButton
                    size="sm"
                    variant="turf"
                    data-testid="accept-counter-offer-btn"
                    onClick={() => submitOffer(outcome.counterOffer!)}
                  >
                    Accept Counter 🤝
                  </ComicButton>
                </div>
              ) : null}
            </div>
          ) : null}

          {outcome?.status !== 'walked' ? (
            <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
              <div>
                <div className="text-[11px] font-display uppercase text-[#181B2C] mb-1.5">
                  Extension Length (Years Added)
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {([1, 2, 3, 4] as const).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      data-testid={`negotiate-years-${yr}`}
                      aria-pressed={years === yr}
                      onClick={() => setYears(yr)}
                      className={`min-h-[40px] rounded-xl border-2 border-[#181B2C] font-display text-xs cursor-pointer ${
                        years === yr ? 'bg-[#FFC300] text-[#181B2C] shadow-[2px_2px_0_#181B2C]' : 'bg-[#FBF4E4]'
                      }`}
                    >
                      +{yr} yr
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#181B2C]">
                  <span>Annual Salary Offer</span>
                  <span data-testid="negotiate-salary-readout" className="font-mono-tabular text-[#1B4332]">
                    ${salary.toLocaleString()}/yr
                  </span>
                </div>
                <input
                  aria-label="Annual salary offer"
                  type="range"
                  min={minSalary}
                  max={maxSalary}
                  step={50}
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full accent-[#1D3557]"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSalary(Math.max(minSalary, Math.round((demand.askingSalary * 0.9) / 50) * 50))}
                    className="px-2 py-1 rounded-lg border border-[#181B2C] bg-[#E0FBFC] text-[10px] font-extrabold cursor-pointer"
                  >
                    −10% Team-Friendly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalary(demand.askingSalary)}
                    className="px-2 py-1 rounded-lg border border-[#181B2C] bg-[#FFF3BF] text-[10px] font-extrabold cursor-pointer"
                  >
                    Match Ask (${demand.askingSalary.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalary(Math.min(maxSalary, Math.round((demand.askingSalary * 1.1) / 50) * 50))}
                    className="px-2 py-1 rounded-lg border border-[#181B2C] bg-[#D8F3DC] text-[10px] font-extrabold cursor-pointer"
                  >
                    +10% Sweetener
                  </button>
                </div>
              </div>

              <div
                className={`p-2 rounded-lg border text-[11px] font-extrabold flex items-center justify-between ${
                  overSoftCap
                    ? 'bg-[#FFE5EC] border-[#9D0208] text-[#9D0208]'
                    : 'bg-[#F2FBF4] border-[#1B4332]/40 text-[#1B4332]'
                }`}
              >
                <span>Projected Club Payroll</span>
                <span className="font-mono-tabular">
                  ${projectedPayroll.toLocaleString()} / ${cap.softCapMax.toLocaleString()} Soft Cap
                </span>
              </div>

              <ComicButton
                size="md"
                variant="gold"
                data-testid="submit-contract-offer-btn"
                disabled={overSoftCap}
                className="w-full"
                onClick={() => submitOffer({ years, salaryPerSeason: salary })}
              >
                Submit Offer: +{years} yr @ ${salary.toLocaleString()}/yr
              </ComicButton>
            </div>
          ) : (
            <ComicButton size="md" variant="cream" className="w-full" onClick={onClose}>
              Close Talks
            </ComicButton>
          )}
        </div>
      </div>
    </div>
  );
}
