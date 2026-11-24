import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { createGameSession, stepHalfInning } from '../../engine/simulation/baseballEngine';
import { getHumanSeasonSchedule } from '../../engine/league/seasonEngine';
import { GameDayScreen } from '../screens/GameDayScreen';
import type { LiveGameCanvas } from './LiveGameCanvas';
import type { ComponentProps } from 'react';

vi.mock('./LiveGameCanvas', () => ({
  LiveGameCanvas: ({ choreo, overlay, session }: ComponentProps<typeof LiveGameCanvas>) =>
    <div data-testid="field" data-play={choreo?.play?.kind ?? 'ready'} data-session={session.stepCounter} data-half={session.half}>{overlay}</div>,
}));

beforeEach(() => {
  useGameStore.getState().startNewCareer({
    city:'Sandlot', clubName:'Comets', mascot:'Rocket', monogram:'SC', seed:1994,
    primaryColor:'#E63946', secondaryColor:'#1D3557', accentColor:'#FFC300', managerName:'Skip',
  });
});

it('finishes a bullpen visit in the live matchup and delivers a pitch on request', () => {
  vi.useFakeTimers();
  try {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    fireEvent.click(screen.getByTestId('arcade-bullpen-toggle'));
    const choice = screen.getAllByTestId('arcade-bullpen-bring-in')[0];
    const name = choice.textContent!.match(/Bring In (.+?) \(/)![1];
    fireEvent.click(choice);
    const field = screen.getByTestId('field');
    expect(field).toHaveAttribute('data-play','bullpen');
    expect(field).toHaveTextContent(name);
    act(() => vi.advanceTimersByTime(6000));
    expect(field).toHaveAttribute('data-play','ready');
    expect(field).toHaveAttribute('data-session','0');
    expect(screen.queryByRole('button',{name:/Watch again/})).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Throw next pitch' }));
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByTestId('play-by-play-ticker').textContent).toMatch(/mph/i);
    expect(screen.queryByRole('button', { name: 'Throw next pitch' })).toBeNull();
  } finally { vi.useRealTimers(); }
});

it('carries an automatic change into the bottom of the third and resumes Auto Play', () => {
  const store = useGameStore.getState();
  const home = store.getHumanClub()!;
  const series = getHumanSeasonSchedule(store.leagues[home.leagueTier], home.id, 0).nextSeries!;
  const session = createGameSession(series.opponent, home, 1994);
  session.inning = 3;
  session.outs = 2;
  session.home.score = 3;
  session.away.score = 2;
  session.away.pitcherFatigue = 90;
  const expected = stepHalfInning(session);
  const newPitcher = expected.nextSession.away.playersById[expected.nextSession.away.activePitcherId];
  expect(expected.events.at(-1)?.type).toBe('pitching_change');
  vi.useFakeTimers();
  try {
    render(<GameDayScreen openingRequest={{session, events: [], gameEvents: [], recapHeadline: ''}} />);
    fireEvent.click(screen.getByRole('button', {name:'More controls'}));
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button', {name:'Sim Half-Inn'}));
    act(() => vi.advanceTimersByTime(30000));
    const field = screen.getByTestId('field');
    expect(field).toHaveAttribute('data-play','bullpen');
    expect(field).toHaveAttribute('data-half','BOT');
    expect(field).toHaveTextContent(newPitcher.name);
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button', {name:'Auto Play 3D'}));
    const ticker = screen.getByTestId('play-by-play-ticker');
    const before = ticker.textContent;
    act(() => vi.advanceTimersByTime(6000));
    expect(ticker.textContent).not.toEqual(before);
    expect(field).not.toHaveAttribute('data-play','bullpen');
    expect(field).toHaveAttribute('data-session',String(expected.nextSession.stepCounter));
  } finally { vi.useRealTimers(); }
});

it('leaves the opposing pitcher on the field when a manager changes their bullpen while batting', () => {
  vi.useFakeTimers();
  try {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', {name:/start live 3d game/i}));
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button', {name:'Sim Half-Inn'}));
    act(() => vi.advanceTimersByTime(30000));
    fireEvent.click(screen.getByTestId('control-mode-toggle'));
    const bringIn = screen.getAllByRole('button', {name:/^Bring In /})[0];
    const name = bringIn.textContent!.replace('Bring In ', '');
    fireEvent.click(bringIn);
    const field = screen.getByTestId('field');
    expect(field).toHaveAttribute('data-play','ready');
    expect(field).toHaveTextContent(name + ' will pitch when your club takes the field.');
  } finally { vi.useRealTimers(); }
});
