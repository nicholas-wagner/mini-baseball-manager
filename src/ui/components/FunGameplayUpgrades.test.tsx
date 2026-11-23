import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFoilPackStore } from '../../store/foilPackStore';
import { useGameStore } from '../../store/gameStore';
import { useNemesisStore } from '../../store/nemesisStore';
import { useUserPreferencesStore } from '../../store/userPreferences';
import { FoilPackModal } from './FoilPackModal';
import { GameDayScreen } from '../screens/GameDayScreen';

describe('Mind Games, Live Dugout Chess, 1994 Foil Packs & Nemesis Matchups UI', () => {
  beforeEach(() => {
    useUserPreferencesStore.getState().resetDefaults();
    useNemesisStore.getState().resetHistory();
    useFoilPackStore.getState().resetPacks();
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      mascot: 'Rocket',
      monogram: 'SC',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Skip',
      seed: 1994,
    });
  });

  it('exposes Pitch Target / Guess Pitch Mind Games & Live Dugout Chess (Mound Visit, Kick Dirt, Bench) on GameDayScreen', () => {
    render(<GameDayScreen />);
    fireEvent.click(screen.getByTestId('opening-day-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /start live 3d game/i }));
    fireEvent.click(screen.getByTestId('control-mode-toggle'));

    // Top 1: Human is pitching -> Target Intent bar + Mound Visit + Kick Dirt button available
    expect(screen.getByTestId('mind-games-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /paint corners/i })).toBeInTheDocument();
    expect(screen.getByTestId('dugout-chess-card')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mound visit: calm breath/i }));
    expect(screen.getByTestId('play-by-play-ticker').textContent).toMatch(/mound visit/i);

    fireEvent.click(screen.getByRole('button', { name: /kick dirt/i }));
    expect(screen.getByTestId('play-by-play-ticker').textContent).toMatch(/dirt|ump|ejected|dugout/i);
  });

  it('lets the player rip open a 1994 Foil Booster Pack and claim 3 foil cards in FoilPackModal', () => {
    useFoilPackStore.getState().awardPack('rivalry_chrome', 'Crosstown Victory');
    render(<FoilPackModal open onClose={() => {}} />);

    expect(screen.getByTestId('foil-pack-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /rip open 1994 foil pack/i }));
    expect(screen.getAllByTestId('foil-pack-card')).toHaveLength(3);
  });
});
