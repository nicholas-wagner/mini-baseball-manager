import { useState } from 'react';
import { playerIllustration } from '../../art/portraits/illustratedPlayerPool';
import type { HobbyMemory } from '../../engine/rpg/playerHobbies';
import './hobbyPostcard.css';

export function HobbyPostcard({ memory }: { memory: HobbyMemory }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const portrait = playerIllustration(memory.playerId);
  const initials = memory.playerName.split(/\s+/).map(word => word[0]).filter(Boolean);
  const monogram = initials.length > 1 ? initials[0] + initials[initials.length - 1] : initials[0];

  return (
    <figure className="hobby-postcard" aria-label={memory.playerName + ' hobby postcard'}>
      <div className="hobby-postcard-heading">
        <h4>{memory.title}</h4>
        <div className="hobby-postcard-stamp">
          {portrait && portrait !== failedSrc ? (
            <img src={portrait} alt={memory.playerName + ' baseball portrait'}
              loading="lazy" onError={() => setFailedSrc(portrait)} />
          ) : <span aria-hidden="true">{monogram}</span>}
        </div>
      </div>
      <blockquote>“{memory.quote}”</blockquote>
      <figcaption>{memory.playerName}</figcaption>
    </figure>
  );
}
