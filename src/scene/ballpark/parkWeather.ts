import * as THREE from 'three';
import type { GameDayWeather, WeatherCondition } from '../../engine/simulation/weather';
import { evaluateWeatherSimulationImpact } from '../../engine/simulation/weather';

const sunny: GameDayWeather = { condition: 'sunny', isNightGame: false, windDirection: 'calm', windMph: 0, rainDelayRisk: 0 };

// Painted scenery, field shading and atmospheric haze share a time of day.
const palettes = {
  sunny: { horizon: 0xffffff, fog: 0xa7dff4, sun: 0xfff7dd, ambient: 0xfffbe6, ground: 0x83ad75, intensity: 1.35 },
  breezy: { horizon: 0xdff2fd, fog: 0xb0cde0, sun: 0xf6f7ec, ambient: 0xe8f6ff, ground: 0x85a17b, intensity: 1.2 },
  golden_sunset: { horizon: 0xffbb88, fog: 0xf6aa81, sun: 0xffb76c, ambient: 0xffdfba, ground: 0x9b796d, intensity: 1.36 },
  floodlight_night: { horizon: 0x34456b, fog: 0x24324e, sun: 0xdcedff, ambient: 0xa4bce2, ground: 0x596a80, intensity: 1.05 },
  drizzle: { horizon: 0xb5c3ce, fog: 0x95a6b2, sun: 0xd3e2eb, ambient: 0xc3d2dc, ground: 0x719080, intensity: .75 },
  dome_controlled: { horizon: 0xb3accb, fog: 0xb1adc2, sun: 0xffecce, ambient: 0xe9e4ff, ground: 0x84928b, intensity: 1.1 },
} satisfies Record<WeatherCondition, object>;

export function parkLight(weather: GameDayWeather | null) {
  const day = weather ?? sunny;
  const night = day.isNightGame || day.condition === 'floodlight_night';
  const condition = night ? 'floodlight_night' : day.condition;
  return { ...palettes[condition], night, sky: evaluateWeatherSimulationImpact({ ...day, condition }).skyColorHex };
}

export function createDrizzle() {
  // Falling pairs of vertices wrap together. One draw call, no per-drop allocations.
  const positions = [];
  for (let i = 0; i < 220; i++) {
    const x = (i * 37.31 % 44) - 22, y = i * 3.61 % 13, z = 8 - i * 17.71 % 46;
    positions.push(x, y, z, x + .025, y + .19, z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float time; attribute float tip;
      void main() {
        vec3 p=position;
        p.y=mod(p.y-.19*tip-time*5.,13.)+.19*tip;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: 'void main(){gl_FragColor=vec4(.78,.86,.93,.36);}',
  });
  // Both ends use the same wrap phase so a streak never spans the sky.
  const tips = Float32Array.from({ length: positions.length / 3 }, (_, i) => i % 2);
  geometry.setAttribute('tip', new THREE.BufferAttribute(tips, 1));
  const rain = new THREE.LineSegments(geometry, material);
  rain.name = 'drizzle';
  rain.visible = false;
  return rain;
}
