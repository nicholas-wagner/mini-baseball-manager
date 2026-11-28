import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createClutchMomentSession } from '../../engine/gm/gameDayMoments';
import { stepAtBat } from '../../engine/simulation/baseballEngine';
import { getCurrentBatter } from '../../engine/simulation/gameState';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { GameDayScreen } from '../screens/GameDayScreen';

it('hands the pictured Opening Day player to the manager and lets them inspect either live card', () => {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFC300',
    managerName: 'Coach Skip',
    seed: 1994,
  });
  render(<GameDayScreen />);
  const opening = within(screen.getByRole('region', { name: 'Opening Day feature' }));
  const name = opening.getByRole('heading').textContent!;
  const art = opening.getByRole('img') as HTMLImageElement;
  expect(art.src).toMatch(/\.(?:png|webp)/);
  fireEvent.click(opening.getByRole('button', { name: /^(Bat|Pitch) with / }));
  expect(screen.getByTestId('player-entrance')).toHaveTextContent(name);
  const scoreboard = within(screen.getByRole('region', {name:'Live Baseball Scoreboard'}));
  const lineScore = scoreboard.getByRole('button', {name:/line score/i});
  expect(lineScore).toHaveTextContent('Comets');
  expect(scoreboard.queryByTestId('scoreboard-home-rhe')).toBeNull();
  fireEvent.click(lineScore);
  expect(scoreboard.getByTestId('scoreboard-home-rhe')).toBeVisible();
  fireEvent.click(lineScore);
  const guide = within(screen.getByRole('region', {name:'First at-bat'}));
  expect(guide.getByRole('button',{name:'More controls'})).toBeVisible();
  expect(screen.queryByTestId('fast-sim-toggle')).toBeNull();
  const catcherCall = guide.queryByTestId('guided-catcher-call');
  if (catcherCall) {
    expect(catcherCall).toBeVisible();
    expect(guide.getByRole('button', { name: /Throw · 1-Pitch|Throw Pitch/ })).toBeVisible();
  } else {
    fireEvent.click(guide.getByRole('button',{name:'Power'}));
    expect(guide.getByRole('button',{name:/^Swing/})).toBeVisible();
  }
  fireEvent.click(guide.getByRole('button',{name:'More controls'}));
  expect(screen.getByTestId('fast-sim-toggle')).toBeVisible();
  const duel = within(screen.getByRole('group', { name: 'Matchup cards' }));
  expect(duel.getAllByRole('button')).toHaveLength(2);
  fireEvent.click(duel.getByRole('button', { name: new RegExp(name) }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('replays the same first out and lets the manager hand the rally to the second hitter', () => {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot', clubName: 'Comets', mascot: 'Rocket Dog', monogram: 'SC',
    primaryColor: '#E63946', secondaryColor: '#1D3557', accentColor: '#FFC300',
    managerName: 'Coach Skip', seed: 2089, startingPreset: 'balanced',
  });
  const club = useGameStore.getState().getHumanClub()!;
  const rival = useGameStore.getState().leagues[club.leagueTier].find((c) => c.id !== club.id)!;
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
  const setupSession = {
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
  let groundoutSeed = setupSession.rngSeed;
  for (let s = 1; s < 500; s += 1) {
    const probe = stepAtBat({ ...setupSession, rngSeed: s }, 'power');
    if (
      probe.events.some((e) => e.outcome === 'ground_out') &&
      probe.nextSession.outs === 1 &&
      probe.nextSession.bases[0] === r1 &&
      probe.nextSession.bases[1] === r2
    ) {
      groundoutSeed = s;
      break;
    }
  }
  const moment = { ...base, session: { ...setupSession, rngSeed: groundoutSeed } };
  const batter = getCurrentBatter(moment.session);
  const firstName = batter.name.split(' ')[0];
  const nextIdx = (moment.session.home.lineupIndex + 1) % moment.session.home.lineup.length;
  const nextBatter = moment.session.home.playersById[moment.session.home.lineup[nextIdx].playerId];

  vi.useFakeTimers();
  try {
    render(<GameDayScreen openingRequest={moment} />);
    fireEvent.click(screen.getByRole('button', {name: 'Power'}));
    expect(screen.getByText('More power. Easier to miss.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: /^Swing/}));
    act(() => vi.advanceTimersByTime(30000));
    const result = () => within(screen.getByRole('region', {name: 'Play result'}));
    expect(result().getByRole('heading')).toHaveTextContent(batter.name);
    expect(result().getByText(new RegExp(`${firstName} .*Both runners hold\\.`, 'i'))).toBeVisible();
    fireEvent.click(result().getByRole('button', {name: 'Watch again'}));
    act(() => vi.advanceTimersByTime(30000));
    expect(result().getByRole('heading')).toHaveTextContent(batter.name);
    fireEvent.click(result().getByRole('button', {name: /Next batter/}));
    expect(screen.getByRole('group', {name: 'Matchup cards'})).toHaveTextContent(nextBatter.name);
    expect(screen.getByRole('region', {name: 'First at-bat'})).toHaveTextContent('One out. A single could score a run.');
    expect(screen.getByRole('button', {name: 'Contact'})).toBeVisible();
    expect(screen.queryByRole('region', {name: 'Play result'})).toBeNull();
    // The guide belongs to this half-inning, including the last out.
    for (let pitches = 0; pitches < 50 && !screen.queryByRole('button', {name:'Change sides'}); pitches++) {
      const next = screen.queryByRole('button', {name:'Next batter'});
      if (next) fireEvent.click(next);
      fireEvent.click(screen.getByRole('button', {name:/^Swing/}));
      act(() => vi.advanceTimersByTime(30000));
    }
    const inventory = useFoilPackStore.getState().unopenedPacks;
    fireEvent.click(screen.getByRole('button', {name:'Open foil pack'}));
    const pack = within(screen.getByRole('dialog', {name:'1994 Foil Card Booster Packs'}));
    expect(useFoilPackStore.getState().unopenedPacks).toEqual(inventory);
    fireEvent.click(pack.getByRole('button', {name:/rip open 1994 foil pack/i}));
    fireEvent.click(pack.getByRole('button', {name:'Close Foil Packs'}));
    expect(screen.queryByRole('button', {name:'Open foil pack'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'Change sides'}));
    expect(screen.queryByRole('region', {name:'First at-bat'})).toBeNull();
    expect(screen.getByTestId('arcade-bullpen-toggle')).toBeVisible();
  } finally { vi.useRealTimers(); }
});
