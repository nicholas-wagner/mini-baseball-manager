import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createClutchMomentSession } from '../../engine/gm/gameDayMoments';
import { stepAtBat } from '../../engine/simulation/baseballEngine';
import { getCurrentBatter } from '../../engine/simulation/gameState';
import { useGameStore } from '../../store/gameStore';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { PostGameSummaryModal } from './PostGameSummaryModal';

function start() {
  useGameStore.getState().startNewCareer({ city:'Sandlot', clubName:'Comets', mascot:'Rocket Dog', monogram:'SC',
    primaryColor:'#E63946', secondaryColor:'#1D3557', accentColor:'#FFC300', managerName:'Skip', seed:2089, startingPreset:'balanced' });
  return useGameStore.getState();
}

function buildTwoOnDownTwoMoment() {
  const store = start();
  const club = store.getHumanClub()!;
  const rival = store.leagues[club.leagueTier].find((c) => c.id !== club.id)!;
  const base = createClutchMomentSession({
    awayClub: rival,
    homeClub: club,
    seed: 2090,
    regulationInnings: 5,
    preferHumanBattingFirst: true,
    chargeOpeningPower: true,
  });
  const r1 = base.session.home.lineup[7].playerId;
  const r2 = base.session.home.lineup[8].playerId;
  const session = {
    ...base.session,
    inning: 4,
    half: 'BOT' as const,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [r1, r2, null] as [string | null, string | null, string | null],
    away: { ...base.session.away, score: 3 },
    home: { ...base.session.home, score: 1 },
  };
  return { ...base, session };
}

it('marks the tying runner on first when two aboard could erase a two-run deficit', () => {
  const moment = buildTwoOnDownTwoMoment();
  render(<GameDayScreen openingRequest={moment} />);
  expect(screen.getByRole('img',{name:/tying run.*on first/i})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'More controls'}));
  const tactics = screen.getByRole('button',{name:'Tactics'});
  expect(tactics).toHaveAttribute('aria-expanded','false');
  fireEvent.click(tactics);
  expect(tactics).toHaveAttribute('aria-expanded','true');
  expect(screen.getByTestId('fast-sim-toggle')).toBeVisible();
});

it('puts each binder name ahead of its portrait and keeps secondary roster tools together', () => {
  start();
  render(<RosterLineupScreen onPlayBall={vi.fn()} />);
  expect(screen.getByText('Club tools').closest('details')).toContainElement(screen.getByTestId('roster-auto-optimize-btn'));
  fireEvent.click(screen.getByTestId('roster-view-cards-btn'));
  const card = within(screen.getAllByTestId('binder-card-open-btn')[0]);
  const portrait = card.getByRole('img', {name:/baseball card/});
  const name = card.getByText(portrait.getAttribute('alt')!.replace(' baseball card',''));
  expect(name.compareDocumentPosition(portrait) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('leads a loss with a collectible from our club and retains the visiting MVP', () => {
  const store = start();
  const club = store.getHumanClub()!;
  const rival = store.leagues.rookie.find(c => c.id !== club.id)!;
  const summary = store.playInstantExhibition(rival.id, 777)!;
  const player = club.roster[0];
  const moment = {id:'opener/5',playerId:player.id,playerName:player.name,opponent:rival.name,caption:'Sacrifice bunt',inning:4,half:'BOT' as const,situation:'Behind 1–3'};
  const mvp = {...summary.mvp,clubId:rival.id,playerId:rival.roster[0].id,playerName:rival.roster[0].name};
  render(<PostGameSummaryModal summary={{...summary,won:false,mvp,moments:[moment]}} opponentClub={rival} humanClub={club} managerLevel={1} onClose={vi.fn()} />);
  const print = screen.getByRole('region',{name:'Scorebook prints'});
  expect(print.compareDocumentPosition(screen.getByText('Rival MVP Spotlight')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByRole('heading')[1]).toHaveTextContent(player.name);
});

it('identifies the runner at the destination when the batter sacrifices both runners over', () => {
  const base = buildTwoOnDownTwoMoment();
  let sacSeed = base.session.rngSeed;
  for (let s = 1; s < 500; s += 1) {
    const probe = stepAtBat({ ...base.session, rngSeed: s }, 'bunt');
    if (
      probe.events.some((e) => e.outcome === 'bunt_out') &&
      probe.nextSession.bases[0] === null &&
      probe.nextSession.bases[1] !== null &&
      probe.nextSession.bases[2] !== null
    ) {
      sacSeed = s;
      break;
    }
  }
  const priorEvent = {
    seq: base.session.eventSeq,
    inning: 5,
    half: 'BOT' as const,
    type: 'ball_in_play' as const,
    outcome: 'single' as const,
    outsBefore: 0,
    outsAfter: 0,
    balls: 0,
    strikes: 0,
    awayScore: 3,
    homeScore: 1,
    basesAfter: base.session.bases,
    isClutchMoment: true,
    commentary: 'Lead-off rally puts two aboard.',
    soundCue: 'bat_crack' as const,
  };
  const moment = {
    ...base,
    events: [priorEvent],
    gameEvents: [priorEvent],
    session: { ...base.session, inning: 5, rngSeed: sacSeed },
  };
  const batter = getCurrentBatter(moment.session);
  const nextIdx = (moment.session.home.lineupIndex + 1) % moment.session.home.lineup.length;
  const nextBatter = moment.session.home.playersById[moment.session.home.lineup[nextIdx].playerId];

  vi.useFakeTimers();
  try {
    render(<GameDayScreen openingRequest={moment} />);
    fireEvent.click(screen.getByRole('button',{name:'🏏 Bunt'}));
    fireEvent.click(screen.getByRole('button',{name:/^Lay down bunt/}));
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByRole('region',{name:'Play result'})).toHaveTextContent('Runners to second and third');
    expect(screen.getByRole('img',{name:/safe.*on third/i})).toBeVisible();
    expect(screen.getByText(`Up next · ${nextBatter.name}`)).toBeVisible();
    expect(screen.getByRole('group',{name:'Matchup cards'})).toHaveTextContent('Last at bat');
    fireEvent.click(screen.getByRole('button',{name:'Next batter'}));
    fireEvent.click(screen.getByRole('button',{name:'More controls'}));
    fireEvent.click(screen.getByRole('button',{name:'Tactics'}));
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button',{name:/sim to end/i}));
    const summary = useGameStore.getState().lastPostGameSummary!;
    expect(summary.result.events.some(event => event.outcome === 'bunt_out')).toBe(true);
    expect(summary.moments).toContainEqual(expect.objectContaining({playerName: batter.name, caption:'Sacrifice bunt'}));
  } finally {
    vi.useRealTimers();
  }
});
