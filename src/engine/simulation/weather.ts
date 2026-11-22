import type { SeededRng } from '../rng/seededRng';

export type WeatherCondition =
  | 'dome_controlled'
  | 'sunny'
  | 'golden_sunset'
  | 'floodlight_night'
  | 'breezy'
  | 'drizzle';

export type WindDirection = 'calm' | 'blowing_out' | 'blowing_in' | 'crosswind';

export interface GameDayWeather {
  condition: WeatherCondition;
  windDirection: WindDirection;
  windMph: number;
  isNightGame: boolean;
  rainDelayRisk: number; // 0..0.35
}

export interface WeatherSimulationImpact {
  hrCarryMultiplier: number; // 0.85..1.18
  pitcherControlPenalty: number; // 0 or negative in wet drizzle
  fielderErrorMultiplier: number; // 1.0..1.15 in wet grass
  skyColorHex: string;
  hudLabel: string;
}

function pickOutdoorCondition(roll: number, isNightGame: boolean): WeatherCondition {
  if (roll > 0.92) return 'drizzle';
  if (roll > 0.82) return 'breezy';
  if (isNightGame) return 'floodlight_night';
  if (roll > 0.65) return 'golden_sunset';
  return 'sunny';
}

/** Rolls deterministic ballpark weather, wind flags, and optional Floodlight Night Game lighting. */
export function rollGameDayWeather(
  rng: SeededRng,
  venue: { isDome: boolean; hasNightLights: boolean },
): GameDayWeather {
  if (venue.isDome) {
    return {
      condition: 'dome_controlled',
      windDirection: 'calm',
      windMph: 0,
      isNightGame: false,
      rainDelayRisk: 0,
    };
  }

  const isNightGame = venue.hasNightLights && rng.chance(0.35);
  const condition = pickOutdoorCondition(rng.next(), isNightGame);
  const windDirection = rng.pick<WindDirection>(['calm', 'blowing_out', 'blowing_in', 'crosswind']);
  const windMph = windDirection === 'calm' ? rng.int(0, 3) : rng.int(7, 18);
  return {
    condition,
    windDirection,
    windMph,
    isNightGame,
    rainDelayRisk: condition === 'drizzle' ? 0.22 : 0,
  };
}

const SKY_COLORS: Readonly<Record<WeatherCondition, string>> = {
  dome_controlled: '#312E81',
  sunny: '#8ECAE6',
  golden_sunset: '#FB923C',
  floodlight_night: '#0F172A',
  breezy: '#93C5FD',
  drizzle: '#64748B',
};

/** Evaluates fly-ball HR carry, wet-ball pitcher grip, and 3D sky lighting from game-day weather. */
export function evaluateWeatherSimulationImpact(weather: GameDayWeather): WeatherSimulationImpact {
  let hrCarry = 1.0;
  if (weather.windDirection === 'blowing_out') {
    hrCarry += Math.min(0.18, weather.windMph * 0.01);
  } else if (weather.windDirection === 'blowing_in') {
    hrCarry -= Math.min(0.16, weather.windMph * 0.009);
  }

  const wet = weather.condition === 'drizzle';
  return {
    hrCarryMultiplier: Number(hrCarry.toFixed(3)),
    pitcherControlPenalty: wet ? -3 : 0,
    fielderErrorMultiplier: wet ? 1.12 : 1.0,
    skyColorHex: SKY_COLORS[weather.condition],
    hudLabel:
      weather.condition === 'dome_controlled'
        ? 'Indoor Dome (72°F, Calm)'
        : `${weather.condition.replace('_', ' ')} • Wind ${weather.windMph} mph ${weather.windDirection.replace('_', ' ')}`,
  };
}
