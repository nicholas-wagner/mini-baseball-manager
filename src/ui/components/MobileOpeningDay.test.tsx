import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';
import { PostGameSummaryModal } from './PostGameSummaryModal';

function start() {
  useGameStore.getState().startNewCareer({ city:'Sandlot', clubName:'Comets', mascot:'Rocket Dog', monogram:'SC',
    primaryColor:'#E63946', secondaryColor:'#1D3557', accentColor:'#FFC300', managerName:'Skip', seed:2089, startingPreset:'balanced' });
  return useGameStore.getState();
}

it('marks the tying runner on first when two aboard could erase a two-run deficit', () => {
  start();
  render(<GameDayScreen />);
  fireEvent.click(screen.getByRole('button',{name:'Bat with Marcus'}));
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

it('identifies the runner at the destination when Marcus sacrifices both runners over', () => {
  start();
  vi.useFakeTimers();
  try {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button',{name:'Bat with Marcus'}));
    fireEvent.click(screen.getByRole('button',{name:'🏏 Bunt'}));
    fireEvent.click(screen.getByRole('button',{name:/^Lay down bunt/}));
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByRole('region',{name:'Play result'})).toHaveTextContent('Runners to second and third');
    expect(screen.getByRole('img',{name:/safe.*on third/i})).toBeVisible();
    expect(screen.getByText('Up next · Ethan Torres')).toBeVisible();
    expect(screen.getByRole('group',{name:'Matchup cards'})).toHaveTextContent('Last at bat');
    fireEvent.click(screen.getByRole('button',{name:'Next batter'}));
    fireEvent.click(screen.getByRole('button',{name:'More controls'}));
    fireEvent.click(screen.getByRole('button',{name:'Tactics'}));
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button',{name:/sim to end/i}));
    const summary = useGameStore.getState().lastPostGameSummary!;
    expect(summary.result.events.some(event => event.outcome === 'bunt_out')).toBe(true);
    expect(summary.moments?.[0]).toMatchObject({playerName:'Marcus Baker', caption:'Sacrifice bunt'});
  } finally {
    vi.useRealTimers();
  }
});
