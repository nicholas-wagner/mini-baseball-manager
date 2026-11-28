import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createClutchMomentSession } from '../../engine/gm/gameDayMoments';
import { getHumanSeasonSchedule } from '../../engine/league/seasonEngine';
import { App } from '../../App';
import { useGameStore } from '../../store/gameStore';
import { clearAllCareerSlotsStorage } from '../../store/careerSlots';
import { GameDayScreen } from '../screens/GameDayScreen';

function career(seed: number) {
  clearAllCareerSlotsStorage();
  useGameStore.getState().startNewCareer({ city: 'Sandlot', clubName: 'Comets', mascot: 'Rocket Dog', monogram: 'SC',
    primaryColor: '#E63946', secondaryColor: '#1D3557', accentColor: '#FFC300', managerName: 'Skip', startingPreset: 'balanced', seed });
}

function findBattingOpeningSeed(): number {
  for (let seed = 2089; seed < 2160; seed += 1) {
    career(seed);
    const s = useGameStore.getState();
    const club = s.getHumanClub()!;
    const sched = getHumanSeasonSchedule(s.leagues[club.leagueTier], club.id, s.currentSeriesIndex);
    const rival = sched.nextSeries?.opponent ?? s.leagues[club.leagueTier].find((c) => c.id !== club.id)!;
    const isHome = sched.nextSeries?.isHome ?? true;
    const moment = createClutchMomentSession({
      awayClub: isHome ? rival : club,
      homeClub: isHome ? club : rival,
      seed: seed + 1,
      regulationInnings: 5,
      chargeOpeningPower: true,
    });
    const humanBatting = (moment.session.half === 'BOT') === moment.session.home.isHuman;
    if (humanBatting && moment.session.outs < 2) return seed;
  }
  return 2089;
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
  career(findBattingOpeningSeed());
  render(<App />);
  fireEvent.click(screen.getByRole('button', {name: /^Bat with /}));
  vi.useFakeTimers();
  try {
    fireEvent.click(screen.getByRole('button',{name:'Power'}));
    for (let i = 0; i < 12 && !screen.queryByRole('button', { name: 'Next batter' }); i += 1) {
      fireEvent.click(screen.getByRole('button',{name:/^Swing/}));
      act(() => vi.advanceTimersByTime(30000));
    }
    fireEvent.click(screen.getByRole('button',{name:'Next batter'}));
  } finally { vi.useRealTimers(); }
  const matchupCardsBefore = screen.getByRole('group',{name:'Matchup cards'}).textContent;
  const scoreboard = screen.getByRole('button',{name:/Toggle line score/}).textContent;
  fireEvent.click(screen.getByRole('button',{name:'Dugout'}));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Roster'}));
  await screen.findByTestId('roster-view-cards-btn', {}, {timeout:8000});
  fireEvent.click(screen.getAllByRole('button',{name:'Play Ball'})[0]);
  expect(screen.getByRole('group',{name:'Matchup cards'}).textContent).toBe(matchupCardsBefore);
  expect(screen.getByRole('button',{name:'Power'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('button',{name:/Toggle line score/}).textContent).toBe(scoreboard);
});
