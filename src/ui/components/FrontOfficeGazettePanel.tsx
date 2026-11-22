import { useMemo, useState } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { generateSandlotGazetteIssue } from '../../engine/events/newspaper';
import {
  drawSurpriseEvent,
  SURPRISE_EVENTS_DECK,
  type SurpriseEventCard,
} from '../../engine/events/surpriseDeck';
import {
  evaluateTradeProposal,
  generateDeadlineTradeOffer,
} from '../../engine/gm/tradeEngine';
import {
  MAX_WINTER_BALL_AGE,
  WINTER_LEAGUE_DESTINATIONS,
  type WinterLeagueId,
} from '../../engine/gm/winterBall';
import {
  MAX_ACADEMY_ROSTER_SIZE,
  type Club,
} from '../../engine/models/club';
import { computePlayerOverall } from '../../engine/models/player';
import { createSeededRng } from '../../engine/rng/seededRng';
import {
  callUpHumanAcademyProspect,
  executeHumanTradeWithRival,
  resolveHumanSurpriseEvent,
  retireHumanPlayerJersey,
  runHumanAcademyTrainingCamp,
  runHumanWinterBall,
  scoutAndStashHumanAcademyProspect,
} from '../../store/clubHubActions';
import { ComicButton } from '../design-system/ComicButton';

interface FrontOfficeGazettePanelProps {
  club: Club;
  tierClubs: readonly Club[];
  worldSeed: number;
  seasonNumber: number;
  onNotice: (message: string) => void;
}

export function FrontOfficeGazettePanel({
  club,
  tierClubs,
  worldSeed,
  seasonNumber,
  onNotice,
}: FrontOfficeGazettePanelProps) {
  const rivalClubs = useMemo(
    () => tierClubs.filter((c) => c.id !== club.id),
    [tierClubs, club.id],
  );

  // Surprise Deck state
  const [drawCounter, setDrawCounter] = useState(0);
  const [seenCardIds, setSeenCardIds] = useState<string[]>([]);
  const [activeCard, setActiveCard] = useState<SurpriseEventCard | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);

  // Trade Machine state
  const [rivalId, setRivalId] = useState<string>(rivalClubs[0]?.id ?? '');
  const selectedRival = rivalClubs.find((c) => c.id === rivalId) ?? rivalClubs[0];
  const [outgoingId, setOutgoingId] = useState<string>(club.roster[0]?.id ?? '');
  const [incomingId, setIncomingId] = useState<string>(selectedRival?.roster[0]?.id ?? '');
  const [cashSweetener, setCashSweetener] = useState<number>(0);

  // Winter Ball & Jersey Retirement state
  const eligibleProspects = useMemo(
    () => [...club.roster, ...club.academyProspects].filter((p) => p.age <= MAX_WINTER_BALL_AGE),
    [club.roster, club.academyProspects],
  );
  const [winterPlayerId, setWinterPlayerId] = useState<string>(eligibleProspects[0]?.id ?? '');
  const [winterDestId, setWinterDestId] = useState<WinterLeagueId>('dominican');
  const [retirePlayerId, setRetirePlayerId] = useState<string>(club.roster[0]?.id ?? '');

  const resolvedOutgoingId = club.roster.some((p) => p.id === outgoingId)
    ? outgoingId
    : (club.roster[0]?.id ?? '');
  const resolvedIncomingId = selectedRival?.roster.some((p) => p.id === incomingId)
    ? incomingId
    : (selectedRival?.roster[0]?.id ?? '');

  const rumorOffer = useMemo(() => {
    if (!selectedRival) return null;
    return generateDeadlineTradeOffer(
      createSeededRng(worldSeed + seasonNumber * 311 + club.wins * 13),
      club,
      selectedRival,
    );
  }, [worldSeed, seasonNumber, club, selectedRival]);

  const gazette = useMemo(
    () =>
      generateSandlotGazetteIssue({
        seasonNumber,
        seriesIndex: Math.max(1, Math.floor((club.wins + club.losses) / 3) + 1),
        humanClub: club,
        tradeHeadline: rumorOffer?.pitchHeadline,
      }),
    [seasonNumber, club, rumorOffer],
  );

  const tradeEval = useMemo(() => {
    if (!selectedRival || !resolvedOutgoingId || !resolvedIncomingId) return null;
    return evaluateTradeProposal(club, selectedRival, {
      outgoingPlayerIds: [resolvedOutgoingId],
      incomingPlayerIds: [resolvedIncomingId],
      cashSweetener,
    });
  }, [club, selectedRival, resolvedOutgoingId, resolvedIncomingId, cashSweetener]);

  const handleDrawSurprise = () => {
    const nextCount = drawCounter + 1;
    const card = drawSurpriseEvent(
      createSeededRng(worldSeed + seasonNumber * 887 + nextCount * 53),
      seenCardIds,
    );
    setDrawCounter(nextCount);
    setSeenCardIds((prev) => [...prev, card.id]);
    setActiveCard(card);
    setLastOutcome(null);
    soundEngine.play('card_flip');
  };

  const handleResolveChoice = (choiceId: string) => {
    if (!activeCard) return;
    const res = resolveHumanSurpriseEvent(activeCard, choiceId);
    if (res.applied && res.choice) {
      const bonusNote = res.boostedPlayerName ? ` (+${res.choice.bonusSp} SP to ${res.boostedPlayerName}!)` : '';
      const msg = `${res.choice.outcomeText}${bonusNote}`;
      setLastOutcome(msg);
      setActiveCard(null);
      onNotice(msg);
      soundEngine.play(res.choice.cashDelta >= 0 ? 'cash_chime' : 'level_up');
    }
  };

  return (
    <div data-testid="front-office-gazette-panel" className="space-y-4">
      {/* The Sandlot Gazette 1994 Tabloid Front Page */}
      <div className="p-4 rounded-2xl border-[3px] border-[#181B2C] bg-[#FBF4E4] shadow-[4px_4px_0_#181B2C] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#181B2C] pb-1.5">
          <div className="font-display text-base sm:text-lg tracking-wider text-[#181B2C]">
            📰 THE SANDLOT GAZETTE — EXTRA! EXTRA!
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#181B2C] text-[#FFD166]">
            Season {gazette.seasonNumber} • Series #{gazette.seriesIndex}
          </span>
        </div>
        <div className="font-display text-sm sm:text-base text-[#9D0208]">{gazette.headline}</div>
        <div className="text-xs font-extrabold text-[#181B2C]">{gazette.subhead}</div>
        <ul className="space-y-1 text-xs font-bold text-[#4A5068] list-disc pl-4">
          {gazette.spotlightBlurbs.map((blurb) => (
            <li key={blurb}>{blurb}</li>
          ))}
        </ul>
      </div>

      {/* 52-Card 90s Narrative Surprise Events Deck */}
      <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C]">
              90s Dugout Surprise Events Deck ({SURPRISE_EVENTS_DECK.length} Cards)
            </div>
            <div className="text-xs font-bold text-[#4A5068]">
              Draw a quirky 90s clubhouse or ballpark dilemma with bold vs. steady trade-offs!
            </div>
          </div>
          <ComicButton size="sm" variant="gold" onClick={handleDrawSurprise}>
            Draw 90s Surprise Card
          </ComicButton>
        </div>

        {activeCard ? (
          <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-sm text-[#181B2C]">{activeCard.title}</div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#181B2C] text-[#FBF4E4]">
                {activeCard.category.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-bold text-[#181B2C]">{activeCard.flavor}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeCard.choices.map((choice, idx) => (
                <ComicButton
                  key={choice.id}
                  data-testid={`surprise-choice-${idx}`}
                  size="sm"
                  variant={idx === 0 ? 'coral' : 'sky'}
                  onClick={() => handleResolveChoice(choice.id)}
                >
                  {choice.label}
                </ComicButton>
              ))}
            </div>
          </div>
        ) : null}

        {lastOutcome ? (
          <div
            data-testid="surprise-outcome-banner"
            className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#D8F3DC] text-xs font-extrabold text-[#181B2C]"
          >
            ★ {lastOutcome}
          </div>
        ) : null}
      </div>

      {/* Multi-Player Trade Machine */}
      {selectedRival ? (
        <div
          data-testid="trade-machine-panel"
          className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display text-sm text-[#181B2C]">
                Front Office Trade Machine ({club.leagueTier.toUpperCase()} Tier)
              </div>
              <div className="text-xs font-bold text-[#4A5068]">
                Negotiate with personality-driven AI GMs respecting Salary Caps &amp; 20-man limits.
              </div>
            </div>
            <select
              aria-label="Trade Partner Club"
              value={selectedRival.id}
              onChange={(e) => setRivalId(e.target.value)}
              className="min-h-[44px] px-2.5 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-extrabold"
            >
              {rivalClubs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.city} {r.name} ({r.aiArchetype.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-extrabold text-[#181B2C]">
              Send from {club.name}:
              <select
                aria-label="Outgoing Player"
                value={resolvedOutgoingId}
                onChange={(e) => setOutgoingId(e.target.value)}
                className="w-full min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
              >
                {club.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position} — {p.name} (OVR {computePlayerOverall(p)}, Age {p.age}, $
                    {p.contract.salaryPerSeason.toLocaleString()})
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-xs font-extrabold text-[#181B2C]">
              Receive from {selectedRival.name}:
              <select
                aria-label="Incoming Player"
                value={resolvedIncomingId}
                onChange={(e) => setIncomingId(e.target.value)}
                className="w-full min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
              >
                {selectedRival.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position} — {p.name} (OVR {computePlayerOverall(p)}, Age {p.age}, $
                    {p.contract.salaryPerSeason.toLocaleString()})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-[#4A5068]">Cash Sweetener:</span>
              {[0, 500, 1500, 3000].map((amt) => (
                <ComicButton
                  key={amt}
                  size="sm"
                  variant={cashSweetener === amt ? 'gold' : 'cream'}
                  onClick={() => setCashSweetener(amt)}
                >
                  ${amt.toLocaleString()}
                </ComicButton>
              ))}
            </div>

            {tradeEval ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg border border-[#181B2C] text-xs font-extrabold ${
                    tradeEval.accepted ? 'bg-[#D8F3DC] text-[#1B4332]' : 'bg-[#FFE5E5] text-[#9D0208]'
                  }`}
                >
                  Fairness {Math.round(tradeEval.fairnessRatio * 100)}% —{' '}
                  {tradeEval.accepted ? 'AI Accepts' : 'Needs More Value'}
                </span>
                <ComicButton
                  size="sm"
                  variant="turf"
                  disabled={!tradeEval.accepted}
                  onClick={() => {
                    const res = executeHumanTradeWithRival(selectedRival.id, {
                      outgoingPlayerIds: [resolvedOutgoingId],
                      incomingPlayerIds: [resolvedIncomingId],
                      cashSweetener,
                    });
                    onNotice(res.reason);
                    soundEngine.play(res.executed ? 'cash_chime' : 'ui_pop');
                  }}
                >
                  Execute Trade
                </ComicButton>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Winter Ball & 3D Stadium Wall Retired Jersey Numbers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2.5">
          <div className="font-display text-sm text-[#181B2C]">
            🌴 Winter Ball Prospect Tour (Age ≤ {MAX_WINTER_BALL_AGE})
          </div>
          {eligibleProspects.length > 0 ? (
            <div className="space-y-2">
              <select
                aria-label="Winter Ball Prospect"
                value={
                  eligibleProspects.some((p) => p.id === winterPlayerId)
                    ? winterPlayerId
                    : eligibleProspects[0].id
                }
                onChange={(e) => setWinterPlayerId(e.target.value)}
                className="w-full min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
              >
                {eligibleProspects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position} — {p.name} (Age {p.age}, SP {p.skillPoints})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                {WINTER_LEAGUE_DESTINATIONS.map((dest) => (
                  <ComicButton
                    key={dest.id}
                    size="sm"
                    variant={winterDestId === dest.id ? 'gold' : 'cream'}
                    onClick={() => setWinterDestId(dest.id)}
                  >
                    {dest.countryLabel} (${dest.stipendPerPlayer})
                  </ComicButton>
                ))}
              </div>
              <ComicButton
                size="sm"
                variant="sky"
                onClick={() => {
                  const targetId = eligibleProspects.some((p) => p.id === winterPlayerId)
                    ? winterPlayerId
                    : eligibleProspects[0].id;
                  const report = runHumanWinterBall([targetId], winterDestId);
                  onNotice(
                    report.sent
                      ? report.graduates.map((g) => g.summary).join(' ')
                      : (report.reason ?? 'Could not send to Winter Ball.'),
                  );
                  soundEngine.play(report.sent ? 'level_up' : 'ui_pop');
                }}
              >
                Send to Winter Ball
              </ComicButton>
            </div>
          ) : (
            <p className="text-xs font-bold text-[#4A5068]">
              No prospects age {MAX_WINTER_BALL_AGE} or younger currently on your roster.
            </p>
          )}
        </div>

        <div className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] space-y-2.5">
          <div className="font-display text-sm text-[#181B2C]">
            🏛️ Outfield Wall Retired Numbers ({club.stadium.retiredNumbers.length})
          </div>
          <p className="text-xs font-bold text-[#4A5068]">
            Honor a franchise icon by mounting their jersey plaque visibly on your 3D stadium wall (+6 Hype, +120 Fans)!
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Legend to Retire Jersey"
              value={club.roster.some((p) => p.id === retirePlayerId) ? retirePlayerId : (club.roster[0]?.id ?? '')}
              onChange={(e) => setRetirePlayerId(e.target.value)}
              className="flex-1 min-h-[44px] px-2 rounded-xl border-2 border-[#181B2C] bg-white text-xs font-bold"
            >
              {club.roster.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} {p.name} ({p.position})
                </option>
              ))}
            </select>
            <ComicButton
              size="sm"
              variant="gold"
              onClick={() => {
                const targetId = club.roster.some((p) => p.id === retirePlayerId)
                  ? retirePlayerId
                  : (club.roster[0]?.id ?? '');
                const res = retireHumanPlayerJersey(targetId);
                onNotice(
                  res.retired
                    ? `Retired Jersey #${res.jerseyNumber} (${res.playerName}) onto your 3D Outfield Wall!`
                    : (res.reason ?? 'Already retired.'),
                );
                soundEngine.play(res.retired ? 'trophy_fanfare' : 'ui_pop');
              }}
            >
              Retire Jersey to 3D Wall
            </ComicButton>
          </div>
          {club.stadium.retiredNumbers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {club.stadium.retiredNumbers.map((entry) => (
                <span
                  key={entry.jerseyNumber}
                  className="px-2 py-1 rounded-lg bg-[#181B2C] text-[#FFD166] text-[11px] font-display"
                >
                  #{entry.jerseyNumber} {entry.playerName}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* 6-Slot Prospect Farm Academy & Rookie Debut Call-Ups */}
      <div
        data-testid="prospect-academy-panel"
        className="p-3 rounded-xl border-2 border-[#181B2C] bg-[#FFFDF7] space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-sm text-[#181B2C]">
              🎓 Prospect Farm Academy ({club.academyProspects.length}/{MAX_ACADEMY_ROSTER_SIZE} Slots)
            </div>
            <div className="text-xs font-bold text-[#4A5068]">
              Stash teenage prospects outside the 20-man cap, train them at camp, and trigger a 🔥 Rookie Debut!
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ComicButton
              size="sm"
              variant="gold"
              onClick={() => {
                const res = scoutAndStashHumanAcademyProspect();
                onNotice(
                  res.stashed
                    ? `Signed youth prospect ${res.prospectName} to the Farm Academy!`
                    : (res.reason ?? 'Could not sign prospect.'),
                );
                soundEngine.play(res.stashed ? 'cash_chime' : 'ui_pop');
              }}
            >
              Scout Youth Prospect ($900)
            </ComicButton>
            <ComicButton
              size="sm"
              variant="sky"
              onClick={() => {
                const res = runHumanAcademyTrainingCamp();
                onNotice(res.summary);
                soundEngine.play(res.developedCount > 0 ? 'level_up' : 'ui_pop');
              }}
            >
              Run Academy Camp
            </ComicButton>
          </div>
        </div>

        {club.academyProspects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {club.academyProspects.map((prospect) => (
              <div
                key={prospect.id}
                className="p-2.5 rounded-xl border-2 border-[#181B2C] bg-[#FBF4E4] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="font-display text-xs text-[#181B2C]">
                    {prospect.position} — {prospect.name}
                  </div>
                  <div className="text-[11px] font-bold text-[#4A5068]">
                    Age {prospect.age} • OVR {computePlayerOverall(prospect)} • XP {prospect.xp}
                  </div>
                </div>
                <ComicButton
                  size="sm"
                  variant="turf"
                  onClick={() => {
                    const res = callUpHumanAcademyProspect(prospect.id);
                    onNotice(
                      res.calledUp
                        ? (res.debutBoostBanner ?? `Called up ${prospect.name}!`)
                        : (res.reason ?? 'Cannot call up prospect.'),
                    );
                    soundEngine.play(res.calledUp ? 'trophy_fanfare' : 'ui_pop');
                  }}
                >
                  Call Up Debut
                </ComicButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-bold text-[#4A5068]">
            Your Farm Academy is empty — scout a young prospect to develop future franchise stars!
          </p>
        )}
      </div>
    </div>
  );
}
