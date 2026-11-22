import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubHubScreen } from '../screens/ClubHubScreen';
import { LeagueScreen } from '../screens/LeagueScreen';

function seedCareer(seed = 9101) {
  useGameStore.getState().startNewCareer({
    city: 'Sandlot',
    clubName: 'Comets',
    mascot: 'Rocket Dog',
    monogram: 'SC',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#FFD166',
    managerName: 'Coach Skip',
    seed,
  });
}

describe('100X Wave 2: Uniform Designer, Prospect Academy, MBM1 Boss Duel & Season Awards/HOF', () => {
  it('customizes club jersey pattern, cap style, crest emblem, and monogram in Uniform Studio', async () => {
    const user = userEvent.setup();
    seedCareer(9101);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /uniform studio/i }));
    expect(screen.getByTestId('uniform-designer-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /vintage pinstripes/i }));
    await user.click(screen.getByRole('button', { name: /throwback pillbox/i }));
    const monogramInput = screen.getByLabelText(/club monogram/i);
    await user.clear(monogramInput);
    await user.type(monogramInput, 'S94');

    await user.click(screen.getByRole('button', { name: /apply custom uniform/i }));
    const club = useGameStore.getState().getHumanClub();
    expect(club?.colors.monogram).toBe('S94');
    expect(club?.colors.jerseyPattern).toBe('vintage_pinstripes');
    expect(club?.colors.capStyle).toBe('throwback_pillbox');
  });

  it('runs the 6-slot Prospect Farm Academy (Scout -> Train Camp -> Rookie Debut Call-Up)', async () => {
    const user = userEvent.setup();
    seedCareer(9102);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /gazette & front office/i }));
    expect(screen.getByTestId('prospect-academy-panel')).toBeInTheDocument();

    const rosterBefore = useGameStore.getState().getHumanClub()!.roster.length;
    await user.click(screen.getByRole('button', { name: /scout youth prospect/i }));
    expect(useGameStore.getState().getHumanClub()!.academyProspects).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /run academy camp/i }));
    expect(screen.getByText(/academy camp boosted/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /call up debut/i }));
    expect(useGameStore.getState().getHumanClub()!.academyProspects).toHaveLength(0);
    expect(useGameStore.getState().getHumanClub()!.roster.length).toBe(rosterBefore + 1);
  });

  it('imports an MBM1 Boss Club Code and plays an instant Friend Boss Exhibition Duel', async () => {
    const user = userEvent.setup();
    seedCareer(9103);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /derby & sharing/i }));
    expect(screen.getByTestId('friend-duel-panel')).toBeInTheDocument();

    // Load built-in 90s Boss Club MBM1 code with 1 click
    await user.click(screen.getByRole('button', { name: /load 1994 cyber sluggers code/i }));
    expect(screen.getByTestId('decoded-challenger-preview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /play boss exhibition duel/i }));
    expect(screen.getByTestId('exhibition-duel-result')).toBeInTheDocument();
  });

  it('displays live Season Awards Race and Club Hall of Fame Ballot in LeagueScreen', () => {
    seedCareer(9104);

    render(<LeagueScreen />);

    expect(screen.getByTestId('awards-and-hof-panel')).toBeInTheDocument();
    expect(screen.getByText(/most valuable player/i)).toBeInTheDocument();
    expect(screen.getByText(/golden arm award/i)).toBeInTheDocument();
    expect(screen.getByText(/club hall of fame ballot/i)).toBeInTheDocument();
  });
});
