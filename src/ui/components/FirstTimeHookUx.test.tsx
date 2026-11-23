import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { GameDayScreen } from '../screens/GameDayScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';

describe('First-Time User Hook (5-Sec Toy Box Creator, Meet Your Squad, Arcade Calls & Hype Bar, Roster Faces)', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useFoilPackStore.getState().resetPacks();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('gives ClubCreatorScreen a 5-second toy box hero with cute Mascot Animal Picker and above-the-fold Play Ball CTA', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);

    expect(screen.getByTestId('club-mascot-buddy')).toBeInTheDocument();
    expect(screen.getByTestId('mascot-animal-picker')).toBeInTheDocument();

    // Pick Otter mascot -> updates mascot input & bouncing buddy immediately!
    fireEvent.click(within(screen.getByTestId('mascot-animal-picker')).getByRole('button', { name: /otter/i }));
    expect(screen.getByRole('textbox', { name: /^mascot$/i })).toHaveValue('Splash Otter');

    // Primary Start Sandlot Dynasty button appears BEFORE the deeper Starting Roster Build cards!
    const startBtn = screen.getByRole('button', { name: /start sandlot dynasty/i });
    const rosterBuildHeading = screen.getByText(/starting roster build/i);
    expect(
      Boolean(startBtn.compareDocumentPosition(rosterBuildHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it('welcomes Opening Day players with Meet Your 3 Stars clickable manga cards, top Foil Pack banner & Story Chapter nudge', () => {
    useFoilPackStore.getState().awardPack('sandlot_foil', 'Opening Day Welcome Gift!');
    const onOpenStory = vi.fn();
    render(<GameDayScreen onOpenStory={onOpenStory} />);

    // Meet Your 3 Stars showcase appears on Opening Day & lets you tap any star to flip their card!
    expect(screen.getByTestId('meet-your-squad-card')).toBeInTheDocument();
    const starBtns = screen.getAllByTestId('squad-star-btn');
    expect(starBtns).toHaveLength(3);
    fireEvent.click(starBtns[0]);
    expect(screen.getByRole('dialog', { name: /player baseball card/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close player card/i }));

    // Gentle Story & Origins comic beat card is surfaced cleanly
    expect(screen.getByTestId('story-chapter-nudge')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-chapter-nudge-btn'));
    expect(onOpenStory).toHaveBeenCalledTimes(1);
  });

  it('gives Simple Arcade Mode interactive Pitching Calls (Heat/Trick/Corner), Batting Calls, First-Pitch Tip & glowing Hype Power Bar', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Friendly first-pitch tip visible before pitch #1
    expect(screen.getByTestId('first-pitch-tip')).toBeInTheDocument();

    // Glowing Hype meter visible directly in Arcade Mode!
    expect(screen.getByTestId('arcade-hype-bar')).toBeInTheDocument();

    // Home team pitches TOP 1 -> interactive 3-button Arcade Pitch Call bar!
    const callBar = screen.getByTestId('arcade-call-bar');
    expect(callBar).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /🔥 heat/i }));
    fireEvent.click(screen.getByRole('button', { name: /🌀 trick/i }));
    fireEvent.click(screen.getByRole('button', { name: /🎯 corner/i }));

    // Throw pitch #1 -> first-pitch tip gently clears!
    fireEvent.click(screen.getByRole('button', { name: /next pitch/i }));
    expect(screen.queryByTestId('first-pitch-tip')).not.toBeInTheDocument();
  });

  it('displays cute manga portrait thumbnails on all 9 batting-order rows in RosterLineupScreen', () => {
    render(<RosterLineupScreen onPlayBall={vi.fn()} />);
    expect(screen.getAllByTestId('roster-lineup-portrait')).toHaveLength(9);
  });
});
