import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
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
  expect(art.src).toMatch(/\.png/);
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
  const corner = guide.queryByRole('button',{name:'Corner'});
  if (corner) {
    fireEvent.click(corner);
    expect(guide.getByRole('button',{name:'Pitch to the corner'})).toBeVisible();
  } else {
    fireEvent.click(guide.getByRole('button',{name:'Swing big'}));
    expect(guide.getByRole('button',{name:'Swing for power'})).toBeVisible();
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
  vi.useFakeTimers();
  try {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', {name: /Bat with Marcus/}));
    fireEvent.click(screen.getByRole('button', {name: 'Swing big'}));
    expect(screen.getByText('More power. Easier to miss.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Swing for power'}));
    act(() => vi.advanceTimersByTime(30000));
    const result = () => within(screen.getByRole('region', {name: 'Play result'}));
    expect(result().getByRole('heading')).toHaveTextContent('Marcus Baker');
    expect(result().getByText(/runners stay on first and second/i)).toBeVisible();
    fireEvent.click(result().getByRole('button', {name: 'Watch again'}));
    act(() => vi.advanceTimersByTime(30000));
    expect(result().getByRole('heading')).toHaveTextContent('Marcus Baker');
    fireEvent.click(result().getByRole('button', {name: /Next batter/}));
    expect(screen.getByRole('group', {name: 'Matchup cards'})).toHaveTextContent('Ethan Torres');
    expect(screen.getByRole('region', {name: 'First at-bat'})).toHaveTextContent('One out. A single could score a run.');
    expect(screen.getByRole('button', {name: 'Make contact'})).toBeVisible();
    expect(screen.queryByRole('region', {name: 'Play result'})).toBeNull();
    // The guide belongs to this half-inning, including the last out.
    for (let pitches = 0; pitches < 50 && !screen.queryByRole('button', {name:'Change sides'}); pitches++) {
      const next = screen.queryByRole('button', {name:'Next batter'});
      if (next) fireEvent.click(next);
      fireEvent.click(screen.getByRole('button', {name:'Swing for power'}));
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
