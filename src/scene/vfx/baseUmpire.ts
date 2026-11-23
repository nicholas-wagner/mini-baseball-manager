import * as THREE from 'three';

// Three key drawings keep the silhouette of the call readable behind the tag.
function umpireCel(call: 'set' | 'wind' | 'out' | 'safe') {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 224;
  const c = canvas.getContext('2d');
  if (c) {
    c.lineWidth = 4;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const shape = (d: string, paint: string) => {
      const path = new Path2D(d);
      c.fillStyle = paint;
      c.fill(path);
      c.strokeStyle = '#252435';
      c.stroke(path);
    };
    const skin = '#c78a68',
      shirt = '#84bad6';
    shape('M64 153L94 156 89 198 76 207 55 203 64 175Z', '#545c72');
    shape('M96 155L122 150 131 198 122 207 102 200 99 180Z', '#646e81');
    shape('M56 196Q67 200 79 197L82 208Q71 215 45 210Q40 203 56 196Z', '#303343');
    shape('M106 197L124 195 140 204Q145 213 108 211Z', '#303343');
    shape('M68 102Q89 93 111 101L128 116 122 157Q94 167 61 156L59 117Z', shirt);
    shape('M68 152Q98 161 123 151L123 158Q99 167 65 159Z', '#313346');
    shape('M85 102L94 111 102 101 110 104 99 118 91 114 84 117 77 105Z', '#486384');
    shape('M103 123L117 121 116 131 105 133Z', '#638ba7');
    // Fixed off arm, with both arms extended for the safe signal.
    shape(
      call === 'safe'
        ? 'M114 110L134 112 170 104 179 107 176 115 136 127 116 125Z'
        : 'M117 113L134 119 143 143 134 153 124 146 126 136 113 127Z',
      skin,
    );
    const arm =
      call === 'out'
        ? 'M71 115L53 119 32 93 26 92 18 79 23 71 32 69 43 76 43 85 62 99Z'
        : call === 'wind'
          ? 'M71 116L56 131 42 124 46 106 53 99 63 102 63 111 58 117Z'
          : call === 'safe'
            ? 'M71 112L51 113 16 102 8 103 7 110 17 117 50 129 68 126Z'
            : 'M67 115L52 121 45 143 53 152 64 149 62 140 74 125Z';
    shape(arm, skin);
    shape('M72 106Q58 105 53 119L63 129 78 121Z', shirt);
    shape('M112 105Q128 103 135 116L123 128 113 122Z', shirt);
    shape(
      'M62 53Q61 34 88 31L121 43 126 68 121 88 110 101 89 105 70 98 61 85Q49 87 47 76Q46 67 55 67Z',
      skin,
    );
    shape('M52 64Q47 38 67 26Q91 10 113 24Q130 32 128 48L118 54Q91 47 53 67Z', '#34394f');
    shape('M57 57Q87 36 123 45L147 48Q149 58 123 60L103 54 68 66Z', '#484c63');
    shape('M79 67L93 64 94 69 80 73ZM105 64L118 64 117 69 106 70Z', '#382d35');
    c.strokeStyle = '#44343a';
    c.beginPath();
    c.moveTo(92, 88);
    c.quadraticCurveTo(101, 90, 109, 85);
    c.stroke();
    c.fillStyle = '#fff5d4';
    c.font = 'bold 17px sans-serif';
    c.fillText('U', 88, 42);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createBaseUmpire() {
  const frames = {
    set: umpireCel('set'),
    wind: umpireCel('wind'),
    out: umpireCel('out'),
    safe: umpireCel('safe'),
  };
  const material = new THREE.SpriteMaterial({ map: frames.set, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.055);
  sprite.scale.set(1.68, 1.96, 1);
  sprite.visible = false;
  return {
    sprite,
    signal(safe: boolean, since: number) {
      const cel = since < -0.11 ? 'set' : since < 0.12 ? 'wind' : safe ? 'safe' : 'out';
      material.map = frames[cel];
      const punch = Math.sin(Math.PI * Math.min(1, Math.max(0, (since - 0.1) / 0.3)));
      sprite.scale.set(1.68, 1.96 + 0.09 * punch, 1);
    },
    dispose() {
      Object.values(frames).forEach((t) => t.dispose());
      material.dispose();
    },
  };
}
