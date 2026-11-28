import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { ClubHubScreen } from './ClubHubScreen';

describe('ClubHubScreen — Ballparks, Coaches, Practice Complex & Manager RPG', () => {
  it('lets a club browse 10 ballparks, hire a coach under Rookie slot caps, run Practice, and equip Relics across the 4 clean HQ rooms', async () => {
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

    // 1. Ballpark & Economy room shows all 10 retro venues (no duplicate Manager RPG tab!)
    expect(screen.getByTestId('hub-room-tabs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manager rpg/i })).not.toBeInTheDocument();
    expect(screen.getByText(/high-altitude mesa park/i)).toBeInTheDocument();
    expect(screen.getByText(/neon metro dome/i)).toBeInTheDocument();

    // 2. Staff & Front Office room shows Rookie 0 / 2 cap, ALL 6 MDs (including Women's Sports Medicine & Oncology), and hires a candidate
    await user.click(screen.getByRole('button', { name: /staff & front office/i }));
    expect(screen.getByText(/active staff slots: 0 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByTestId('medical-staff-market')).toHaveTextContent(/Women's Sports Medicine MD/i);
    expect(screen.getByTestId('medical-staff-market')).toHaveTextContent(/Oncology & Complex Recovery MD/i);
    const hireButtons = screen.getAllByRole('button', { name: /^hire /i });
    await user.click(hireButtons[0]);
    expect(screen.getByText(/active staff slots: 1 \/ 2/i)).toBeInTheDocument();

    // 3. Practice Complex sub-tab inside Staff & Front Office runs Slump-Buster Film Room
    await user.click(screen.getByRole('button', { name: /practice complex/i }));
    await user.click(screen.getByRole('button', { name: /run slump-buster film room/i }));
    expect(screen.getByText(/slump-buster film room:/i)).toBeInTheDocument();

    // 4. Uniforms & Gear room -> Club Rituals picker persists HR Celebration & Lucky Snack
    await user.click(screen.getByRole('button', { name: /uniforms & gear/i }));
    expect(screen.getByTestId('club-rituals-card')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dugout dance line/i }));
    await user.click(screen.getByRole('button', { name: /rally nachos/i }));
    expect(useGameStore.getState().getHumanClub()?.clubRituals).toEqual({
      hrCelebration: 'dugout_dance_line',
      luckySnack: 'rally_nachos',
    });

    // 5. Uniforms & Gear room -> Relics & Chemistry equips an owned starter 90s Relic from real Locker + shows Rotating Vintage Shop!
    await user.click(screen.getByRole('button', { name: /relics & chemistry/i }));
    expect(screen.getByText(/clubhouse chemistry:/i)).toBeInTheDocument();
    expect(screen.getByTestId('relic-locker-panel')).toBeInTheDocument();
    expect(screen.getByTestId('vintage-relic-shop')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /equip relic/i })[0]);
    expect(screen.getByText(/equipped /i)).toBeInTheDocument();
  });
});
