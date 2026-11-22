import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubHubScreen } from './ClubHubScreen';

describe('ClubHubScreen — Ballparks, Coaches, Practice Complex & Manager RPG', () => {
  it('lets a club browse 10 ballparks, hire a coach under Rookie slot caps, run Practice, and unlock a Manager RPG skill', async () => {
    const user = userEvent.setup();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 9922,
    });

    render(<ClubHubScreen />);

    // 1. Ballparks tab shows all 10 retro venues
    expect(screen.getByText(/high-altitude mesa park/i)).toBeInTheDocument();
    expect(screen.getByText(/neon metro dome/i)).toBeInTheDocument();

    // 2. Coaches & Staff tab shows Rookie 0 / 2 cap and hires a candidate
    await user.click(screen.getByRole('button', { name: /coaches & staff/i }));
    expect(screen.getByText(/active staff slots: 0 \/ 2/i)).toBeInTheDocument();
    const hireButtons = screen.getAllByRole('button', { name: /^hire /i });
    await user.click(hireButtons[0]);
    expect(screen.getByText(/active staff slots: 1 \/ 2/i)).toBeInTheDocument();

    // 3. Practice Complex runs Slump-Buster Film Room
    await user.click(screen.getByRole('button', { name: /practice complex/i }));
    await user.click(screen.getByRole('button', { name: /run slump-buster film room/i }));
    expect(screen.getByText(/slump-buster film room:/i)).toBeInTheDocument();

    // 4. Manager RPG unlocks Mound Whisper with starter 1 SP
    await user.click(screen.getByRole('button', { name: /manager rpg/i }));
    const unlockButtons = screen.getAllByRole('button', { name: /unlock \(1 sp\)/i });
    await user.click(unlockButtons[0]);
    expect(screen.getByText(/unlocked manager skill:/i)).toBeInTheDocument();
  });
});
