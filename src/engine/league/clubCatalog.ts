import type { AiArchetype, LeagueTierId } from '../models/club';

export interface AiClubTemplate {
  city: string;
  name: string;
  mascot: string;
  monogram: string;
  primary: string;
  secondary: string;
  accent: string;
  archetype: AiArchetype;
}

export const LEAGUE_TIER_LABELS: Readonly<Record<LeagueTierId, string>> = {
  rookie: 'Rookie Sandlot',
  low_a: 'Low-A Backyard',
  high_a: 'High-A Bus League',
  aa: 'AA Diamond League',
  aaa: 'AAA Stardom',
  majors: 'Mini Major League',
};

/** 47 unique 90s-themed AI clubs (7 Rookie + 8 each across Low-A through Majors = 48 total with human). */
export const AI_CLUB_CATALOG: Readonly<Record<LeagueTierId, readonly AiClubTemplate[]>> = {
  rookie: [
    { city: 'Bayside', name: 'Pelicans', mascot: 'Pelican', monogram: 'BP', primary: '#1D63B8', secondary: '#0F2B46', accent: '#FFD166', archetype: 'ace_factory' },
    { city: 'Maple', name: 'Lumberjacks', mascot: 'Moose', monogram: 'ML', primary: '#B8332A', secondary: '#2E1A18', accent: '#F4A261', archetype: 'mashers' },
    { city: 'Cactus', name: 'Runners', mascot: 'Roadrunner', monogram: 'CR', primary: '#2FB356', secondary: '#1B4332', accent: '#FFC300', archetype: 'speed_demons' },
    { city: 'Ironwood', name: 'Knights', mascot: 'Hawk', monogram: 'IK', primary: '#5A4AE3', secondary: '#181B2C', accent: '#00E5FF', archetype: 'defense_first' },
    { city: 'Harbor', name: 'Pelicanos', mascot: 'Gull', monogram: 'HP', primary: '#0096C7', secondary: '#023E8A', accent: '#FFF3B0', archetype: 'moneyball' },
    { city: 'Sunset', name: 'Coyotes', mascot: 'Coyote', monogram: 'SC', primary: '#F77F00', secondary: '#3A1C0E', accent: '#FCBF49', archetype: 'mashers' },
    { city: 'Clover', name: 'Shamrocks', mascot: 'Fox', monogram: 'CS', primary: '#1F9D55', secondary: '#0D3B22', accent: '#FFD166', archetype: 'speed_demons' },
  ],
  low_a: [
    { city: 'Pinecone', name: 'Raccoons', mascot: 'Raccoon', monogram: 'PR', primary: '#2B9348', secondary: '#1B4332', accent: '#FFD166', archetype: 'defense_first' },
    { city: 'Cedar', name: 'Squirrels', mascot: 'Squirrel', monogram: 'CQ', primary: '#BC4749', secondary: '#386641', accent: '#F2E8CF', archetype: 'speed_demons' },
    { city: 'Riverbend', name: 'Otters', mascot: 'Otter', monogram: 'RO', primary: '#0077B6', secondary: '#03045E', accent: '#90E0EF', archetype: 'ace_factory' },
    { city: 'Pebble', name: 'Badgers', mascot: 'Badger', monogram: 'PB', primary: '#E07A5F', secondary: '#3D405B', accent: '#F2CC8F', archetype: 'moneyball' },
    { city: 'Hickory', name: 'Owls', mascot: 'Owl', monogram: 'HO', primary: '#6A4C93', secondary: '#1D1E2C', accent: '#FFCA3A', archetype: 'ace_factory' },
    { city: 'Sunbeam', name: 'Crickets', mascot: 'Cricket', monogram: 'SB', primary: '#FF9F1C', secondary: '#1B4332', accent: '#CBF3F0', archetype: 'speed_demons' },
    { city: 'Copper', name: 'Toads', mascot: 'Toad', monogram: 'CT', primary: '#C8553D', secondary: '#2D3047', accent: '#FFD5C2', archetype: 'mashers' },
    { city: 'Meadow', name: 'Hounds', mascot: 'Hound', monogram: 'MH', primary: '#3A86FF', secondary: '#14213D', accent: '#FFBE0B', archetype: 'defense_first' },
  ],
  high_a: [
    { city: 'Route 66', name: 'Cruisers', mascot: 'Armadillo', monogram: 'RC', primary: '#E63946', secondary: '#1D3557', accent: '#A8DADC', archetype: 'mashers' },
    { city: 'Dustbowl', name: 'Twisters', mascot: 'Jackrabbit', monogram: 'DT', primary: '#FB8500', secondary: '#023047', accent: '#FFB703', archetype: 'speed_demons' },
    { city: 'Bluegrass', name: 'Colts', mascot: 'Colt', monogram: 'BC', primary: '#00509D', secondary: '#00296B', accent: '#FDC500', archetype: 'ace_factory' },
    { city: 'Tidewater', name: 'Crabs', mascot: 'Blue Crab', monogram: 'TC', primary: '#D62828', secondary: '#003049', accent: '#EAE2B7', archetype: 'defense_first' },
    { city: 'Driftwood', name: 'Sharks', mascot: 'Shark', monogram: 'DS', primary: '#00A8E8', secondary: '#003459', accent: '#FFFFFF', archetype: 'moneyball' },
    { city: 'Redrock', name: 'Scorpions', mascot: 'Scorpion', monogram: 'RS', primary: '#9B2226', secondary: '#001219', accent: '#EE9B00', archetype: 'mashers' },
    { city: 'Glacier', name: 'Huskies', mascot: 'Husky', monogram: 'GH', primary: '#48CAE4', secondary: '#181B2C', accent: '#CAF0F8', archetype: 'ace_factory' },
    { city: 'Orchard', name: 'Hornets', mascot: 'Hornet', monogram: 'OH', primary: '#2EC4B6', secondary: '#011627', accent: '#FF9F1C', archetype: 'speed_demons' },
  ],
  aa: [
    { city: 'Rocketville', name: 'Rockets', mascot: 'Comet Dog', monogram: 'RK', primary: '#E63946', secondary: '#1D3557', accent: '#FFD166', archetype: 'mashers' },
    { city: 'Baytown', name: 'Waves', mascot: 'Surf Shark', monogram: 'BW', primary: '#1D63B8', secondary: '#0F2B46', accent: '#00E5FF', archetype: 'ace_factory' },
    { city: 'Emerald', name: 'Dragons', mascot: 'Dragon', monogram: 'ED', primary: '#2D6A4F', secondary: '#081C15', accent: '#95D5B2', archetype: 'defense_first' },
    { city: 'Midland', name: 'Mustangs', mascot: 'Mustang', monogram: 'MM', primary: '#C1121F', secondary: '#003049', accent: '#FDF0D5', archetype: 'speed_demons' },
    { city: 'Silverton', name: 'Bandits', mascot: 'Raccoon', monogram: 'SV', primary: '#6C757D', secondary: '#212529', accent: '#FFC300', archetype: 'moneyball' },
    { city: 'Canyon', name: 'Condors', mascot: 'Condor', monogram: 'CC', primary: '#7209B7', secondary: '#181B2C', accent: '#4CC9F0', archetype: 'ace_factory' },
    { city: 'Magnolia', name: 'Belles', mascot: 'Cardinal', monogram: 'MB', primary: '#FF4D6D', secondary: '#590D22', accent: '#FFF0F3', archetype: 'mashers' },
    { city: 'Keystone', name: 'Bisons', mascot: 'Bison', monogram: 'KB', primary: '#3A5A40', secondary: '#1B263B', accent: '#DAD7CD', archetype: 'defense_first' },
  ],
  aaa: [
    { city: 'Starlight', name: 'Meteors', mascot: 'Astro Cat', monogram: 'SM', primary: '#4361EE', secondary: '#141B41', accent: '#F72585', archetype: 'mashers' },
    { city: 'Metro', name: 'Express', mascot: 'Falcon', monogram: 'MX', primary: '#EF233C', secondary: '#2B2D42', accent: '#EDF2F4', archetype: 'speed_demons' },
    { city: 'Cascade', name: 'Timberwolves', mascot: 'Wolf', monogram: 'CW', primary: '#0A9396', secondary: '#001219', accent: '#94D2BD', archetype: 'ace_factory' },
    { city: 'Capitol', name: 'Senators', mascot: 'Eagle', monogram: 'CS', primary: '#1D3557', secondary: '#0B132B', accent: '#E63946', archetype: 'moneyball' },
    { city: 'Suncoast', name: 'Flamingos', mascot: 'Flamingo', monogram: 'SF', primary: '#FF5D8F', secondary: '#003566', accent: '#FFD60A', archetype: 'speed_demons' },
    { city: 'Foundry', name: 'Anvils', mascot: 'Bull', monogram: 'FA', primary: '#D97706', secondary: '#1F2937', accent: '#FDE68A', archetype: 'mashers' },
    { city: 'Bayou', name: 'Gators', mascot: 'Gator', monogram: 'BG', primary: '#15803D', secondary: '#3B0764', accent: '#FACC15', archetype: 'defense_first' },
    { city: 'Highland', name: 'Stags', mascot: 'Stag', monogram: 'HS', primary: '#7C3AED', secondary: '#1E1B4B', accent: '#38BDF8', archetype: 'ace_factory' },
  ],
  majors: [
    { city: 'Empire', name: 'Monarchs', mascot: 'Lion', monogram: 'EM', primary: '#1E3A8A', secondary: '#0F172A', accent: '#F59E0B', archetype: 'mashers' },
    { city: 'Pacific', name: 'Titans', mascot: 'Kraken', monogram: 'PT', primary: '#0284C7', secondary: '#0C4A6E', accent: '#38BDF8', archetype: 'ace_factory' },
    { city: 'Windy City', name: 'Zephyrs', mascot: 'Bear', monogram: 'WZ', primary: '#DC2626', secondary: '#1E293B', accent: '#60A5FA', archetype: 'defense_first' },
    { city: 'Golden Gate', name: 'Galleons', mascot: 'Sea Lion', monogram: 'GG', primary: '#EA580C', secondary: '#18181B', accent: '#FDE047', archetype: 'moneyball' },
    { city: 'Lone Star', name: 'Outlaws', mascot: 'Longhorn', monogram: 'LS', primary: '#B91C1C', secondary: '#1E3A8A', accent: '#F8FAFC', archetype: 'mashers' },
    { city: 'Emerald City', name: 'Navigators', mascot: 'Orca', monogram: 'EC', primary: '#0D9488', secondary: '#134E4A', accent: '#CBD5E1', archetype: 'ace_factory' },
    { city: 'Peachtree', name: 'Firebirds', mascot: 'Phoenix', monogram: 'PF', primary: '#E11D48', secondary: '#1E1B4B', accent: '#FBBF24', archetype: 'speed_demons' },
    { city: 'North Star', name: 'Glaciers', mascot: 'Polar Bear', monogram: 'NS', primary: '#2563EB', secondary: '#172554', accent: '#93C5FD', archetype: 'defense_first' },
  ],
};
