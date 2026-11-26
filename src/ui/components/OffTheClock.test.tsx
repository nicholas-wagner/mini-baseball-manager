import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { PlayerCardModal } from './PlayerCardModal';
import { TrophyCaseModal } from './TrophyCaseModal';
import { HobbyAlbum, HobbyConversation } from './OffTheClock';

function foundClub() {
  const state = useGameStore.getState();
  state.startNewCareer({city:'Harbor',clubName:'Otters', mascot:'Otter',monogram:'HO',primaryColor:'#156',
    secondaryColor:'#357',accentColor:'#ffa',managerName:'Skip',seed:1994});
  return state.getHumanClub()!;
}
describe('Off the Clock cards', () => {
  it('preserves the signed note when a saved quote differs from the illustrated story', () => {
    const memory = { playerId: 'showcase-manny', playerName: 'Manny Guerrero', hobbyId: 'camping',
      title: 'Camping', quote: 'The tent leaked, the cocoa did not, and we all remember that weekend as a success.' };
    render(<HobbyAlbum club={{ ...foundClub(), hobbyMemories: [memory] }} />);
    fireEvent.click(screen.getByText(/Manny Guerrero/, { selector: 'summary' }));
    const postcard = screen.getByRole('figure', { name: 'Manny Guerrero hobby postcard' });
    expect(within(postcard).getByText(memory.quote, { exact: false })).toBeVisible();
  });

  it('reveals a note without an illustration and keeps it in the album after the player leaves', () => {
    const club = foundClub();
    const player = club.roster.find(p => p.id.startsWith('mbm-') && p.id !== 'mbm-0030')!;
    const view = render(<PlayerCardModal open entry={{club,player}} onClose={() => {}} />);
    expect(screen.getByText(/after your first game/i)).toBeVisible();
    const fresh = {...club, wins:1};
    act(() => useGameStore.setState({leagues:{...useGameStore.getState().leagues, rookie:[fresh]}}));
    fireEvent.click(screen.getByRole('button', {name:/ask about the clue/i}));
    const memory = useGameStore.getState().getHumanClub()!.hobbyMemories![0];
    expect(screen.getByText(memory.quote, {exact:false})).toBeVisible();
    expect(screen.getByRole('figure', {name:player.name + ' hobby postcard'})).toBeVisible();
    view.unmount();
    const unlocked = useGameStore.getState().getHumanClub()!;
    useGameStore.setState({leagues:{...useGameStore.getState().leagues, rookie:[{...unlocked,roster:unlocked.roster.filter(p=>p.id!==player.id)}]}});
    render(<TrophyCaseModal open onClose={()=>{}}/>);
    fireEvent.click(screen.getByText(player.name,{exact:false,selector:'summary'}));
    expect(screen.getByText(memory.quote,{exact:false})).toBeVisible();
  });

  it('lets a manager choose an illustrated player from the recap and read the note if the image fails', () => {
    const club = foundClub();
    const paige = {...club.roster[1], id:'mbm-0030', name:'Paige Clark'};
    useGameStore.setState({leagues:{...useGameStore.getState().leagues, rookie:[{...club,wins:1,roster:[club.roster[0],paige]}]}});
    render(<HobbyConversation />);
    fireEvent.click(screen.getByText('Talk to a teammate'));
    fireEvent.change(screen.getByRole('combobox',{name:'Choose a teammate'}),{target:{value:paige.id}});
    fireEvent.click(screen.getByRole('button',{name:/ask about the clue/i}));
    const print = screen.getByRole('img',{name:/Paige Clark.*crocheting/i});
    fireEvent.error(print);
    expect(screen.queryByRole('img',{name:/Paige Clark.*crocheting/i})).toBeNull();
    const postcard = screen.getByRole('figure',{name:'Paige Clark hobby postcard'});
    const stamp = within(postcard).getByRole('img', {name:'Paige Clark baseball portrait'});
    fireEvent.error(stamp);
    expect(within(postcard).getByText('PC')).toBeVisible();
    expect(within(screen.getByRole('region',{name:'Off the Clock'})).getByText(/cantaloupe/i)).toBeVisible();
  });
});
