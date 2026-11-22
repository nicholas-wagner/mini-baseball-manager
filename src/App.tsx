import { useEffect, useState } from 'react';
import {
  BookOpen,
  Building2,
  Disc3,
  Gamepad2,
  GitBranch,
  HardDrive,
  Palette,
  ScrollText,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { bgmEngine } from './audio/bgmEngine';
import { soundEngine } from './audio/soundEngine';
import { getNextAvailableStoryChapter } from './engine/story/storyEngine';
import { useCareerStoryStore } from './store/careerSlots';
import { useGameStore } from './store/gameStore';
import { CareerSlotsModal } from './ui/components/CareerSlotsModal';
import { DugoutGuideModal } from './ui/components/DugoutGuideModal';
import { MusicJukeboxModal } from './ui/components/MusicJukeboxModal';
import { PwaInstallBanner } from './ui/components/PwaInstallBanner';
import { SettingsModal } from './ui/components/SettingsModal';
import { StoryChapterModal } from './ui/components/StoryChapterModal';
import { AppShell, type NavItem } from './ui/design-system/AppShell';
import { ComicCard } from './ui/design-system/ComicCard';
import { ClubCreatorScreen } from './ui/screens/ClubCreatorScreen';
import { ClubHubScreen } from './ui/screens/ClubHubScreen';
import { DesignLabScreen } from './ui/screens/DesignLabScreen';
import { GameDayScreen } from './ui/screens/GameDayScreen';
import { LeagueScreen } from './ui/screens/LeagueScreen';
import { RosterLineupScreen } from './ui/screens/RosterLineupScreen';
import { SkillTreeScreen } from './ui/screens/SkillTreeScreen';
import {
  createKeySequenceTracker,
  DESIGN_LAB_SHORTCUT_COUNT,
  DESIGN_LAB_SHORTCUT_KEY,
  DESIGN_LAB_SHORTCUT_WINDOW_MS,
  isEditableEventTarget,
} from './ui/utils/designLabShortcut';

type TabId = 'lab' | 'gameday' | 'roster' | 'league' | 'skills' | 'economy';

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'lab', label: 'Design Lab', icon: <Palette className="w-4 h-4" />, badge: 'LIVE' },
  { id: 'gameday', label: 'Play Ball', icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
  { id: 'league', label: 'League', icon: <Trophy className="w-4 h-4" /> },
  { id: 'skills', label: 'Skill Tree', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'economy', label: 'Ballpark', icon: <Building2 className="w-4 h-4" /> },
];

const UPCOMING_MILESTONES: Record<
  Exclude<TabId, 'lab' | 'gameday' | 'roster' | 'league' | 'skills'>,
  { title: string; milestone: string; summary: string }
> = {
  economy: {
    title: 'Sim-City Ballpark Economy & Upgrades',
    milestone: 'Milestone 5',
    summary:
      'Control ticket & concession pricing, sign 90s parody sponsors for your outfield wall, negotiate TV contracts, and visually upgrade your 3D stadium.',
  },
};

export function App() {
  const [designLabVisible, setDesignLabVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lab') === '1';
  });
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('lab') === '1') {
      return 'lab';
    }
    return 'gameday';
  });
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(() => bgmEngine.getState().enabled);
  const [guideOpen, setGuideOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const humanClub = useGameStore((s) => s.getHumanClub());
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const storyState = useCareerStoryStore((s) => s.storyState);
  const lastAutoSavedIso = useCareerStoryStore((s) => s.lastAutoSavedIso);
  const resumeLastSavedCareer = useCareerStoryStore((s) => s.resumeLastSavedCareer);
  const autoSaveActiveCareer = useCareerStoryStore((s) => s.autoSaveActiveCareer);

  // Secret developer/power-user shortcut: press "d" 5 times rapidly to show or hide Design Lab
  useEffect(() => {
    const tracker = createKeySequenceTracker({
      targetKey: DESIGN_LAB_SHORTCUT_KEY,
      requiredCount: DESIGN_LAB_SHORTCUT_COUNT,
      windowMs: DESIGN_LAB_SHORTCUT_WINDOW_MS,
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableEventTarget(event.target)) {
        tracker.reset();
        return;
      }
      if (tracker.recordKey(event.key)) {
        setDesignLabVisible((wasVisible) => {
          const nextVisible = !wasVisible;
          if (nextVisible) {
            setActiveTab('lab');
            soundEngine.play('level_up');
          } else {
            setActiveTab((tab) => (tab === 'lab' ? 'gameday' : tab));
            soundEngine.play('ui_pop');
          }
          return nextVisible;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Keep UI synced with BGM Jukebox state & start gentle arcade music cleanly on first browser interaction
  useEffect(() => {
    const unsub = bgmEngine.subscribe((s) => setBgmEnabled(s.enabled));
    const unlockBgm = () => {
      bgmEngine.startIfAllowed();
    };
    window.addEventListener('pointerdown', unlockBgm, { once: true });
    window.addEventListener('keydown', unlockBgm, { once: true });
    return () => {
      unsub();
      window.removeEventListener('pointerdown', unlockBgm);
      window.removeEventListener('keydown', unlockBgm);
    };
  }, []);

  // Automatically sync stadium environmental soundtrack whenever the active club's home ballpark changes
  useEffect(() => {
    bgmEngine.syncStadium(humanClub?.stadium.ballparkId ?? 'sandlot_commons');
  }, [humanClub?.stadium.ballparkId]);

  // Resume the last active saved career slot automatically on boot
  useEffect(() => {
    if (!useGameStore.getState().humanClubId) {
      resumeLastSavedCareer();
    }
  }, [resumeLastSavedCareer]);

  // Seamlessly auto-save active career whenever club/league/manager state changes
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (!state.humanClubId) return;
      if (
        state.humanClubId !== prev.humanClubId ||
        state.leagues !== prev.leagues ||
        state.manager !== prev.manager ||
        state.seasonNumber !== prev.seasonNumber
      ) {
        autoSaveActiveCareer();
      }
    });
    return unsubscribe;
  }, [autoSaveActiveCareer]);

  const hasUnreadChapter = Boolean(
    humanClub &&
      getNextAvailableStoryChapter(storyState, {
        gamesPlayed: humanClub.wins + humanClub.losses,
        seasonNumber,
      }),
  );

  const utilityActions = (
    <div className="flex md:flex-col gap-1 md:gap-1.5">
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setGuideOpen(true);
        }}
        className="comic-btn bg-[#FFF3BF] text-[#181B2C] w-11 h-11 md:w-auto md:h-auto md:px-2.5 md:py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open Dugout Guide"
        title="Coach Pops’ Guide"
      >
        <BookOpen className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
        <span className="hidden md:inline">Coach Pops’ Guide</span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setStoryOpen(true);
        }}
        className={`comic-btn w-11 h-11 md:w-auto md:h-auto md:px-2.5 md:py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0 ${
          hasUnreadChapter ? 'bg-[#FFC300] text-[#181B2C]' : 'bg-[#FBF4E4] text-[#181B2C]'
        }`}
        aria-label="Open Dynasty Story"
        title="Story & Origins"
      >
        <ScrollText className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
        <span className="hidden md:inline">
          Story &amp; Origins{hasUnreadChapter ? ' ★' : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setSlotsOpen(true);
        }}
        className="comic-btn bg-[#D8F3DC] text-[#1B4332] w-11 h-11 md:w-auto md:h-auto md:px-2.5 md:py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open 4 Career Save Slots"
        title="4 Save Slots"
      >
        <HardDrive className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
        <span className="hidden md:inline">
          4 Save Slots{lastAutoSavedIso ? ' ✓' : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setJukeboxOpen(true);
        }}
        className={`comic-btn w-11 h-11 md:w-auto md:h-auto md:px-2.5 md:py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0 ${
          bgmEnabled && !muted ? 'bg-[#E0C3FC] text-[#181B2C]' : 'bg-[#FBF4E4] text-[#4A5068]'
        }`}
        aria-label="Open 90s Music Jukebox"
        title="90s Music Jukebox"
      >
        <Disc3 className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
        <span className="hidden md:inline">
          {bgmEnabled && !muted ? 'Jukebox: ON' : 'Jukebox: OFF'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          soundEngine.play('ui_pop');
          setSettingsOpen(true);
        }}
        className="comic-btn bg-[#E0FBFC] text-[#1D3557] w-11 h-11 md:w-auto md:h-auto md:px-2.5 md:py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
        aria-label="Open Settings and Accessibility"
        title="Settings & Accessibility"
      >
        <Settings className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
        <span className="hidden md:inline">Settings</span>
      </button>
    </div>
  );

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    bgmEngine.setMasterMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.play('ui_pop');
    }
  };

  const visibleNavItems = designLabVisible
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.id !== 'lab');

  const renderMainContent = () => {
    if (activeTab === 'lab' && designLabVisible) {
      return <DesignLabScreen />;
    }
    if (activeTab === 'gameday' || activeTab === 'lab') {
      return humanClub ? (
        <GameDayScreen />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('gameday')} />
      );
    }
    if (activeTab === 'roster') {
      return humanClub ? (
        <RosterLineupScreen onPlayBall={() => setActiveTab('gameday')} />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('roster')} />
      );
    }
    if (activeTab === 'league') {
      return humanClub ? (
        <LeagueScreen />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('league')} />
      );
    }
    if (activeTab === 'skills') {
      return humanClub ? (
        <SkillTreeScreen />
      ) : (
        <ClubCreatorScreen onCreated={() => setActiveTab('skills')} />
      );
    }

    if (activeTab === 'economy' && humanClub) {
      return <ClubHubScreen />;
    }

    const upcoming = UPCOMING_MILESTONES[activeTab];
    return (
      <ComicCard title={upcoming.title} subtitle={upcoming.milestone} headerBg="#1B4332">
        <p className="font-bold text-sm text-[#4A5068] leading-relaxed">{upcoming.summary}</p>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-[#2FB356]">
          Tracked in PLAN.md — Milestone 2 MVP Play Ball & Roster tabs are now live!
        </p>
      </ComicCard>
    );
  };

  return (
    <AppShell
      clubName={humanClub ? `${humanClub.city} ${humanClub.name}` : 'Mini Baseball Manager'}
      leagueLabel={
        humanClub
          ? `${humanClub.leagueTier.toUpperCase()} LEAGUE • ${humanClub.wins}-${humanClub.losses}`
          : 'Rookie Sandlot League'
      }
      navItems={visibleNavItems}
      activeTab={activeTab}
      onSelectTab={(id) => {
        soundEngine.play('ui_pop');
        setActiveTab(id as TabId);
      }}
      muted={muted}
      onToggleMute={handleToggleMute}
      utilityActions={utilityActions}
    >
      <PwaInstallBanner />
      {renderMainContent()}
      <DugoutGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onJumpToTab={(tab) => setActiveTab(tab)}
      />
      <StoryChapterModal open={storyOpen} onClose={() => setStoryOpen(false)} />
      <CareerSlotsModal
        open={slotsOpen}
        onClose={() => setSlotsOpen(false)}
        onStartNewInSlot={() => setActiveTab('gameday')}
      />
      <MusicJukeboxModal open={jukeboxOpen} onClose={() => setJukeboxOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppShell>
  );
}
