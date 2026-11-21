import * as THREE from 'three';
import type { PortraitMood, PortraitTraits } from '../../art/portraits/types';

export interface ChibiFaceCanvas {
  texture: THREE.CanvasTexture;
  redraw: (traits: PortraitTraits, mood: PortraitMood, blink: boolean) => void;
  dispose: () => void;
}

/**
 * Paints a crisp 2D 90s cartoon face onto an offscreen canvas mapped around
 * the chibi 3D head sphere (front center sits at u = 0.5, v = 0.5).
 */
export function createChibiFaceTexture(
  initialTraits: PortraitTraits,
  initialMood: PortraitMood = 'happy',
): ChibiFaceCanvas {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  let lastKey = '';

  const redraw = (traits: PortraitTraits, mood: PortraitMood, blink: boolean) => {
    if (!ctx) return;
    const key = `${traits.seed}:${traits.skinTone}:${traits.eyeStyle}:${traits.mouthStyle}:${traits.accessory}:${mood}:${blink ? 1 : 0}`;
    if (key === lastKey) return;
    lastKey = key;

    // Base skin fill across the entire head sphere UV
    ctx.fillStyle = traits.skinTone;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle lower chin warm shading band
    ctx.fillStyle = traits.skinShadow;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 178, canvas.width, 78);
    ctx.globalAlpha = 1;

    // Face center maps to x = 256 (front of sphere when rotated y = -PI/2)
    const cx = 256;
    const cy = 132;
    const ink = '#181B2C';

    // Cute rosy cheeks
    ctx.fillStyle = 'rgba(255, 118, 155, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - 46, cy + 20, 14, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 46, cy + 20, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawEye = (ex: number, ey: number, isRight: boolean) => {
      if (blink) {
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ex - 12, ey + 2);
        ctx.quadraticCurveTo(ex, ey - 7, ex + 12, ey + 2);
        ctx.stroke();
        return;
      }

      if (mood === 'shocked') {
        ctx.fillStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ex, ey, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      if (traits.eyeStyle === 'wink' && isRight && mood === 'happy') {
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ex - 12, ey + 2);
        ctx.quadraticCurveTo(ex, ey - 8, ex + 12, ey + 2);
        ctx.stroke();
        return;
      }

      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle highlight
      ctx.fillStyle = mood === 'fired_up' ? '#FFC300' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex + 3.5, ey - 5, mood === 'fired_up' ? 5 : 4.2, 0, Math.PI * 2);
      ctx.fill();
    };

    drawEye(cx - 28, cy - 4, false);
    drawEye(cx + 28, cy - 4, true);

    // Eyebrows
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6.5;
    if (mood === 'rival_glare' || mood === 'fired_up' || mood === 'determined') {
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy - 28);
      ctx.lineTo(cx - 12, cy - 19);
      ctx.moveTo(cx + 44, cy - 28);
      ctx.lineTo(cx + 12, cy - 19);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - 40, cy - 26);
      ctx.quadraticCurveTo(cx - 28, cy - 33, cx - 14, cy - 26);
      ctx.moveTo(cx + 14, cy - 26);
      ctx.quadraticCurveTo(cx + 28, cy - 33, cx + 40, cy - 26);
      ctx.stroke();
    }

    // Accessories on face
    if (traits.accessory === 'shades90s') {
      ctx.fillStyle = '#181B2C';
      ctx.fillRect(cx - 52, cy - 18, 42, 24);
      ctx.fillRect(cx + 10, cy - 18, 42, 24);
      ctx.fillStyle = '#FFC300';
      ctx.fillRect(cx - 10, cy - 11, 20, 7);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy - 12);
      ctx.lineTo(cx - 28, cy + 1);
      ctx.moveTo(cx + 18, cy - 12);
      ctx.lineTo(cx + 34, cy + 1);
      ctx.stroke();
    } else if (traits.accessory === 'eyeBlack') {
      ctx.fillStyle = ink;
      ctx.fillRect(cx - 42, cy + 14, 24, 7);
      ctx.fillRect(cx + 18, cy + 14, 24, 7);
    } else if (traits.accessory === 'freckles') {
      ctx.fillStyle = '#9E5B37';
      [
        [-42, 16],
        [-34, 20],
        [-48, 22],
        [42, 16],
        [34, 20],
        [48, 22],
      ].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (traits.accessory === 'cheekBandage') {
      ctx.save();
      ctx.translate(cx + 38, cy + 20);
      ctx.rotate(-0.2);
      ctx.fillStyle = '#FBF4E4';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.fillRect(-14, -7, 28, 14);
      ctx.strokeRect(-14, -7, 28, 14);
      ctx.restore();
    }

    // Mouth
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5.5;
    if (mood === 'shocked') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 32, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'rival_glare') {
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy + 34);
      ctx.lineTo(cx + 22, cy + 28);
      ctx.stroke();
    } else if (traits.mouthStyle === 'bubblegum' && mood === 'happy') {
      ctx.fillStyle = '#FF7AA2';
      ctx.beginPath();
      ctx.arc(cx + 16, cy + 32, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(cx + 10, cy + 26, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Classic bright 90s grin
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy + 24);
      ctx.quadraticCurveTo(cx, cy + 48, cx + 24, cy + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    texture.needsUpdate = true;
  };

  redraw(initialTraits, initialMood, false);

  return {
    texture,
    redraw,
    dispose: () => texture.dispose(),
  };
}
