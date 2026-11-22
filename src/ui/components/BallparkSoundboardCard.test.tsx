import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BGM_TRACKS, bgmEngine } from '../../audio/bgmEngine';
import { ALL_SOUNDBOARD_CUES, soundEngine } from '../../audio/soundEngine';
import { DesignLabScreen } from '../screens/DesignLabScreen';
import { BallparkSoundboardCard } from './BallparkSoundboardCard';
import { MusicJukeboxModal } from './MusicJukeboxModal';

vi.mock('./BallparkCanvas', () => ({ BallparkCanvas: () => null }));

describe('BallparkSoundboardCard & 90s Arcade Stadium Jukebox', () => {
  it('renders all 40 procedural 90s SFX cues including new ballpark cues & Stomp-Stomp-Clap and triggers soundEngine', () => {
    const playSpy = vi.spyOn(soundEngine, 'play');
    render(<BallparkSoundboardCard />);

    expect(
      screen.getByText(
        new RegExp(`Ballpark Soundboard \\(${ALL_SOUNDBOARD_CUES.length} Procedural 90s SFX\\)`, 'i'),
      ),
    ).toBeInTheDocument();

    const buttonLabels = new Set(
      screen.getAllByRole('button').map((btn) => btn.textContent?.trim() ?? ''),
    );
    for (const item of ALL_SOUNDBOARD_CUES) {
      expect(buttonLabels.has(item.label)).toBe(true);
    }

    fireEvent.click(screen.getByText('Stomp-Stomp-Clap!'));
    expect(playSpy).toHaveBeenCalledWith('stadium_stomp_clap');

    fireEvent.click(screen.getByText('Stadium Airhorn!'));
    expect(playSpy).toHaveBeenCalledWith('stadium_airhorn');
    playSpy.mockRestore();
  });

  it('renders the 10-track Per-Stadium 90s Arcade Jukebox with Auto-Stadium mode, track pin, mute toggle & modal', () => {
    bgmEngine.setEnabled(true);
    bgmEngine.setAutoMatchStadium(true);
    bgmEngine.syncStadium('sandlot_commons');

    render(<BallparkSoundboardCard />);
    expect(screen.getByTestId('arcade-bgm-jukebox')).toBeInTheDocument();

    const jukeboxText = screen.getByTestId('arcade-bgm-jukebox').textContent ?? '';
    for (const track of BGM_TRACKS) {
      expect(jukeboxText).toContain(track.title);
    }

    fireEvent.click(screen.getByText(/sakura brass-band march/i));
    expect(bgmEngine.getState().trackId).toBe('sakura_pentatonic_march');
    expect(bgmEngine.getState().autoMatchStadium).toBe(false);

    fireEvent.click(screen.getByText(/manual track pin/i));
    expect(bgmEngine.getState().autoMatchStadium).toBe(true);
    expect(bgmEngine.getState().trackId).toBe('sandlot_sunshine');

    fireEvent.click(screen.getByText(/music on/i));
    expect(bgmEngine.getState().enabled).toBe(false);
    expect(screen.getByText(/music off/i)).toBeInTheDocument();

    // Global MusicJukeboxModal renders cleanly and toggles music back ON
    const onClose = vi.fn();
    render(<MusicJukeboxModal open onClose={onClose} />);
    expect(screen.getByTestId('music-jukebox-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close music jukebox/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Restore default
    bgmEngine.setEnabled(true);
  });

  it('mounts the full 40-cue soundboard and per-stadium BGM jukebox on Design Lab', () => {
    render(<DesignLabScreen />);

    expect(screen.getByTestId('ballpark-soundboard')).toBeInTheDocument();
    expect(screen.getByTestId('arcade-bgm-jukebox')).toBeInTheDocument();
    expect(screen.getByText('Stomp-Stomp-Clap!')).toBeInTheDocument();
    expect(screen.getByText('Organ: 7th-Inning Stretch')).toBeInTheDocument();
    expect(screen.getByText('Base Steal Burst')).toBeInTheDocument();
    expect(screen.getByText('Walk-Off Fireworks')).toBeInTheDocument();
    expect(screen.getByText('Bullpen Phone')).toBeInTheDocument();
  });
});
