import { useState } from 'react';
import { MessageCircle, NotebookPen } from 'lucide-react';
import { hobbyPrint } from '../../art/hobbies/hobbyPrint';
import type { Club } from '../../engine/models/club';
import type { Player } from '../../engine/models/player';
import { availableHobbyChats, clubHobbyGames, getPlayerHobby, type HobbyMemory } from '../../engine/rpg/playerHobbies';
import { useGameStore } from '../../store/gameStore';
import { ComicButton } from '../design-system/ComicButton';

function MemoryPrint({ memory }: { memory: HobbyMemory }) {
  const [failed, setFailed] = useState(false);
  const print = hobbyPrint(memory.playerId);
  return (
    <figure className="overflow-hidden rounded-lg border border-[#bba683] bg-[#fffdf5]">
      {print && !failed && <img src={print} alt={memory.playerName + ' · ' + memory.title}
        className="mx-auto block w-full max-w-72" loading="lazy" onError={() => setFailed(true)} />}
      <figcaption className="p-3">
        <h4 className="font-heading text-lg font-bold">{memory.title}</h4>
        <blockquote className="mt-1 text-sm italic">“{memory.quote}”</blockquote>
        <p className="mt-1 text-right text-xs font-bold">{memory.playerName}</p>
      </figcaption>
    </figure>
  );
}

function PlayerConversation({ club, player, onDiscover }: {club: Club; player: Player; onDiscover?: () => void}) {
  const chat = useGameStore(s => s.chatAboutHobby);
  const offseason = useGameStore(s => Boolean(s.activeOffseason));
  const memory = club.hobbyMemories?.find(item => item.playerId === player.id);
  if (memory) return <MemoryPrint key={player.id} memory={memory} />;
  const games = clubHobbyGames(club);
  const credits = availableHobbyChats(club);
  return <div className="space-y-2">
    <p className="text-sm italic">“{getPlayerHobby(player).clue}”</p>
    {offseason ? <p className="text-xs">Conversations resume after the offseason.</p> : credits > 0 ?
      <><ComicButton size="sm" variant="gold" icon={<MessageCircle size={16}/>} onClick={() => { onDiscover?.(); chat(player.id); }}>Ask about the clue</ComicButton>
        <p className="text-xs">{credits} {credits === 1 ? 'conversation' : 'conversations'} available · Up to +2 morale</p></> :
      <p className="text-xs font-bold">{games === 0 ? 'Talk after your first game.' : games % 2 ? 'Talk after two more games.' : 'Talk after one more game.'}</p>}
  </div>;
}

const panel = 'space-y-2 rounded-xl border-2 border-[#624367] bg-[#fff6e7] p-3 text-[#362a3a]';
function Title() {
  return <h3 className="flex items-center gap-2 font-display text-sm text-[#624367]"><NotebookPen size={18}/>Off the Clock</h3>;
}

export function PlayerHobbyPanel({playerId, clubId}: {playerId: string; clubId: string}) {
  const club = useGameStore(s => s.getHumanClub());
  const player = club?.roster.find(p => p.id === playerId);
  if (!club || club.id !== clubId || !player) return null;
  return <section className={panel} aria-label="Off the Clock"><Title/><PlayerConversation club={club} player={player}/></section>;
}

export function HobbyConversation() {
  const club = useGameStore(s => s.getHumanClub());
  const [chosen, choose] = useState('');
  if (!club) return null;
  const remaining = club.roster.filter(p => !club.hobbyMemories?.some(m => m.playerId === p.id));
  const player = club.roster.find(p => p.id === chosen) ?? remaining[0];
  if (!player || (!chosen && !availableHobbyChats(club))) return null;
  return <section className={panel} aria-label="Off the Clock">
    <Title/>
    <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Talk to a teammate</summary>
      <label className="block text-xs font-bold">Choose a teammate
        <select className="my-2 block min-h-11 w-full rounded-lg border bg-white p-2 text-sm" value={player.id} onChange={e => choose(e.target.value)}>
          {club.roster.map(member => <option key={member.id} value={member.id}>{member.name} · {member.position}</option>)}
        </select>
      </label>
      <PlayerConversation club={club} player={player} onDiscover={() => choose(player.id)}/>
    </details>
  </section>;
}

export function HobbyAlbum({ club }: {club: Club}) {
  const memories = club.hobbyMemories ?? [];
  return <section className={panel} aria-label="Off the Clock album"><Title/>
    {memories.length === 0 ? <p className="text-sm">Talk to a teammate after a game to collect their story here.</p> :
      memories.map(memory => <details key={memory.playerId}>
        <summary className="min-h-11 cursor-pointer py-2 font-bold">{memory.playerName} · {memory.title}</summary>
        <MemoryPrint memory={memory}/>
      </details>)}
  </section>;
}
