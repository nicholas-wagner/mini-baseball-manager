import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
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
