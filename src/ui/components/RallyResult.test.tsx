import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createGameSession } from '../../engine/simulation/baseballEngine';
import { getCurrentBatter, getCurrentPitcher, getFieldingSide } from '../../engine/simulation/gameState';
import type { PlayEvent } from '../../engine/models/playEvent';
import { useGameStore } from '../../store/gameStore';
import { RallyResult } from './RallyResult';

it('gives a defensive out to the recorded fielder or strikeout pitcher and names the retired hitter', () => {
  const store = useGameStore.getState();
  store.startNewCareer({ seed: 2089, city:'Sandlot', clubName:'Comets', monogram:'SC', mascot:'Otter', managerName:'Skip',
    primaryColor:'#e00', secondaryColor:'#234', accentColor:'#fd0' });
  const club = store.getHumanClub()!;
  const away = useGameStore.getState().leagues.rookie.find(c => c.id !== club.id)!;
  const before = createGameSession(away, club, 2090, 'regular', 5);
  const fielding = getFieldingSide(before);
  const shortstop = fielding.playersById[fielding.lineup.find(s => s.defensivePosition === 'SS')!.playerId];
  const batter = getCurrentBatter(before);
  const pitcher = getCurrentPitcher(before);
  const event: PlayEvent = {seq:1,type:'ball_in_play',inning:1,half:'TOP',balls:0,strikes:0,outsBefore:0,outsAfter:1,
    awayScore:0,homeScore:0,basesAfter:[null,null,null],batterId:batter.id,pitcherId:pitcher.id,
    outcome:'ground_out',isClutchMoment:false,commentary:'',fieldingHighlight:{fielderId:shortstop.id,fielderPos:'SS',anim:'field_run'}};
  const props = { before, gameOver:false, nextLabel:'Next batter', onReplay:()=>{}, onContinue:()=>{} };
  const view = render(<RallyResult {...props} event={event} />);
  expect(screen.getByRole('heading')).toHaveTextContent(shortstop.name);
  expect(screen.getByText(new RegExp(batter.name.split(' ')[0] + ' is out at first'))).toBeVisible();
  view.rerender(<RallyResult {...props} event={{...event, outcome:'strikeout',fieldingHighlight:undefined}} />);
  expect(screen.getByRole('heading')).toHaveTextContent(pitcher.name);
});

it('lets the selected mascot cover its eyes and peek on the official call', async () => {
  const { ClubMascotBuddy } = await import('./ClubMascotBuddy');
  const props = {mascot:'Splash Otter',primaryColor:'#def',secondaryColor:'#123',accentColor:'#ffd'};
  const view = render(<ClubMascotBuddy {...props} mood="watching" />);
  expect(screen.getByRole('img', {name:'Splash Otter covers its eyes'})).toBeVisible();
  view.rerender(<ClubMascotBuddy {...props} mood="peeking" />);
  expect(screen.getByRole('img', {name:'Splash Otter peeks at the call'})).toBeVisible();
});
