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
  const duel = within(screen.getByRole('group', { name: 'Matchup cards' }));
  expect(duel.getAllByRole('button')).toHaveLength(2);
  fireEvent.click(duel.getByRole('button', { name: new RegExp(name) }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
