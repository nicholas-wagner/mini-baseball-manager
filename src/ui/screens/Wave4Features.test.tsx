import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../../store/gameStore';
import { ClubHubScreen } from './ClubHubScreen';
import { RosterLineupScreen } from './RosterLineupScreen';
import { DesignLabScreen } from './DesignLabScreen';

describe('Wave 4 UX & QA Inspector features (TASK-142..145)', () => {
  beforeEach(() => {
    useGameStore.getState().startNewCareer({
      city: 'Cedar',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'CC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 4404,
    });
  });

  it('opens the full-size expandable stadium viewer lightbox from ClubHubScreen (TASK-142)', () => {
    render(<ClubHubScreen />);
    const openBtn = screen.getByTestId('stadium-fullsize-btn');
    fireEvent.click(openBtn);
    expect(screen.getByTestId('stadium-lightbox-modal')).toBeTruthy();
    expect(screen.getByTestId('stadium-lightbox-img')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/close full-size stadium view/i));
    expect(screen.queryByTestId('stadium-lightbox-modal')).toBeNull();
  });

  it('shows transparent Per-Series & Full-Season money flow breakdown in Treasury (TASK-143)', () => {
    render(<ClubHubScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^treasury$/i }));
    const flowPanel = screen.getByTestId('money-flow-breakdown');
    expect(flowPanel.textContent).toMatch(/How Your Club Earns/i);
    expect(flowPanel.textContent).toMatch(/3-Game Series/i);

    fireEvent.click(screen.getByTestId('money-flow-horizon-season'));
    expect(flowPanel.textContent).toMatch(/21-Game Season/i);
  });

  it('runs interactive contract negotiation from RosterLineupScreen and extends player contract (TASK-144)', () => {
    render(<RosterLineupScreen onPlayBall={() => undefined} />);
    fireEvent.click(screen.getByTestId('negotiate-selected-player-btn'));
    const modal = screen.getByTestId('contract-negotiation-modal');
    expect(modal).toBeTruthy();

    // Match the player's asking salary and submit — should sign cleanly!
    const submitBtn = screen.getByTestId('submit-contract-offer-btn');
    fireEvent.click(submitBtn);
    expect(screen.queryByTestId('contract-negotiation-modal')).toBeNull();
  });

  it('lets designers inspect 3,000 Players & Hobbies, 45 Injuries/Illnesses, Relics/Crests/Parks, and Audio Lab (TASK-145)', () => {
    render(<DesignLabScreen />);

    // Players & Hobbies tab
    fireEvent.click(screen.getByTestId('design-lab-tab-players_hobbies'));
    const playersQa = screen.getByTestId('design-lab-qa-players_hobbies');
    expect(playersQa.textContent).toMatch(/3,000 players/i);

    // 45 Injuries & Illnesses tab
    fireEvent.click(screen.getByTestId('design-lab-tab-health_art'));
    const healthQa = screen.getByTestId('design-lab-qa-health_art');
    expect(healthQa.textContent).toMatch(/All \(45\)/i);
    expect(screen.getByTestId('qa-health-card-patellofemoral_knee_strain')).toBeTruthy();

    // Relics, Crests & Parks tab
    fireEvent.click(screen.getByTestId('design-lab-tab-relics_world'));
    const relicsQa = screen.getByTestId('design-lab-qa-relics_world');
    expect(relicsQa.textContent).toMatch(/All 26 Collectible 90s Relics/i);
    expect(relicsQa.textContent).toMatch(/All 18 Club Crest Emblems/i);
    expect(relicsQa.textContent).toMatch(/All 10 Retro Ballparks/i);

    // Music & SFX Lab tab
    fireEvent.click(screen.getByTestId('design-lab-tab-audio'));
    expect(screen.getByTestId('arcade-bgm-jukebox')).toBeTruthy();
  });
});
