import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAREER_SLOT_IDS,
  clearAllCareerSlotsStorage,
  useCareerStoryStore,
} from '../../store/careerSlots';
import { useGameStore } from '../../store/gameStore';
import { CareerSlotsModal } from './CareerSlotsModal';
import { DugoutGuideModal } from './DugoutGuideModal';
import { StoryChapterModal } from './StoryChapterModal';

describe('Milestone 10 UI & 4-Slot Auto-Save Flow (TASK-071..073)', () => {
  beforeEach(() => {
    clearAllCareerSlotsStorage();
    useGameStore.setState({ humanClubId: null, manager: null });
    useCareerStoryStore.getState().startFreshInSlot('slot-1', 'sandlot_hero');
    useCareerStoryStore.getState().refreshSlots();
  });

  it('auto-saves across 4 independent career slots, resumes saved games, and safely deletes with 2-step confirmation (TASK-071)', () => {
    expect(CAREER_SLOT_IDS).toEqual(['slot-1', 'slot-2', 'slot-3', 'slot-4']);

    // Create club in Slot 1 and auto-save
    useGameStore.getState().startNewCareer({
      city: 'Pineville',
      clubName: 'Rockets',
      monogram: 'PR',
      mascot: 'Rocket',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#FFC300',
      managerName: 'Coach Sam',
      seed: 7101,
    });
    expect(useCareerStoryStore.getState().autoSaveActiveCareer()).toBe(true);

    // Switch to Slot 4, create a second independent dynasty, auto-save
    useCareerStoryStore.getState().startFreshInSlot('slot-4', 'showbiz_promoter');
    useGameStore.getState().startNewCareer({
      city: 'Neon Bay',
      clubName: 'Lasers',
      monogram: 'NB',
      mascot: 'Laser',
      primaryColor: '#7209B7',
      secondaryColor: '#181B2C',
      accentColor: '#00E5FF',
      managerName: 'Coach Blaze',
      seed: 7104,
    });
    expect(useCareerStoryStore.getState().autoSaveActiveCareer()).toBe(true);

    const onClose = vi.fn();
    const onStartNew = vi.fn();
    render(<CareerSlotsModal open onClose={onClose} onStartNewInSlot={onStartNew} />);

    expect(screen.getByTestId('career-slot-1')).toHaveTextContent('Pineville Rockets');
    expect(screen.getByTestId('career-slot-4')).toHaveTextContent('Neon Bay Lasers');
    expect(screen.getByTestId('career-slot-2')).toHaveTextContent(/empty dynasty slot/i);
    expect(screen.getByTestId('career-slot-3')).toHaveTextContent(/empty dynasty slot/i);

    // Resume Slot 1 seamlessly
    fireEvent.click(within(screen.getByTestId('career-slot-1')).getByRole('button', { name: /resume/i }));
    expect(useGameStore.getState().getHumanClub()?.name).toBe('Rockets');

    // Safe 2-step delete on Slot 4
    fireEvent.click(within(screen.getByTestId('career-slot-4')).getByRole('button', { name: /delete/i }));
    expect(screen.getByText(/retire Neon Bay Lasers/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(screen.getByTestId('career-slot-4')).toHaveTextContent(/empty dynasty slot/i);

    // Simulate fresh page reload -> auto-resumes Slot 1!
    useGameStore.setState({ humanClubId: null, manager: null });
    expect(useCareerStoryStore.getState().resumeLastSavedCareer()).toBe(true);
    expect(useGameStore.getState().getHumanClub()?.name).toBe('Rockets');
  });

  it('renders upbeat Coach Pops Dugout Handbook with 6 chapters, checklist & tab jump (TASK-072)', () => {
    const onClose = vi.fn();
    const onJump = vi.fn();
    render(<DugoutGuideModal open onClose={onClose} onJumpToTab={onJump} />);

    expect(screen.getByText(/COACH POPS’ DUGOUT HANDBOOK/i)).toBeInTheDocument();
    expect(screen.getByText(/Chapter 1: Welcome to Sandlot Ball!/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next →/i }));
    expect(screen.getByText(/Chapter 2: Pick Your Backstory/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open club hq/i }));
    expect(onJump).toHaveBeenCalledWith('economy');
    expect(onClose).toHaveBeenCalled();
  });

  it('lets players choose from 8 backstories, apply starting perks, play CYOA chapters & view scrapbook (TASK-073)', () => {
    useGameStore.getState().startNewCareer({
      city: 'Sandlot',
      clubName: 'Comets',
      monogram: 'SC',
      mascot: 'Dog',
      primaryColor: '#2FB356',
      secondaryColor: '#1B4332',
      accentColor: '#FFC300',
      managerName: 'Coach Alex',
      seed: 7300,
    });
    const cashBefore = useGameStore.getState().getHumanClub()!.economy.cash;

    render(<StoryChapterModal open onClose={vi.fn()} />);

    // Open 8 Backstories tab and lock in Showbiz Bleacher Promoter (+$3,500 starting cash!)
    fireEvent.click(screen.getByRole('button', { name: /8 manager backstories/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose showbiz/i }));
    expect(useGameStore.getState().getHumanClub()!.economy.cash).toBe(cashBefore + 3_500);

    // Resolve Act I Choose-Your-Own-Adventure chapter
    expect(screen.getByTestId('active-story-chapter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /go full 90s showtime spectacle/i }));
    expect(useCareerStoryStore.getState().storyState.completedChapterIds).toHaveLength(1);

    // Check Persona & Scrapbook records the choice & Gazette headline
    fireEvent.click(screen.getByRole('button', { name: /persona & scrapbook/i }));
    expect(screen.getByText(/SHOWTIME AT THE SANDLOT/i)).toBeInTheDocument();
  });

  it('compacts auto-save payloads and never crashes if browser localStorage throws QuotaExceededError', () => {
    useGameStore.getState().startNewCareer({
      city: 'Quota',
      clubName: 'Rescuers',
      monogram: 'QR',
      mascot: 'Bear',
      primaryColor: '#1D3557',
      secondaryColor: '#E63946',
      accentColor: '#FFD166',
      managerName: 'Coach Safe',
      seed: 7404,
    });

    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const fakeStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: fakeStorage,
    });

    try {
      expect(() => useCareerStoryStore.getState().autoSaveActiveCareer()).not.toThrow();
      expect(useCareerStoryStore.getState().lastAutoSavedIso).not.toBeNull();
      // Memory mirror still lets slot resume cleanly
      useGameStore.setState({ humanClubId: null, manager: null });
      expect(useCareerStoryStore.getState().resumeLastSavedCareer()).toBe(true);
      expect(useGameStore.getState().getHumanClub()?.name).toBe('Rescuers');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
      }
    }
  });
});
