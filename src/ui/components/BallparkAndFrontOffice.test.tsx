import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubHubScreen } from '../screens/ClubHubScreen';

function seedCareer(seed = 8421) {
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

describe('Ballpark Economy, Medical Hiring, Gazette, Trade Machine, Global Cup & Time Capsule UI', () => {
  it('supports interactive Economy pricing, Parody Sponsors, TV Deals, and District Builder Grid', async () => {
    const user = userEvent.setup();
    seedCareer(8421);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /economy & district/i }));
    expect(screen.getByTestId('ballpark-economy-panel')).toBeInTheDocument();
    expect(screen.getByText(/series financial projection/i)).toBeInTheDocument();

    // Sign a Rookie-eligible Parody Sponsor (Turbo Fizz Soda)
    await user.click(screen.getByRole('button', { name: /sign turbo fizz soda/i }));
    expect(screen.getByText(/mounted turbo fizz soda on the outfield wall/i)).toBeInTheDocument();

    // Sign Public Access TV Contract
    await user.click(screen.getByRole('button', { name: /sign channel 54/i }));
    expect(screen.getByText(/signed broadcast deal: channel 54/i)).toBeInTheDocument();

    // Build a Ballpark District building on North-1 tile
    await user.click(screen.getByRole('button', { name: /build loaded nacho cantina/i }));
    expect(screen.getByText(/built loaded nacho cantina/i)).toBeInTheDocument();
  });

  it('allows hiring specialty Team Doctors and Head Athletic Trainers inside Coaches & Staff', async () => {
    const user = userEvent.setup();
    seedCareer(8422);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /staff & front office/i }));
    expect(screen.getByText(/active staff slots: 0 \/ 2/i)).toBeInTheDocument();

    const hireDocButtons = screen.getAllByRole('button', { name: /hire doctor/i });
    await user.click(hireDocButtons[0]);
    expect(screen.getByText(/active staff slots: 1 \/ 2/i)).toBeInTheDocument();

    const hireTrainerButtons = screen.getAllByRole('button', { name: /hire trainer/i });
    await user.click(hireTrainerButtons[0]);
    expect(screen.getByText(/active staff slots: 2 \/ 2/i)).toBeInTheDocument();
  });

  it('powers The Sandlot Gazette, 52-Card Surprise Deck, Trade Machine, Winter Ball & Retire Jersey Number', async () => {
    const user = userEvent.setup();
    seedCareer(8423);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /staff & front office/i }));
    await user.click(screen.getByRole('button', { name: /gazette & front office/i }));
    expect(screen.getByTestId('front-office-gazette-panel')).toBeInTheDocument();
    expect(screen.getByText(/the sandlot gazette/i)).toBeInTheDocument();

    // Draw and resolve a 90s Surprise Event card
    await user.click(screen.getByRole('button', { name: /draw 90s surprise card/i }));
    const boldBtn = screen.getByTestId('surprise-choice-0');
    await user.click(boldBtn);
    expect(screen.getByTestId('surprise-outcome-banner')).toBeInTheDocument();

    // Trade Machine evaluates package against a rival club
    expect(screen.getByTestId('trade-machine-panel')).toBeInTheDocument();
    expect(screen.getByText(/fairness/i)).toBeInTheDocument();

    // Retire a club star's jersey number directly onto the 3D Outfield Wall
    await user.click(screen.getByRole('button', { name: /retire jersey to 3d wall/i }));
    expect(screen.getByText(/retired jersey #/i)).toBeInTheDocument();
  });

  it('runs the Global Chibi Cup and launches the 1994 June Miracle Time Capsule Challenge', async () => {
    const user = userEvent.setup();
    seedCareer(8424);

    render(<ClubHubScreen />);

    await user.click(screen.getByRole('button', { name: /events & duels/i }));
    expect(screen.getByTestId('world-spectacles-panel')).toBeInTheDocument();

    // Launch Global Chibi Cup across all 48 clubs
    await user.click(screen.getByRole('button', { name: /run global chibi cup/i }));
    expect(screen.getByTestId('global-cup-result')).toBeInTheDocument();

    // Launch 1994 June Miracle 1-10 Time Capsule Scenario
    await user.click(screen.getByRole('button', { name: /launch 1994 june miracle/i }));
    const updatedClub = useGameStore.getState().getHumanClub();
    expect(updatedClub?.wins).toBe(1);
    expect(updatedClub?.losses).toBe(10);
  });
});
