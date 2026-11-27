import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { App } from '../../App';
import { useGameStore } from '../../store/gameStore';
import { clearAllCareerSlotsStorage } from '../../store/careerSlots';
import { GameDayScreen } from '../screens/GameDayScreen';

function career(seed: number) {
  clearAllCareerSlotsStorage();
  useGameStore.getState().startNewCareer({ city: 'Sandlot', clubName: 'Comets', mascot: 'Rocket Dog', monogram: 'SC',
    primaryColor: '#E63946', secondaryColor: '#1D3557', accentColor: '#FFC300', managerName: 'Skip', startingPreset: 'balanced', seed });
}

it('offers one plain-language scouting clue and reveals the actual pitching matchup on demand', () => {
  career(1994);
  render(<GameDayScreen />);
  const startPitchBtn = screen.getByRole('button', { name: /^Pitch with / });
  fireEvent.click(startPitchBtn);
  const matchup = screen.getByRole('button', {name:'Matchup'});
  expect(matchup).toHaveAttribute('aria-expanded','false');
  expect(screen.getByText(/(is tiring\.|runs fast\.|throws (left|right)-handed\.)/i)).toBeVisible();
  fireEvent.click(matchup);
  expect(screen.getByRole('region',{name:'Matchup scouting'})).toHaveTextContent(/Throws (right|left)/i);
  fireEvent.click(matchup);
  expect(screen.queryByRole('region',{name:'Matchup scouting'})).toBeNull();
});

it('returns from the dugout to the same batter, out, runners and swing selection', async () => {
  career(2089);
  render(<App />);
  fireEvent.click(screen.getByRole('button', {name:'Bat with Marcus'}));
  vi.useFakeTimers();
  try {
    fireEvent.click(screen.getByRole('button',{name:'Power'}));
    fireEvent.click(screen.getByRole('button',{name:/^Swing/}));
    act(() => vi.advanceTimersByTime(30000));
    fireEvent.click(screen.getByRole('button',{name:'Next batter'}));
  } finally { vi.useRealTimers(); }
  const scoreboard = screen.getByRole('button',{name:/Toggle line score/}).textContent;
  fireEvent.click(screen.getByRole('button',{name:'Dugout'}));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Roster'}));
  await screen.findByTestId('roster-view-cards-btn', {}, {timeout:8000});
  fireEvent.click(screen.getAllByRole('button',{name:'Play Ball'})[0]);
  expect(screen.getByRole('group',{name:'Matchup cards'})).toHaveTextContent('Ethan Torres');
  expect(screen.getByRole('button',{name:'Power'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('button',{name:/Toggle line score/}).textContent).toBe(scoreboard);
});
