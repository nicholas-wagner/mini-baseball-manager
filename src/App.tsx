import { useState } from 'react';
import { Building2, Gamepad2, GitBranch, Palette, Trophy, Users } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { useGameStore } from './store/gameStore';
import { AppShell, type NavItem } from './ui/design-system/AppShell';
import { ComicCard } from './ui/design-system/ComicCard';
import { ClubCreatorScreen } from './ui/screens/ClubCreatorScreen';
import { DesignLabScreen } from './ui/screens/DesignLabScreen';
import { GameDayScreen } from './ui/screens/GameDayScreen';
import { LeagueScreen } from './ui/screens/LeagueScreen';
import { RosterLineupScreen } from './ui/screens/RosterLineupScreen';
import { SkillTreeScreen } from './ui/screens/SkillTreeScreen';

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
  const [activeTab, setActiveTab] = useState<TabId>('lab');
  const [muted, setMuted] = useState(false);
  const humanClub = useGameStore((s) => s.getHumanClub());

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.play('ui_pop');
    }
  };

  const renderMainContent = () => {
    if (activeTab === 'lab') {
      return <DesignLabScreen />;
    }
    if (activeTab === 'gameday') {
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
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onSelectTab={(id) => {
        soundEngine.play('ui_pop');
        setActiveTab(id as TabId);
      }}
      muted={muted}
      onToggleMute={handleToggleMute}
    >
      {renderMainContent()}
    </AppShell>
  );
}
