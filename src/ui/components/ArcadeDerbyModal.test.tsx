import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { ArcadeDerbyModal } from './ArcadeDerbyModal';

describe('ArcadeDerbyModal (TASK-100 Juicy HR Distance & Hot Streak Combo)', () => {
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
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('displays estimated HR distance in feet and pops live 2x STREAK! / 3x ON FIRE! combo badges on consecutive HRs', () => {
    // Cursor starts centered at 50 in jsdom, so consecutive clicks land dead-center perfect HRs!
    const club = useGameStore.getState().getHumanClub()!;
    render(<ArcadeDerbyModal open club={club} worldSeed={1994} onClose={vi.fn()} />);

    const swingBtn = screen.getByTestId('derby-swing-btn');

    // Pitch 1 -> Home Run with estimated distance in 375–465 FT
    fireEvent.click(swingBtn);
    const distBadge = screen.getByTestId('derby-hr-distance');
    expect(distBadge.textContent).toMatch(/4\d\d\s*FT/i);
    expect(screen.queryByTestId('derby-streak-badge')).not.toBeInTheDocument();

    // Pitch 2 -> 2x STREAK!
    fireEvent.click(swingBtn);
    expect(screen.getByTestId('derby-streak-badge')).toHaveTextContent(/2x STREAK!/i);

    // Pitch 3 -> 3x ON FIRE!
    fireEvent.click(swingBtn);
    expect(screen.getByTestId('derby-streak-badge')).toHaveTextContent(/3x ON FIRE!/i);

    // Complete pitches 4 & 5 -> Final summary shows longest HR & best streak
    fireEvent.click(swingBtn);
    fireEvent.click(swingBtn);
    const finalCard = screen.getByTestId('derby-final-card');
    expect(finalCard).toHaveTextContent(/5x|streak/i);
    expect(finalCard).toHaveTextContent(/ft/i);
  });

  it('uses a compact 5-column launch chip strip for mobile screens and preserves flame-only SWING button', () => {
    const club = useGameStore.getState().getHumanClub()!;
    render(<ArcadeDerbyModal open club={club} worldSeed={1994} onClose={vi.fn()} />);

    const swingBtn = screen.getByTestId('derby-swing-btn');
    expect(swingBtn.textContent).not.toContain('💥');
    fireEvent.click(swingBtn);

    const chipsGrid = screen.getByTestId('derby-launch-chips');
    expect(chipsGrid.className).toContain('grid-cols-5');
  });
});
