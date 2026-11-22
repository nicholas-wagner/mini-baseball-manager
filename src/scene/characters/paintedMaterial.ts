import * as THREE from 'three';
import type { AthleteAppearance } from '../../art/portraits/athleteAppearance';
import type { PortraitTeamColors } from '../../art/portraits/types';

const assets = import.meta.glob<string>('../../art/miniPlayers/atlases/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const textures = new Map<string, { texture: THREE.Texture; users: number }>();
const pending = new WeakMap<THREE.Texture, Promise<void>>();
export async function waitForPaint(root: THREE.Object3D) {
  const paints = new Set<Promise<void>>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh) || !(node.material instanceof THREE.ShaderMaterial)) return;
    const loading = pending.get(node.material.uniforms.sheet?.value);
    if (loading) paints.add(loading);
  });
  await Promise.all(paints);
}
export function acquirePaint(key: string) {
  const existing = textures.get(key);
  if (existing) {
    existing.users++;
    return existing.texture;
  }
  let done!: () => void;
  const loading = new Promise<void>(resolve => { done = resolve; });
  const texture = new THREE.TextureLoader().load(assets['../../art/miniPlayers/atlases/' + key + '.png'], done, undefined, done);
  pending.set(texture, loading);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  textures.set(key, { texture, users: 1 });
  return texture;
}
export function releasePaint(key: string) {
  const entry = textures.get(key);
  if (entry && --entry.users === 0) {
    entry.texture.dispose();
    textures.delete(key);
  }
}

// The source sheets use distinct inks for leather, skin, hair, iris and team
// trim. Remap their painted values in sRGB, preserving the dark contour ink.
export function paintedMaterial(isHead: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      sheet: { value: null as THREE.Texture | null },
      cell: { value: new THREE.Vector2() },
      details: { value: null as THREE.Texture | null },
      showDetails: { value: 0 },
      skin: { value: new THREE.Color() },
      skinShade: { value: new THREE.Color() },
      skinLight: { value: new THREE.Color() },
      hair: { value: new THREE.Color() },
      hairLight: { value: new THREE.Color() },
      iris: { value: new THREE.Color() },
      primary: { value: new THREE.Color() },
      secondary: { value: new THREE.Color() },
      head: { value: Number(isHead) },
      maskHelmet: { value: 0 },
      nearLimb: { value: 0 },
      collar: { value: new THREE.Vector2() },
    },
    vertexShader: `varying vec2 at;
      void main(){at=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform sampler2D sheet, details;
      uniform vec2 cell;
      uniform vec3 skin,skinShade,skinLight,hair,hairLight,iris,primary,secondary;
      uniform float head,maskHelmet,nearLimb,showDetails;
      uniform vec2 collar;
      varying vec2 at;
      vec3 fabric(vec3 base,float v){return mix(base*.24,base,clamp(v/.81,0.,1.))+max(v-.81,0.)*.95;}
      void main(){
        if(nearLimb>.5 && (at.y<collar.y-.03 || abs(at.x-collar.x)<.08))discard;
        vec2 tile=(cell+clamp(at,vec2(.002),vec2(.998)))/vec2(4.,3.);
        vec4 s=texture2D(sheet,vec2(tile.x,.5+.5*tile.y));
        vec4 detail = showDetails>.5 ? texture2D(details,at) : vec4(0.);
        float alpha = detail.a + s.a*(1.-detail.a);
        if(alpha<.13)discard;
        vec3 c=s.rgb;
        float hi=max(c.r,max(c.g,c.b)),lo=min(c.r,min(c.g,c.b)),ch=hi-lo;
        float hue=0.;
        if(ch>.006){
          if(hi==c.r)hue=(c.g-c.b)/ch;
          else if(hi==c.g)hue=2.+(c.b-c.r)/ch;
          else hue=4.+(c.r-c.g)/ch;
          hue=fract(hue/6.+1.);
        }
        float sat=ch/max(hi,.01);
        vec4 skinInk=texture2D(sheet,vec2(tile.x,.5*tile.y));
        if(skinInk.a>.02){
          float value=skinInk.r;
          vec3 tone=value<.52 ? mix(skinShade,skin,smoothstep(.13,.52,value))
            : mix(skin,skinLight,smoothstep(.52,.94,value));
          c=mix(c,tone,skinInk.a);
        }else if(ch>.045 && hi>.115){
          if((hue<.034||hue>.94)&&sat>.43)c=fabric(primary,hi*.83+c.g*.13);
          else if(hue>.53&&hue<.77 && sat>.16){
            if(head>.5 && maskHelmet<.5)c=mix(hair*.40,hairLight,clamp((hi-.06)/.82,0.,1.));
            else c=fabric(secondary,clamp(hi*1.25,0.,1.));
          }else if(head>.5&&hue>.39&&hue<.545&&sat>.29)c=fabric(iris,hi);
        }
        gl_FragColor=vec4((detail.rgb*detail.a+c*s.a*(1.-detail.a))/alpha,alpha);
      }`,
  });
}
export function setInks(
  mat: ReturnType<typeof paintedMaterial>,
  a: AthleteAppearance,
  team: PortraitTeamColors,
) {
  const colors = {
    skin: a.skinTone,
    skinShade: a.skinShadow,
    skinLight: a.skinHighlight,
    hair: a.hairColor,
    hairLight: a.hairHighlight,
    iris: a.irisColor,
    primary: team.primary,
    secondary: team.secondary,
  };
  for (const [key, value] of Object.entries(colors)) mat.uniforms[key].value.set(value).convertLinearToSRGB();
}
