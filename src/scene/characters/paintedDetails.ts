import * as THREE from 'three';
import marks from '../../art/miniPlayers/faceMarks.json';
import type { AthleteAppearance } from '../../art/portraits/athleteAppearance';

// Eye landmarks are measured on each registered head. Spectacles follow the
// far eye's perspective and sit below the brim through changes of expression.
const helmetEars = [[151,174],[152,174],[152,173],[154,174],[157,173],[155,174],[157,174],[155,174]];

interface FaceMarks {
  eyes: number[];
  mouth: number[];
  jaw: number[];
  ear: number[] | null;
  tie?: number[];
}

export function createFaceDetails() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d'),
    texture = new THREE.CanvasTexture(canvas);
  // Sample painted cosmetics in the same color space as the source atlas.
  texture.colorSpace = THREE.NoColorSpace;
  let last = '';
  function paint(a: AthleteAppearance, sheet: string, cell: number, mood: number, accent: string) {
    const key = [sheet, cell, mood, a.glasses, a.accessory, a.mouthStyle, a.facialHair, a.hairColor, a.hairHighlight, a.skinShadow, a.hairAccessory, accent].join(
      '|',
    );
    if (!c || last === key) return;
    last = key;
    c.clearRect(0, 0, 256, 256);
    const shade = a.accessory === 'shades90s' || a.accessory === 'pinkShades';
    const ink = '#242036';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const fill = (d: string, col: string) => {
      c.fillStyle = col;
      c.fill(new Path2D(d));
    };
    const line = (d: string, col: string, width: number) => {
      c.strokeStyle = col;
      c.lineWidth = width;
      c.stroke(new Path2D(d));
    };
    const groom = a.facialHair === 'none' && a.accessory === 'handlebarStache' ? 'handlebar' : a.facialHair;
    const hair = a.hairColor, gleam = a.hairHighlight;
    function earring(x: number, y: number) {
      c!.save();
      c!.translate(x, y);
      line('M0 -2q-4 3 0 6', ink, 2);
      line('M0 -2q-3 3 0 6', '#FFF1A9', 1.2);
      const star = 'M0 2L2.4 6L7 6.5L3.5 9.5L4.5 14L0 11.7L-4.4 14L-3.4 9.5L-7 6.5L-2.3 6Z';
      fill(star,'#FFCF55');
      line(star,ink,1.25);
      c!.restore();
    }
    // The catcher's view shows one ear, the temple of the frames and the
    // underside of the beard. The mouth is behind the cheek in this drawing.
    if (sheet === 'helmet-quarter') {
      const ear = helmetEars[cell];
      c.save();
      c.translate(ear[0], ear[1]);
      if (groom === 'longBeard' || groom === 'shortBeard' || groom === 'stubble' || groom === 'goatee') {
        const drop = groom === 'longBeard' ? 8 : 2;
        c.globalAlpha = groom === 'stubble' ? .36 : 1;
        if (groom === 'goatee') fill('M13 26q8 2 14 -8q-1 11 -9 17Z', hair);
        else fill(`M-10 4Q-4 19 12 23Q21 25 27 15Q25 25 14 ${29+drop}Q1 30 -10 26Z`, hair);
        c.globalAlpha = 1;
      }
      if (a.glasses !== 'none' || shade) {
        const frame = a.accessory === 'pinkShades' ? '#d32871' : ink;
        line('M-3 -18Q4 -22 10 -22L26 -24', frame, 2.7);
        if (shade) fill('M24 -25l9 1l-1 8q-3 5 -6 4Z', frame);
        else line('M25 -23q1 13 6 9', frame, 2.2);
      }
      if (a.accessory === 'starEarrings') earring(0, 0);
      c.restore();
      texture.needsUpdate = true;
      return;
    }
    const face = (marks as Record<string, FaceMarks[]>)[sheet][cell];
    const [lx, ly, rx, ry] = face.eyes;
    const mid = (lx + rx) / 2, eye = (ly + ry) / 2;
    const [left, leftY, right, rightY, lowerLip] = face.mouth;
    const mouthX = (left + right) / 2, lip = (leftY + rightY) / 2;
    const lipAngle = Math.atan2(rightY - leftY, right - left);
    const [jawL, jawY, lowL, lowLY, chin, bottom, lowR, lowRY, jawR, farY] = face.jaw;
    if (groom === 'shortBeard' || groom === 'longBeard' || groom === 'stubble') {
      // Two cheek lines meet underneath the expression's lower lip. Preserve
      // the mouth opening and the asymmetry of the three-quarter jaw.
      const length = groom === 'longBeard' ? 10 : groom === 'stubble' ? -1 : 3;
      const tip = bottom + length;
      const top = Math.min(bottom - 2, lowerLip + 3);
      const shape = `M${jawL} ${jawY-5} Q${jawL+5} ${jawY+4} ${left} ${top-3}
        Q${mouthX} ${top+3} ${right-2} ${top-3} Q${jawR-2} ${farY+4} ${jawR} ${farY-4}
        Q${lowR+2} ${lowRY+1} ${chin+6} ${tip} Q${chin} ${tip+2} ${chin-5} ${tip}
        Q${lowL-1} ${lowLY+1} ${jawL} ${jawY-5} Z`;
      c.save();
      c.globalAlpha = groom === 'stubble' ? 0.33 : 1;
      fill(shape, hair);
      c.clip(new Path2D(shape));
      c.globalAlpha = groom === 'stubble' ? 0.58 : 0.72;
      for (let x = jawL + 4; x < jawR; x += groom === 'stubble' ? 5 : 8) {
        const y = tip - 3 - Math.abs(x - chin) * .39;
        line(`M${x} ${y}q-2 -2 -3 -5`, gleam, 1.6);
      }
      c.restore();
    }
    if (groom === 'goatee') {
      fill(`M${chin-12} ${bottom-9}q5 4 10 -1q5 2 12 -4q0 13 -11 18q-10 -4 -11 -13Z`, hair);
      line(`M${chin-6} ${bottom-4}l4 8`, gleam, 1.8);
    }
    if (['handlebar','chevron','shortBeard','longBeard'].includes(groom)) {
      c.save();
      c.translate(mouthX, lip - 2);
      c.rotate(lipAngle);
      c.scale(Math.hypot(right-left, rightY-leftY) / 44, .78);
      fill('M-21 1Q-14 2 -8 -3Q-4 -6 0 -3Q4 -6 9 -3Q14 0 20 0Q14 3 6 2L0 0Q-6 4 -21 1Z', hair);
      line('M-12 2q7 -4 10 -4', gleam, 1.6);
      if (groom === 'handlebar') line('M-12 3Q-26 10 -26 -2M13 2Q25 5 24 -5', hair, 3.6);
      c.restore();
    }
    if (a.accessory === 'freckles') {
      c.fillStyle = a.skinShadow;
      for (const [x,y] of [[lx-9,ly+17],[lx-1,ly+20],[lx+6,ly+16],[rx-2,ry+15],[rx+4,ry+18]]) {
        c.beginPath(); c.arc(x,y,1.55,0,Math.PI*2); c.fill();
      }
    }
    if (a.accessory === 'starEarrings' && face.ear) earring(face.ear[0], face.ear[1]);
    if (a.hairAccessory === 'headband' && sheet.endsWith('bare')) {
      const path = `M${lx-30} ${ly-8} Q${lx-12} ${eye-64} ${mid+8} ${eye-69} Q${rx+10} ${eye-74} ${rx+15} ${ry-49}`;
      line(path,ink,7); line(path,accent,4.6);
    }
    if ((a.hairStyle === 'ponytail' || a.hairStyle === 'pigtails' || a.hairStyle === 'braid') &&
      a.hairAccessory !== 'none' && a.hairAccessory !== 'headband' && face.tie) {
      c.save(); c.translate(face.tie[0], face.tie[1]); c.rotate(-.38);
      if (a.hairAccessory === 'ribbon') {
        const bow = 'M0 0Q-16 -14 -18 -6Q-18 5 -2 4L-10 19L-4 17L2 5L9 14L11 11L5 2Q18 4 15 -7Q12 -11 0 0Z';
        fill(bow,accent); line(bow,ink,1.4);
      } else {
        line('M-6 -4Q1 -10 8 -2', ink, a.hairAccessory === 'scrunchie' ? 8 : 5);
        line('M-6 -4Q1 -10 8 -2', accent, a.hairAccessory === 'scrunchie' ? 6 : 3);
      }
      c.restore();
    }
    if (a.glasses !== 'none' || shade) {
      c.save();
      c.translate(lx, ly);
      c.rotate(Math.atan2(ry - ly, rx - lx));
      const dx = Math.hypot(rx - lx, ry - ly);
      const round = a.glasses === 'round' && !shade;
      const r1 = dx * 0.43,
        r2 = dx * 0.31;
      const frame = a.accessory === 'pinkShades' ? '#d32871' : ink;
      for (const [x, r] of [
        [0, r1],
        [dx, r2],
      ]) {
        c.beginPath();
        if (round) c.ellipse(x, 0, r, r * 0.82, 0, 0, Math.PI * 2);
        else c.roundRect(x - r, -r * 0.68, 2 * r, 1.42 * r, 4);
        c.fillStyle = shade ? '#273046e8' : '#e8f8ff19';
        c.fill();
        c.strokeStyle = frame;
        c.lineWidth = 3;
        c.stroke();
        line(`M${x - r * 0.57} ${-r * 0.2}l${r * 0.37} ${-r * 0.26}`, '#fff2cb', 1.7);
      }
      line(`M${r1} -1 Q${dx * 0.54} -6 ${dx - r2} -2`, frame, 3);
      c.restore();
      if (face.ear) {
        line(`M${lx-r1+1} ${ly-1} Q${lx-r1-5} ${ly-4} ${face.ear[0]} ${face.ear[1]-12}`, frame, 2.6);
      }
    }
    if (a.accessory === 'eyeBlack') {
      for (const [x, y] of [
        [lx, ly],
        [rx, ry],
      ])
        line(`M${x - 8} ${y + 16}q7 2 13 -1`, '#463b3e', 3);
    }
    if (a.accessory === 'cheekBandage') {
      c.save();
      c.translate(lx - 12, ly + 16);
      c.rotate(Math.atan2(ry - ly, rx - lx) - .16);
      c.fillStyle = '#f2ba88';
      c.fillRect(-8, -2.5, 16, 5);
      c.restore();
    }
    if (a.mouthStyle === 'bubblegum' && mood === 0) {
      const x = left + 4,
        y = leftY + 6,
        r = 11;
      const g = c.createRadialGradient(x - 4, y - 5, 1, x, y, r);
      g.addColorStop(0, '#ffe2ec');
      g.addColorStop(0.55, '#fc93ad');
      g.addColorStop(1, '#ce527b');
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = '#833f61';
      c.lineWidth = 1.5;
      c.stroke();
    }
    texture.needsUpdate = true;
  }
  return { texture, paint };
}
