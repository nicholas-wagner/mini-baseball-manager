import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { UniformDesignerPanel } from './UniformDesignerPanel';
import { ClubCreatorScreen } from '../screens/ClubCreatorScreen';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { LeagueScreen } from '../screens/LeagueScreen';
import { RosterLineupScreen } from '../screens/RosterLineupScreen';

describe('TASK-102 off-diamond ergonomics', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('keeps roster binder stars, swap chips, and view tabs thumb-sized without a nowrap squeeze', () => {
    render(<RosterLineupScreen onPlayBall={vi.fn()} />);
    expect(screen.getByTestId('roster-screen').className).toMatch(/overflow-x-clip/);
    expect(screen.getAllByTestId('roster-star-btn')[0].className).toMatch(/min-h-\[44px\]/);
    const swap = screen.getByRole('button', { name: 'Swap slot 1' });
    expect(swap.className).toMatch(/min-h-\[44px\]/);

    fireEvent.click(screen.getByTestId('roster-view-cards-btn'));
    expect(screen.getByTestId('roster-view-cards-btn').className).not.toMatch(/whitespace-nowrap/);
    const star = screen.getAllByTestId('binder-star-btn')[0];
    expect(star.className).toMatch(/min-h-\[44px\]/);
    expect(star.className).toMatch(/min-w-\[44px\]/);
    expect(screen.getByTestId('roster-binder-grid').className).toMatch(/xl:gap-4/);
  });

  it('keeps the jersey preview, presets, and colors together ahead of pattern controls', () => {
    const club = useGameStore.getState().getHumanClub()!;
    render(<UniformDesignerPanel club={club} onNotice={vi.fn()} />);
    const fold = screen.getByTestId('uniform-above-fold');
    expect(within(fold).getByTestId('uniform-hero-strip')).toBeInTheDocument();
    expect(within(fold).getByTestId('uniform-presets-grid')).toBeInTheDocument();
    expect(within(fold).getByLabelText('Primary Color')).toBeInTheDocument();
    const pattern = screen.getByText('Jersey Pattern');
    expect(fold.compareDocumentPosition(pattern) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('uniform-designer-panel').className).toMatch(/xl:grid-cols-\[minmax\(300px,380px\)_minmax\(0,1fr\)\]/);
  });

  it('keeps Clubhouse HQ tabs a 44px phone grid and a 4-wide desktop row', () => {
    render(<ClubHubScreen />);
    const tabs = screen.getByTestId('hub-room-tabs');
    expect(screen.getByTestId('club-hub-screen').className).toMatch(/overflow-x-clip/);
    expect(tabs.className).toMatch(/grid-cols-2/);
    expect(tabs.className).toMatch(/xl:grid-cols-4/);
    expect(within(tabs).getAllByRole('button')[0].className).toMatch(/whitespace-normal/);
    expect(within(tabs).getAllByRole('button')[0].className).toMatch(/min-h-\[44px\]/);
  });

  it('gives league standings and leader rows a 44px target inside a clipped page', () => {
    render(<LeagueScreen />);
    expect(screen.getByTestId('league-screen').className).toMatch(/overflow-x-clip/);
    expect(screen.getAllByTestId('standings-club-btn')[0].className).toMatch(/min-h-\[44px\]/);
    expect(screen.getAllByTestId('league-leader-card-btn')[0].className).toMatch(/min-h-\[44px\]/);
    expect(screen.getByTestId('league-standings-scroll').className).toMatch(/max-w-full/);
  });

  it('opens the club creator on a wide desktop frame with 44px starter picks', () => {
    render(<ClubCreatorScreen onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change club' }));
    expect(screen.getByTestId('club-creator-screen').className).toMatch(/max-w-6xl/);
    expect(screen.getByTestId('club-creator-screen').className).toMatch(/overflow-x-clip/);
    expect(screen.getByTestId('creator-hero').className).toMatch(/xl:grid-cols-\[minmax\(0,1fr\)_360px\]/);
    const preset = within(screen.getByTestId('quick-club-presets')).getAllByRole('button')[0];
    expect(preset.className).toMatch(/min-h-\[46px\]/);
  });
});
