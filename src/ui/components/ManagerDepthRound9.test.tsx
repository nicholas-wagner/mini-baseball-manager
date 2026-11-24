import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bgmEngine } from '../../audio/bgmEngine';
import { useGameStore } from '../../store/gameStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { GameDayScreen } from '../screens/GameDayScreen';
import { MusicJukeboxModal } from './MusicJukeboxModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('TASK-081 — Bunt UI, Visible Pitcher Fatigue, Manager Pitch Sign & Tier-Gated Music Jukebox', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket Dog',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFD166',
      managerName: 'Coach Skip',
      seed: 2089,
    });
  });

  it('shows a visible Pitcher Endurance Meter, Catcher Pitch Sign strip, live Pitch Radar Pill, and Arcade Bunt button with live odds preview', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Visible pitcher endurance meter shows right on MatchupPrints & LiveActionBar
    expect(screen.getAllByTestId('pitcher-endurance-meter').length).toBeGreaterThanOrEqual(1);

    // Check whichever half we start on (pitching or batting)
    const callBar = screen.getByTestId('arcade-call-bar');
    if (screen.queryByTestId('arcade-pitch-sign-bar')) {
      const signBar = screen.getByTestId('arcade-pitch-sign-bar');
      expect(signBar).toHaveTextContent(/auto/i);
      const pitchButtons = signBar.querySelectorAll('button');
      expect(pitchButtons.length).toBeGreaterThanOrEqual(3); // Auto + 2..5 arsenal pitches
      fireEvent.click(pitchButtons[1]);
      expect(pitchButtons[1]).toHaveAttribute('aria-pressed', 'true');
    } else {
      expect(callBar).toHaveTextContent(/bunt/i);
    }

    // Throwing a pitch reveals the live Pitch Radar Pill showing exactly what pitch was thrown!
    fireEvent.click(screen.getByRole('button', { name: /next pitch/i }));
    expect(screen.getByTestId('live-pitch-radar-pill')).toHaveTextContent(/mph/i);

    // Sim half-inning so we verify the other side of the ball too (Bunt button or Pitch Sign!)
    fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /sim half-inn/i }));

    const buntBtn = screen.queryByTestId('arcade-bunt-btn');
    if (buntBtn) {
      fireEvent.click(buntBtn);
      expect(buntBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('arcade-tradeoff-hint')).toHaveTextContent(/hit.*foul.*whiff/i);
    } else {
      expect(screen.getByTestId('arcade-pitch-sign-bar')).toBeInTheDocument();
    }
  });

  it('limits MusicJukeboxModal track selection strictly to the club league tier while showing locked future tiers', () => {
    bgmEngine.syncLeagueTier('rookie');
    const rookieView = render(<MusicJukeboxModal open leagueTier="rookie" onClose={vi.fn()} />);

    const availableList = screen.getByTestId('jukebox-tier-tracks');
    const availableBtns = availableList.querySelectorAll('button:not(:disabled)');
    expect(availableBtns.length).toBe(2);
    expect(availableList).toHaveTextContent(/sandlot sunshine/i);
    expect(availableList).toHaveTextContent(/twilight bleachers/i);

    // Major League tracks are locked while in Rookie League!
    const lockedSection = screen.getByTestId('jukebox-locked-tiers');
    expect(lockedSection).toHaveTextContent(/grand cathedral anthem/i);
    expect(lockedSection.querySelectorAll('button:disabled').length).toBeGreaterThanOrEqual(2);
    rookieView.unmount();

    // Promoting to Mini Major League unlocks the 2 Major League tracks!
    bgmEngine.syncLeagueTier('majors');
    render(<MusicJukeboxModal open leagueTier="majors" onClose={vi.fn()} />);
    const majorsList = screen.getByTestId('jukebox-tier-tracks');
    expect(majorsList.querySelectorAll('button:not(:disabled)').length).toBe(2);
    expect(majorsList).toHaveTextContent(/grand cathedral anthem/i);
    expect(majorsList).toHaveTextContent(/9th-inning turbo/i);
  });

  it('does not force the PC team to keep bunting after the human selected Bunt before the inning flipped', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));

    // Ensure we are on a human-batting half first
    if (!screen.queryByTestId('arcade-bunt-btn')) {
      fireEvent.click(screen.getByTestId('fast-sim-toggle'));
      fireEvent.click(screen.getByRole('button', { name: /sim half-inn/i }));
    }

    // Human selects Bunt, then the half-inning flips to PC batting
    const buntBtn = screen.getByTestId('arcade-bunt-btn');
    fireEvent.click(buntBtn);
    expect(buntBtn).toHaveAttribute('aria-pressed', 'true');

    if (!screen.queryByRole('button', { name: /sim half-inn/i })) {
      fireEvent.click(screen.getByTestId('fast-sim-toggle'));
    }
    fireEvent.click(screen.getByRole('button', { name: /sim half-inn/i }));

    // Now human is pitching (PC is batting) — throw 6 pitches and confirm PC is NOT forced into bunting
    expect(screen.getByTestId('arcade-pitch-sign-bar')).toBeInTheDocument();
    let buntMentions = 0;
    for (let i = 0; i < 6; i += 1) {
      const nextBtn = screen.queryByRole('button', { name: /next pitch/i });
      if (!nextBtn || nextBtn.hasAttribute('disabled') || !screen.queryByTestId('arcade-pitch-sign-bar')) {
        break;
      }
      fireEvent.click(nextBtn);
      const ticker = screen.queryByTestId('live-action-bar')?.textContent ?? '';
      if (/bunt|squares/i.test(ticker)) buntMentions += 1;
    }
    expect(buntMentions).toBeLessThanOrEqual(1);
  });
});
